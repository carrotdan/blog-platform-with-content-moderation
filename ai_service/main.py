"""
AI Microservice - XLM-Roberta Content Classification
Model đã fine-tuned với 2 labels:
  - LABEL_0 (L0): TOXIC  - phát hiện nội dung độc hại, thù hận
  - LABEL_1 (L1): SPAM   - phát hiện spam, quảng cáo rác
"""

import os
import sys
import torch
import logging
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import uvicorn

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
MODEL_DIR = Path(__file__).parent.parent / "final_model"
PORT = int(os.environ.get("AI_PORT", 8000))

# Threshold để quyết định label (dựa trên kết quả test)
SPAM_THRESHOLD = 0.5    # LABEL_1 (L1)
TOXIC_THRESHOLD = 0.5   # LABEL_0 (L0)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Content Moderation AI Service",
    description="XLM-Roberta based spam & toxicity classifier. LABEL_0=TOXIC, LABEL_1=SPAM",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:3000"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# ── Global model state ────────────────────────────────────────────────────────
tokenizer = None
model = None
device = None

# ── Schemas ───────────────────────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    text: str

class AnalyzeResponse(BaseModel):
    spam_score: float
    toxicity_score: float
    label: str
    raw_scores: dict

# ── Startup ───────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def load_model():
    global tokenizer, model, device

    logger.info(f"Loading model from: {MODEL_DIR}")

    if not MODEL_DIR.exists():
        logger.error(f"Model directory not found: {MODEL_DIR}")
        raise RuntimeError(f"Model directory not found: {MODEL_DIR}")

    # Chọn device
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Using device: {device}")

    # Load tokenizer & model
    tokenizer = AutoTokenizer.from_pretrained(str(MODEL_DIR), local_files_only=True)
    model = AutoModelForSequenceClassification.from_pretrained(
        str(MODEL_DIR),
        local_files_only=True
    )
    model.to(device)
    model.eval()

    logger.info("Model loaded successfully!")
    logger.info(f"num_labels: {model.config.num_labels}")
    logger.info("Label mapping: LABEL_0=TOXIC, LABEL_1=SPAM")

# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "device": str(device) if device else "unknown",
        "labels": {
            "LABEL_0": "TOXIC",
            "LABEL_1": "SPAM"
        },
        "thresholds": {
            "spam": SPAM_THRESHOLD,
            "toxic": TOXIC_THRESHOLD
        }
    }

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest):
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")

    text = req.text.strip()
    if not text:
        return AnalyzeResponse(
            spam_score=0.0,
            toxicity_score=0.0,
            label="NORMAL",
            raw_scores={"TOXIC": 0.0, "SPAM": 0.0}
        )

    # Tokenize (tối đa 512 tokens)
    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=512,
        padding=True
    )
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits  # shape: [1, 2]

    # Multi-label: dùng sigmoid (không phải softmax)
    probs = torch.sigmoid(logits).squeeze().cpu().tolist()

    # Đảm bảo probs là list 2 phần tử
    if isinstance(probs, float):
        probs = [probs, 0.0]

    # LABEL_0 = TOXIC, LABEL_1 = SPAM (từ kết quả test)
    toxicity_score = float(probs[0])
    spam_score = float(probs[1])

    raw_scores = {
        "TOXIC": round(toxicity_score, 4),
        "SPAM": round(spam_score, 4)
    }

    # Quyết định label tổng (ưu tiên TOXIC > SPAM > NORMAL)
    if toxicity_score >= TOXIC_THRESHOLD and toxicity_score >= spam_score:
        final_label = "TOXIC"
    elif spam_score >= SPAM_THRESHOLD:
        final_label = "SPAM"
    else:
        final_label = "NORMAL"

    logger.info(
        f"Analyzed (len={len(text)}): label={final_label}, "
        f"toxic={toxicity_score:.4f}, spam={spam_score:.4f}"
    )

    return AnalyzeResponse(
        spam_score=round(spam_score, 4),
        toxicity_score=round(toxicity_score, 4),
        label=final_label,
        raw_scores=raw_scores
    )

# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=PORT,
        log_level="info",
        reload=False
    )
