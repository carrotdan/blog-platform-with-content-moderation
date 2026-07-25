# Notebooks — AI Moderation & NLP Pipeline

Thư mục này chứa toàn bộ notebook Kaggle dùng để **thu thập dữ liệu**, **fine-tune model NLP** và **train model kiểm duyệt hình ảnh** cho hệ thống Blog Platform.

---

## Tổng quan kiến trúc AI

```
Blog Platform
├── Kiểm duyệt văn bản  →  XLM-RoBERTa (multi-label: spam + toxic)
├── Tóm tắt bài viết    →  mT5-base (multi-task: summarize + suggest tags)
└── Kiểm duyệt hình ảnh →  EfficientNet-B0 / ResNet-50 / ViT-base (3 class: SAFE / NSFW / VIOLENCE)
```

---

## Danh sách notebooks

### 1. `kaggle_crawl_vnexpress.ipynb` — Thu thập dữ liệu huấn luyện

**Mục đích:** Crawl ~20,000 bài báo từ 4 trang tin tức tiếng Việt để tạo dataset cho fine-tune mT5.

**Nguồn dữ liệu:**

| Nguồn | Số chuyên mục | Số trang/mục | Ước tính bài |
|-------|--------------|-------------|-------------|
| VnExpress (`vnexpress.net`) | 16 | 70 | ~9,400 |
| Tuổi Trẻ (`tuoitre.vn`) | 12 | 55 | ~4,300 |
| Dân Trí (`dantri.com.vn`) | 10 | 55 | ~3,600 |
| Thanh Niên (`thanhnien.vn`) | 10 | 45 | ~2,900 |
| **Tổng** | | | **~20,200** |

**Mỗi bài viết gồm:** `title`, `content`, `summary` (sapo), `tags`, `source`

**Yêu cầu Kaggle:**
- Internet: **BẬT** (Settings > Internet > On)
- Accelerator: không cần GPU

**Thứ tự chạy:**
1. Chạy cell **DEBUG** trước để kiểm tra selector hoạt động — xem output `✓ vne_crawl() OK!`
2. Nếu debug OK → chạy toàn bộ từ đầu
3. Ước tính thời gian: **8–12 tiếng** (có delay giữa request để tránh bị block)

**Output:** `/kaggle/working/vnexpress_dataset.json`

---

### 2. `kaggle_finetune_mt5.ipynb` — Fine-tune mT5-base (tóm tắt + đề xuất tag)

**Mục đích:** Fine-tune `google/mt5-base` (~580M params) để thực hiện 2 task trong 1 model.

**Multi-task learning:**
- **Task 1 — Tóm tắt:** `"summarize: {title} </s> {content}"` → tóm tắt ngắn (sapo)
- **Task 2 — Đề xuất tag:** `"suggest tags: {title} </s> {content}"` → danh sách tag, phân cách dấu phẩy

**Cấu hình training:**

| Tham số | Giá trị | Lý do |
|---------|---------|-------|
| Model | `google/mt5-base` | 580M params, cân bằng tốt quality/speed |
| Optimizer | AdaFactor | Thiết kế riêng cho T5, tiết kiệm VRAM |
| Batch size | 4 per GPU (effective=32) | Base lớn hơn small |
| Epochs | 6 (có early stopping) | Dừng sớm nếu ROUGE-L không cải thiện |
| Label smoothing | 0.1 | Tránh overfit |
| Learning rate | 3e-4 | Phù hợp AdaFactor |

**Đánh giá:** ROUGE-1, ROUGE-2, ROUGE-L riêng cho từng task trên tập validation.

**Yêu cầu Kaggle:**
- Accelerator: **GPU T4 × 2** hoặc P100
- Internet: **BẬT** (lần đầu tải model)
- Upload `vnexpress_dataset.json` vào phần **Input** (Add Data > Upload)

**Ước tính thời gian:** ~4–6 giờ với T4 × 2

**Output:** `/kaggle/working/mt5-multitask-final.zip` — giải nén vào `final_model_mt5/`

---

