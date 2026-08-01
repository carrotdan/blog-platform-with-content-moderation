"""Tests for the AI moderation microservice (FastAPI).

These tests mock the model/tokenizer globals so no trained model is required.
Run with:  cd ai_service && python -m pytest test_main.py -v
"""

import math

import pytest
import torch
from fastapi.testclient import TestClient

import main


class FakeTokenizer:
    def __call__(self, text, return_tensors=None, truncation=None,
                 max_length=None, padding=None):
        return {
            "input_ids": torch.tensor([[1, 2, 3]]),
            "attention_mask": torch.tensor([[1, 1, 1]]),
        }


class FakeOutput:
    def __init__(self, logits):
        self.logits = logits


class FakeModel:
    def __init__(self, logits):
        self.logits = torch.tensor([logits])

    def __call__(self, **kwargs):
        return FakeOutput(self.logits)

    def to(self, device):
        return self

    def eval(self):
        return self


def logit(p):
    """Inverse sigmoid: convert a probability to a raw logit value."""
    return math.log(p / (1 - p))


@pytest.fixture(autouse=True)
def _clean_globals():
    main.model = None
    main.tokenizer = None
    main.device = torch.device("cpu")


@pytest.fixture
def client():
    # No context manager: TestClient only runs the startup handler (load_model)
    # when entered via `with`, so the missing real model dir never blocks tests.
    return TestClient(main.app)


@pytest.fixture
def loaded(client):
    main.tokenizer = FakeTokenizer()
    main.model = FakeModel([0.0, 0.0])
    main.device = torch.device("cpu")
    return client


def test_health_reports_model_not_loaded(client):
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["model_loaded"] is False
    assert body["labels"] == {"LABEL_0": "TOXIC", "LABEL_1": "SPAM"}
    assert body["thresholds"] == {"spam": 0.5, "toxic": 0.5}


def test_health_after_model_load(loaded):
    res = loaded.get("/health")
    assert res.status_code == 200
    assert res.json()["model_loaded"] is True


def test_analyze_returns_503_when_model_not_loaded(client):
    res = client.post("/analyze", json={"text": "hello"})
    assert res.status_code == 503
    assert "not loaded" in res.json()["detail"].lower()


def test_analyze_empty_text_returns_normal(loaded):
    res = loaded.post("/analyze", json={"text": "   "})
    assert res.status_code == 200
    body = res.json()
    assert body["label"] == "NORMAL"
    assert body["spam_score"] == 0.0
    assert body["toxicity_score"] == 0.0


@pytest.mark.parametrize("logits,expected", [
    ([logit(0.9), logit(0.1)], "TOXIC"),
    ([logit(0.05), logit(0.9)], "SPAM"),
    ([logit(0.05), logit(0.05)], "NORMAL"),
    ([logit(0.6), logit(0.6)], "TOXIC"),
])
def test_analyze_label_decision(loaded, logits, expected):
    main.model = FakeModel(logits)
    res = loaded.post("/analyze", json={"text": "some content here"})
    assert res.status_code == 200
    body = res.json()
    assert body["label"] == expected

    sig = [1 / (1 + math.exp(-x)) for x in logits]
    assert body["toxicity_score"] == round(sig[0], 4)
    assert body["spam_score"] == round(sig[1], 4)
    assert body["raw_scores"]["TOXIC"] == round(sig[0], 4)
    assert body["raw_scores"]["SPAM"] == round(sig[1], 4)


def test_toxic_priority_over_spam(loaded):
    main.model = FakeModel([logit(0.8), logit(0.7)])
    res = loaded.post("/analyze", json={"text": "x"})
    assert res.status_code == 200
    assert res.json()["label"] == "TOXIC"


def test_analyze_truncates_long_text(loaded):
    main.model = FakeModel([logit(0.05), logit(0.05)])
    res = loaded.post("/analyze", json={"text": "a" * 5000})
    assert res.status_code == 200
    assert res.json()["label"] == "NORMAL"


def test_text_over_max_length_rejected(client):
    res = client.post("/analyze", json={"text": "a" * (main.MAX_TEXT_LENGTH + 1)})
    assert res.status_code == 422


def test_analyze_rejects_missing_text(client):
    res = client.post("/analyze", json={})
    assert res.status_code == 422


def test_analyze_rejects_non_string_text(client):
    res = client.post("/analyze", json={"text": 12345})
    assert res.status_code == 422
