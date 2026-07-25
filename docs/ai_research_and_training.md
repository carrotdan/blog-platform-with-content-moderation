# AI Research and Training

The `notebook/` directory contains the complete machine-learning research pipeline used to produce the production model and to explore future capabilities. This document covers what was trained, how it was trained, and what is planned but not yet integrated.

---

## Overview of AI Capabilities

| Capability | Status | Model | Location |
|---|---|---|---|
| Text moderation (spam + toxic) | **In production** | XLM-RoBERTa fine-tuned | `final_model/` |
| Summarization + tag suggestion | Research / not integrated | mT5-base fine-tuned | `final_model_mt5/` (after download) |
| Image moderation (NSFW + violence) | Research / not integrated | EfficientNet-B0 (recommended) | `final_model_image/` (after download) |

---

## Deployed Model: XLM-RoBERTa Text Classifier

### Architecture

- **Base:** `xlm-roberta-base` (125M parameters, cross-lingual)
- **Task:** Multi-label binary classification (SPAM + TOXIC simultaneously)
- **Output head:** 2-class linear layer with sigmoid activation (independent per label)
- **Model files in `final_model/`:** `model.safetensors`, `tokenizer.json`, `config.json`, `tokenizer_config.json`

### Training Dataset (~192,000 examples after augmentation)

| Source | Language | Type | Size |
|---|---|---|---|
| Jigsaw Toxic Comments | English | Toxic | ~92k |
| ViHSD | Vietnamese | Toxic | ~28k |
| ViSpamReviews (upsampled) | Vietnamese | Spam | ~39k |
| SyntheticSpam | Vietnamese | Spam | ~8k |
| SyntheticHam | Vietnamese | Clean | ~6.5k |
| EnglishSpam | English | Spam | ~6.4k |
| ViCTSD | Vietnamese | Toxic | ~6.4k |
| SyntheticToxicSpam | Vietnamese | Spam + Toxic | ~5k |

### Why XLM-RoBERTa was Chosen

Four models were trained with identical pipelines (`xlm-roberta-.ipynb`, `phobert.ipynb`, `infoxlm.ipynb`, `bert.ipynb`) and compared:

| Model | Specialisation | Reason not selected |
|---|---|---|
| `xlm-roberta-base` | Cross-lingual (104 languages) | **Selected** |
| `vinai/phobert-base-v2` | Vietnamese only | Less robust on English spam/toxic data |
| `microsoft/infoxlm-base` | Cross-lingual, XLM-R family | Similar to XLM-R but less community support |
| `bert-base-multilingual-cased` | Multilingual | Older architecture, lower performance |

---

## Dataset Preparation Pipeline

### `spam.ipynb` — Unified Dataset Creation

Prepares and balances the full moderation dataset for XLM-RoBERTa training:
1. Load + normalize 7 sources (ViCTSD, ViHSD, ViSpamReviews, Jigsaw, ViCTSD, ViHSD, Synthetic)
2. Text cleaning and deduplication
3. Upsample minority classes (SPAM and TOXIC)
4. Generate `SyntheticToxicSpam` by combining toxic text fragments with Vietnamese spam CTA (call-to-action) templates
5. Output: `/kaggle/working/moderation_dataset_v2.csv`

### `bìnhthuong.ipynb` — Ham (Normal) Data Generation

Generates 10,000 Vietnamese "normal" comments using a local LLM to counter-balance toxic/spam classes:

- **LLM:** Ollama + Qwen 2.5:7b (running locally)
- **4 content taxonomies:** casual chat, Q&A, product reviews, work/study discussions
- **7 user personas** for stylistic diversity
- **Semantic deduplication:** `paraphrase-multilingual-MiniLM-L12-v2` with cosine similarity threshold 0.87
- **Mutation:** Vietnamese abbreviations + emojis injected to simulate natural writing style
- **Checkpoint:** SQLite-based checkpointing allows resuming if the generation process is interrupted
- Output: `/kaggle/working/vietnamese_ham_dataset.csv` (also committed as `notebook/vietnamese_ham_dataset.csv`)

---

## Future Capability: mT5 Summarization and Tag Suggestion

### `kaggle_finetune_mt5.ipynb`

Fine-tunes `google/mt5-base` (~580M parameters) to perform two tasks from a single model using task-prefix conditioning (T5 multi-task format).

**Task 1 — Summarization:**
```
Input:  "summarize: {title} </s> {content}"
Output: Short summary (sapo)
```

**Task 2 — Tag Suggestion:**
```
Input:  "suggest tags: {title} </s> {content}"
Output: Comma-separated tag list
```

### Training Data

~20,200 Vietnamese news articles crawled from:

| Source | Categories | Articles |
|---|---|---|
| VnExpress | 16 | ~9,400 |
| Tuổi Trẻ | 12 | ~4,300 |
| Dân Trí | 10 | ~3,600 |
| Thanh Niên | 10 | ~2,900 |

Crawled by `kaggle_crawl_vnexpress.ipynb` (8–12 hours runtime with polite delays). Each article includes `title`, `content`, `summary` (sapo), `tags`, `source`.

### Training Configuration

