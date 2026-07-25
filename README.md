# Blog Platform với AI Content Moderation

Nền tảng blog MERN Stack tích hợp AI (XLM-Roberta) để kiểm duyệt nội dung tự động.

## Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────┐
│                    BLOG PLATFORM                        │
│                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │  Next.js    │    │  Node.js    │    │   Python    │ │
│  │  Frontend   │◄──►│  Backend    │◄──►│ AI Service  │ │
│  │ :3000       │    │ Express :5000│   │ FastAPI :8000│ │
│  └─────────────┘    └─────────────┘    └─────────────┘ │
│                           │                    │        │
│                    ┌──────▼──────┐    ┌────────▼──────┐ │
│                    │  MongoDB    │    │ XLM-Roberta   │ │
│                    │  Atlas      │    │ final_model/  │ │
│                    └─────────────┘    └───────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Khởi động hệ thống

### Cách 1: Dùng script tự động (Khuyên dùng)
```powershell
.\start_all.ps1
```

### Cách 2: Chạy từng service thủ công

**Terminal 1 - Python AI Service:**
```powershell
cd f:\doan
python ai_service\main.py
```

**Terminal 2 - Node.js Backend:**
```powershell
cd f:\doan
npm run dev
```

**Terminal 3 - Next.js Frontend:**
```powershell
cd f:\doan\frontend
npm run dev
```

## URLs

| Service | URL | Mô tả |
|---------|-----|-------|
| Frontend | http://localhost:3000 | Giao diện người dùng |
| Backend API | http://localhost:5000/api | REST API |
| AI Service | http://localhost:8000 | Python FastAPI |
| AI Health | http://localhost:8000/health | Kiểm tra trạng thái |
| AI Docs | http://localhost:8000/docs | Swagger UI |

## AI Model

- **Model:** XLM-Roberta (`xlm-roberta-base` fine-tuned)
- **Task:** Multi-label content classification
- **Labels:**
  - `LABEL_0` → **TOXIC** (nội dung thù hận, xúc phạm)
  - `LABEL_1` → **SPAM** (quảng cáo rác, spam)
- **Thresholds:** 0.5 cho cả SPAM và TOXIC
- **Model size:** ~1.1GB (`.safetensors`)

## Luồng kiểm duyệt AI

```
User tạo Post/Comment
        │
        ▼
Node.js Backend nhận nội dung
        │
        ▼
Gọi Python AI Service (/analyze)
        │
        ▼
XLM-Roberta phân tích văn bản
        │
     ┌──┴──┐
     │     │
   SPAM  TOXIC   NORMAL
     │     │       │
  Hidden  is_sensitive  Public
  + Queue  + Queue
     │
     ▼
Admin Moderation Dashboard
```

## Cấu trúc thư mục

```
f:\doan\
├── ai_service/          # Python FastAPI microservice
│   └── main.py          # Service chính
├── final_model/         # Model đã train
│   ├── model.safetensors
│   ├── tokenizer.json
│   ├── config.json
│   └── tokenizer_config.json
├── controllers/         # Express controllers
├── services/
│   ├── ai.service.js    # Gọi Python microservice
│   └── ...
├── frontend/            # Next.js app
├── start_all.ps1        # Script khởi động
└── .env                 # Biến môi trường
```

## Environment Variables

```env
# Backend
PORT=5000
MONGO_URI=...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# AI Service
AI_SERVICE_URL=http://localhost:8000
AI_TIMEOUT_MS=10000
```
