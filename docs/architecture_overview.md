# Architecture Overview

## Project Purpose

This is a **Vietnamese-language-aware blog platform** built with the MERN stack (MongoDB, Express, React/Next.js, Node.js) and augmented by a Python AI sidecar service. Its defining feature is **synchronous, inline content moderation**: every post and comment is automatically screened by a locally-hosted XLM-RoBERTa model before being written to the database, without any human needing to act first.

The platform supports a complete content lifecycle:

```
User writes content
      ↓
AI triage (XLM-RoBERTa)
      ↓
  NORMAL → published immediately
  SPAM / TOXIC → hidden + queued for human review
                      ↓
               Admin reviews queue
                      ↓
            Approve / Hide / Warn
                      ↓
              User can file an Appeal
                      ↓
               Admin resolves appeal
```

---

## Three-Service Topology

```
┌─────────────────────────────────────────────────────────────┐
│                      BLOG PLATFORM                          │
│                                                             │
│  ┌─────────────┐     ┌──────────────────┐  ┌─────────────┐ │
│  │  Next.js    │     │  Node.js         │  │   Python    │ │
│  │  Frontend   │◄───►│  Express + WS    │◄►│  FastAPI    │ │
│  │   :3000     │     │   :5000          │  │   :8000     │ │
│  └─────────────┘     └────────┬─────────┘  └──────┬──────┘ │
│                               │                   │        │
│                        ┌──────▼──────┐   ┌────────▼──────┐ │
│                        │  MongoDB    │   │  XLM-RoBERTa  │ │
│                        │  (Atlas or  │   │  final_model/ │ │
│                        │  local)     │   │  (~1.1 GB)    │ │
│                        └─────────────┘   └───────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

| Service | Technology | Role |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) | User-facing UI — feed, post editor, messages, admin panel |
| **Backend API** | Express 5 + Socket.IO 4 | REST API, business logic, authentication, real-time push |
| **AI Microservice** | Python FastAPI + Uvicorn | Serves the XLM-RoBERTa model for content classification |
| **Database** | MongoDB (via Mongoose 8) | Primary data store for all domain entities |
| **Media storage** | Cloudinary (primary) / local `uploads/` (fallback) | Image and video hosting for posts and messages |

---

## Backend Internal Layers

The Express API follows a strict four-layer architecture:

```
HTTP Request
    ↓
Routes  (routes/*.routes.js)       — URL mapping + middleware wiring
    ↓
Controllers  (controllers/*.js)    — HTTP in/out, no business logic
    ↓
Services  (services/*.js)          — Business logic, orchestration
    ↓
Repositories  (repositories/*.js)  — MongoDB queries only
    ↓
Models  (models/*.js)              — Mongoose schema definitions
```

Services import other services directly (e.g., `post.service` imports `ai.service`, `notification.service`). Circular imports are avoided by using `require()` lazily inside methods where needed.

---

## Development Startup

### Automatic (PowerShell — Windows)
```powershell
.\start_all.ps1
```

### Manual (cross-platform)
```bash
# Terminal 1 — AI service (Python must have transformers, torch installed)
python ai_service/main.py

# Terminal 2 — Backend API
npm run dev          # uses nodemon for hot-reload

# Terminal 3 — Frontend
cd frontend && npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend REST API | http://localhost:5000/api |
| AI Service | http://localhost:8000 |
| AI Health check | http://localhost:8000/health |
| AI Swagger docs | http://localhost:8000/docs |

---

## Environment Variables

All variables live in a `.env` file at the project root and are loaded via `dotenv`.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `5000` | Express server port |
| `MONGO_URI` or `MONGODB_URI` | `mongodb://localhost:27017/blog-platform` | MongoDB connection string |
| `JWT_ACCESS_SECRET` | — | HMAC secret for access tokens |
| `JWT_REFRESH_SECRET` | — | HMAC secret for refresh tokens |
| `JWT_ACCESS_EXPIRE` | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRE` | `7d` | Refresh token lifetime |
| `AI_SERVICE_URL` | `http://localhost:8000` | Base URL of the Python AI sidecar |
| `AI_TIMEOUT_MS` | `10000` | Milliseconds before AI call is aborted |
| `CLIENT_URL` | `http://localhost:3000` | Allowed CORS origin |
| `CLOUDINARY_CLOUD_NAME` | — | Cloudinary account name |
| `CLOUDINARY_API_KEY` | — | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | — | Cloudinary API secret |
| `AI_PORT` | `8000` | Port the FastAPI service listens on |

> **Note:** `CLOUDINARY_API_KEY` being absent causes a graceful fallback to local file storage in `uploads/`; the server does not crash.

---

## Key Design Decisions

1. **AI triage is synchronous and blocking.** The post/comment creation request waits for the AI result before responding to the client. This ensures every piece of content is classified before it can become visible, at the cost of a 200–2000 ms latency overhead per submission.

2. **Fallback to NORMAL on AI failure.** If the Python service is down or times out, content is treated as NORMAL and published immediately. User experience is never blocked by AI unavailability.

3. **Socket.IO co-hosted with Express.** Both HTTP and WebSocket traffic share port 5000 via the same `http.Server` instance, simplifying deployment.

4. **Repository pattern.** All MongoDB interaction is isolated in `repositories/`, making service logic testable without a live database and making storage engine swaps tractable.