| Parameter | Value | Rationale |
|---|---|---|
| Optimizer | AdaFactor | Designed for T5 family, lower VRAM |
| Batch size | 4 per GPU (effective 32) | Gradient accumulation |
| Epochs | 6 (with early stopping on ROUGE-L) | Prevent overfitting |
| Label smoothing | 0.1 | Regularization |
| Learning rate | 3e-4 | AdaFactor default |

**Evaluation:** ROUGE-1, ROUGE-2, ROUGE-L — computed separately for summarization and tag tasks.

**Kaggle requirements:** GPU T4 × 2, estimated 4–6 hours.

---

## Future Capability: Image Moderation

### `kaggle_train_image_model.ipynb`

Trains and compares four model architectures for 3-class image classification.

**Classes:**
| Label | Description |
|---|---|
| `SAFE` (0) | Normal content |
| `NSFW` (1) | Adult / sexually explicit content |
| `VIOLENCE` (2) | Violent or graphic content |

### Models Compared

| Model | Architecture | Params | Notes |
|---|---|---|---|
| `efficientnet_b0` | CNN | ~5M | Recommended for production (speed/accuracy balance) |
| `resnet50` | CNN | ~25M | Classical baseline |
| `vit_base_patch16_224` | Vision Transformer | ~86M | Global attention, no locality bias |
| `openai/clip-vit-base-patch32` | Multimodal (text+image) | ~150M | Zero-shot baseline + fine-tuned |

### Training Pipeline (10 Steps)

1. Load raw images per class
2. Quality check: filter corrupt images, deduplicate cross-class with pHash
3. Stratified split 80/10/10 **before** augmentation (prevents data leakage)
4. Augment VIOLENCE class only (flip, rotate, colorjitter) to reach ~10k/class
5. Compute train-set mean/std; build DataLoaders
6. CLIP zero-shot baseline (no training needed)
7. LR Finder for fair per-model learning rate selection
8. Training: AdamW + CosineAnnealingLR, early stopping on Macro F1
9. Basic comparison: confusion matrices, training curves
10. Full evaluation: ROC, PR curves, ECE calibration, Grad-CAM, ViT Attention Rollout, t-SNE, 6-axis radar chart

### Handling Class Imbalance (VIOLENCE ~5k vs SAFE/NSFW ~10k)

Three simultaneous techniques:
- **Data:** Augment VIOLENCE train set to match other classes
- **Loss:** Weighted `CrossEntropyLoss` to penalise errors on minority class more
- **Metric:** Early stopping on **Macro F1** (equally weights all classes, not biased toward majority)

### Output Files

| File | Content |
|---|---|
| `best_image_model.zip` | `model.pt` + `meta.json` (inference metadata) |
| `production_recommendation.json` | Which model to use in production and why |
| `comparison_results.json` | Full numeric results for all 4 models |
| Various `.png` files | Training curves, confusion matrices, Grad-CAM, t-SNE, etc. |

**`meta.json` structure:**
```json
{
  "model_key": "efficientnet_b0",
  "is_clip": false,
  "class_names": ["SAFE", "NSFW", "VIOLENCE"],
  "img_size": 224,
  "mean": [...],
  "std": [...],
  "test_acc": 91.5,
  "test_f1": 90.2,
  "roc_auc": 0.97,
  "ece": 0.04
}
```

---

## Full Reproduction Order

To recreate the entire training pipeline from scratch:

```
Step 1:  spam.ipynb               → prepare text moderation dataset
Step 2:  bìnhthuong.ipynb         → generate Vietnamese ham data
Step 3a: xlm-roberta-.ipynb       → train production text classifier
Step 3b: phobert.ipynb            → comparison model (parallel)
Step 3c: infoxlm.ipynb            → comparison model (parallel)
Step 3d: bert.ipynb               → comparison model (parallel)

Step 4:  kaggle_crawl_vnexpress.ipynb  → crawl Vietnamese news articles
Step 5:  kaggle_finetune_mt5.ipynb     → fine-tune mT5 summarizer

Step 6:  kaggle_train_image_model.ipynb → train and compare image models
```

---

## Model File Locations

```
project-root/
├── final_model/              ← XLM-RoBERTa (deployed, required)
│   ├── model.safetensors
│   ├── tokenizer.json
│   ├── config.json
│   └── tokenizer_config.json
├── final_model_mt5/          ← mT5 summarizer (download from Kaggle output)
│   ├── pytorch_model.bin
│   └── config.json
└── final_model_image/        ← Best image model (download from Kaggle output)
    ├── model.pt
    └── meta.json
```

The AI service (`ai_service/main.py`) is hard-coded to load from `../final_model` relative to the script location. The mT5 and image models are not yet referenced by any service code.

---

## Kaggle Infrastructure Requirements

| Notebook | GPU | Internet | Est. Runtime |
|---|---|---|---|
| `kaggle_crawl_vnexpress.ipynb` | Not needed | On | 8–12 hours |
| `kaggle_finetune_mt5.ipynb` | T4 × 2 or P100 | On (first run) | 4–6 hours |
| `kaggle_train_image_model.ipynb` | T4 × 2 or P100 | On | 6–8 hours |
| `xlm-roberta-.ipynb` | T4 × 2 or P100 | On (first run) | 3–5 hours |
| `spam.ipynb`, `bìnhthuong.ipynb` | Not needed | Optional | < 1 hour |