### 3. `kaggle_train_image_model.ipynb` — So sánh 4 model kiểm duyệt ảnh

**Mục đích:** Train và so sánh 4 kiến trúc (CNN / ViT / Multimodal CLIP) để chọn model tốt nhất cho production. Bao gồm đánh giá toàn diện sau training.

---

#### 3.1 Phân loại 3 class

| Nhãn | Mô tả |
|------|-------|
| `SAFE` (0) | Ảnh bình thường, an toàn |
| `NSFW` (1) | Nội dung 18+, khiêu dâm |
| `VIOLENCE` (2) | Bạo lực, máu me |

---

#### 3.2 Bốn model được so sánh

| Model | Kiểu | Params | Đặc điểm |
|-------|------|--------|-----------|
| `efficientnet_b0` | CNN | ~5M | Nhẹ, nhanh, phù hợp production |
| `resnet50` | CNN | ~25M | Baseline kinh điển, ổn định |
| `vit_base_patch16_224` | Image Transformer | ~86M | Attention toàn cục, không cần locality |
| `openai/clip-vit-base-patch32` | Multimodal | ~150M | Zero-shot baseline + fine-tuned |

---

#### 3.3 Pipeline 10 bước (thứ tự cell trong notebook)

| Bước | Cell | Nội dung |
|------|------|---------|
| 1 | Load Raw | Load ảnh gốc theo class, **chưa** augment, **chưa** split |
| 2 | Quality Check | Lọc ảnh corrupt, quá nhỏ (<64px), pHash cross-class dedup |
| 3 | Split | Stratified split 80/10/10 → **trước** khi augment (tránh data leakage) |
| 4 | Augment | Chỉ upsample VIOLENCE trong train → cân bằng ~10k/class |
| 5 | DataLoaders | Tính mean/std từ train set; build 6 DataLoader (train/val/test × CNN/CLIP) |
| 6 | Zero-shot | CLIP zero-shot baseline (không cần train, dùng text prompts) |
| 7 | LR Finder | `torch-lr-finder` tìm LR tối ưu riêng cho từng model → so sánh công bằng |
| 8 | Train | AdamW + CosineAnnealingLR, early stop theo macro F1 |
| 9 | So sánh cơ bản | Confusion matrix 2×2 + training curves loss/F1 |
| 10 | Đánh giá toàn diện | ROC · PR · ECE calibration · Error analysis · Grad-CAM · ViT Attention · t-SNE · Radar chart 6D |
| — | Kết luận | Production recommendation + lưu best model |

---

#### 3.4 Dataset và cách chuẩn bị

**Nguồn dữ liệu:**

| Class | Nguồn | Số lượng gốc | Ghi chú |
|-------|-------|-------------|---------|
| SAFE + NSFW | HuggingFace (xem bên dưới) | ~10k/class | Tự động load |
| VIOLENCE | `Real Life Violence Situations Dataset` (Kaggle) | ~5k | Augment lên ~10k |

**Thêm Violence dataset vào Kaggle notebook:**
> Add Data → tìm `"Real Life Violence Situations Dataset"` → Add

**Load SAFE + NSFW — thứ tự thử tự động:**

Code tự thử các nguồn theo thứ tự ưu tiên, dừng khi thành công:

```
[A] DarkyMan/nsfw-image-classification   ← PUBLIC, không cần token
    Download zip 160MB → tự detect folder safe/nsfw

[B] Falconsai/nsfw_image_detection        ← Cần HF_TOKEN
    prithivMLmods/nsfw-safe-image-...     ← Cần HF_TOKEN (fallback)

[C] /kaggle/input/nsfw-images/safe|nsfw  ← User thêm thủ công (fallback cuối)
```

**Thiết lập HF_TOKEN (nếu [A] fail):**
1. Tạo tài khoản miễn phí tại [huggingface.co](https://huggingface.co)
2. Vào **Settings → Access Tokens → New token** (Role: Read)
3. Kaggle notebook → **Add-ons → Secrets → + New secret**
   - Key: `HF_TOKEN`
   - Value: token `hf_...` vừa tạo
4. Restart kernel và chạy lại

> **Lý do cần token:** HuggingFace yêu cầu đăng nhập cho dataset có nội dung người lớn theo chính sách nội dung. Dataset `DarkyMan` là ngoại lệ không cần auth.

---

#### 3.5 Kỹ thuật xử lý mất cân bằng (VIOLENCE ~5k vs SAFE/NSFW ~10k)

Ba lớp bảo vệ đồng thời:

| Lớp | Kỹ thuật | Tác dụng |
|-----|---------|---------|
| Data | Augment VIOLENCE train set | Tăng số lượng bằng flip/rotate/colorjitter |
| Loss | `CrossEntropyLoss(weight=...)` | Phạt nặng hơn khi sai ở class thiểu số |
| Metric | Early stopping theo **Macro F1** | Không ưu tiên class đa số |

---

#### 3.6 Metrics so sánh (7 chỉ số)

| Metric | Ý nghĩa |
|--------|--------|
| **Accuracy** | Tỉ lệ đúng tổng thể |
| **Macro F1** | F1 trung bình không trọng số — tiêu chí chính |
| **VIOLENCE F1** | F1 riêng cho class khó nhất |
| **AUC-ROC** | One-vs-Rest macro, đo khả năng phân biệt |
| **ECE** | Expected Calibration Error — độ tin cậy của confidence |
| **Inference (ms)** | Latency trung bình 50 lần, GPU-synchronized |
| **Size (MB)** | Kích thước file model.pt |

Kết quả được tổng hợp trong **radar chart 6 chiều** (Speed = 1/latency chuẩn hóa).

---

#### 3.7 Kết quả output

| File | Nội dung |
|------|---------|
| `lr_finder.png` | LR Finder curves 4 model |
| `size_dist.png` | Phân phối kích thước ảnh |
| `training_curves.png` | Loss + Macro F1 theo epoch |
| `confusion_matrices.png` | Confusion matrix 4 model (2×2 grid) |
| `roc_curves.png` | ROC One-vs-Rest per class |
| `pr_curves.png` | Precision-Recall per class |
| `calibration.png` | Reliability diagram + ECE |
| `error_high_conf.png` | Ảnh phân loại sai với confidence cao |
| `error_uncertain.png` | Ảnh có entropy cao (model không chắc) |
| `gradcam_*.png` | Grad-CAM — model nhìn vào vùng nào |
| `vit_attention.png` | ViT Attention Rollout visualization |
| `tsne.png` | t-SNE — phân bố feature space |
| `radar_chart.png` | Radar chart so sánh 6 chiều |
| `comparison_results.json` | Bảng số liệu đầy đủ tất cả models |
| `production_recommendation.json` | Kết luận model nào dùng cho production và lý do |
| `best_image_model.zip` | Best model (`model.pt` + `meta.json`) |

**Nội dung `meta.json` trong zip:**
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
Đủ thông tin để tái tạo model cho inference mà không cần biết code training.

---

#### 3.8 Yêu cầu Kaggle

| Mục | Yêu cầu |
|-----|--------|
| Accelerator | **GPU T4 × 2** hoặc P100 |
| Internet | **BẬT** (Settings → Internet → On) |
| RAM | ≥ 13GB (T4 đủ) |
| Disk | ≥ 10GB trống |

**Ước tính thời gian:** ~6–8 giờ tổng
- Load data + quality check: ~15 phút
- LR Finder × 4 model: ~30 phút
- Train × 4 model (20 epoch/model): ~4–5 giờ
- Evaluation (ROC, Grad-CAM, t-SNE...): ~1 giờ

---

### 4. `xlm-roberta-.ipynb` — Fine-tune XLM-RoBERTa (kiểm duyệt văn bản)

**Mục đích:** Fine-tune `xlm-roberta-base` cho bài toán **multi-label classification**: phát hiện đồng thời spam và toxic trong cùng một lần inference.

**Dataset training (~192,000 examples sau augment):**

| Nguồn | Loại | Kích thước |
|-------|------|-----------|
| Jigsaw Toxic Comments | toxic (en) | ~92k |
| ViHSD | toxic (vi) | ~28k |
| ViSpamReviews (upsampled) | spam (vi) | ~39k |
| SyntheticSpam | spam (vi) | ~8k |
| SyntheticHam | clean (vi) | ~6.5k |
| EnglishSpam | spam (en) | ~6.4k |
| ViCTSD | toxic (vi) | ~6.4k |
| SyntheticToxicSpam | spam+toxic (vi) | 5k |

**Output:** `./final_moderation_model_v2/` → copy vào `final_model/` trong project

---

### 5. `spam.ipynb` — Chuẩn bị dataset kiểm duyệt văn bản

**Mục đích:** Pipeline chuẩn bị và cân bằng dataset để train XLM-RoBERTa. Bao gồm:
- Load + chuẩn hóa 7 nguồn dữ liệu (ViCTSD, ViHSD, ViSpamReviews, Jigsaw, ...)
- Cleaning và deduplication
- Upsample minority class (spam/toxic)
- Tạo dữ liệu tổng hợp `SyntheticToxicSpam` bằng cách ghép text toxic + spam CTA template

**Output:** `/kaggle/working/moderation_dataset_v2.csv`

---

### 6. `phobert.ipynb`, `infoxlm.ipynb`, `bert.ipynb` — Các model so sánh

Cùng kiến trúc pipeline với `xlm-roberta-.ipynb`, chỉ thay `MODEL_NAME`:

| Notebook | Model | Ghi chú |
|----------|-------|---------|
| `phobert.ipynb` | `vinai/phobert-base-v2` | Chuyên tiếng Việt |
| `infoxlm.ipynb` | `microsoft/infoxlm-base` | Cross-lingual, họ hàng XLM-R |
| `bert.ipynb` | `bert-base-multilingual-cased` | mBERT, baseline cổ điển |

Dùng để **so sánh** với XLM-RoBERTa trong phần thực nghiệm luận văn.

---

### 7. `bìnhthuong.ipynb` — Sinh dữ liệu Ham (bình thường)

**Mục đích:** Tạo 10,000 bình luận tiếng Việt bình thường (ham/clean) bằng LLM local (Ollama + Qwen 2.5:7b) để bổ sung vào dataset training kiểm duyệt.

**Kỹ thuật:**
- Sử dụng 4 taxonomy (casual chat, Q&A, review, work/study) và 7 persona người dùng để đa dạng hóa nội dung
- Semantic deduplication bằng `paraphrase-multilingual-MiniLM-L12-v2` (threshold cosine 0.87)
- SQLite checkpointing để resume nếu bị ngắt giữa chừng
- Mutation: viết tắt tiếng Việt + emoji để giả lập văn phong tự nhiên

**Output:** `/kaggle/working/vietnamese_ham_dataset.csv`

---

## Thứ tự chạy để tái tạo toàn bộ pipeline

```
1. spam.ipynb              → chuẩn bị dataset text moderation
2. bìnhthuong.ipynb        → sinh thêm dữ liệu ham
3. xlm-roberta-.ipynb      → train model kiểm duyệt chính
   phobert.ipynb           → (song song, để so sánh)
   infoxlm.ipynb           → (song song, để so sánh)
   bert.ipynb              → (song song, để so sánh)

4. kaggle_crawl_vnexpress.ipynb  → crawl dữ liệu báo
5. kaggle_finetune_mt5.ipynb     → fine-tune tóm tắt + tag

6. kaggle_train_image_model.ipynb → train 4 model ảnh (EfficientNet / ResNet / ViT / CLIP)
```

---

## Vị trí model sau khi train xong

```
doan/
├── final_model/                  ← XLM-RoBERTa (đã có)
│   ├── model.safetensors
│   └── config.json
├── final_model_mt5/              ← mT5-base (sau khi download từ Kaggle)
│   ├── pytorch_model.bin
│   └── config.json
└── final_model_image/            ← Best image model (sau khi download từ Kaggle)
    ├── model.pt
    └── meta.json
```