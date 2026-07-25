# AI Moderation Pipeline

The AI content moderation system is the architectural centrepiece of the platform. It classifies every post and comment **synchronously** — before the database write — so that no violating content is ever visible by default.

---

## The Model: XLM-RoBERTa

| Property | Value |
|---|---|
| Base model | `xlm-roberta-base` (125M params) |
| Task | Multi-label binary classification |
| Labels | `LABEL_0` = TOXIC, `LABEL_1` = SPAM |
| Output activation | **Sigmoid** (not softmax) — each label scored independently |
| Max input tokens | 512 (text is truncated if longer) |
| Thresholds | 0.5 for both SPAM and TOXIC |
| Model size | ~1.1 GB (`.safetensors` format) |
| Device | CUDA if available, else CPU |
| Model location | `final_model/` at project root |

The model was fine-tuned on ~192,000 multilingual examples covering Vietnamese and English toxic/spam content (see `ai_research_and_training.md` for dataset details).

---

## Classification Logic

The Python AI service (`ai_service/main.py`) returns two independent probability scores. The Node.js layer (`ai.service.js`) receives these and uses the following deterministic rule:

```
toxicity_score = LABEL_0 sigmoid probability
spam_score     = LABEL_1 sigmoid probability

if toxicity_score >= 0.5 AND toxicity_score >= spam_score:
    label = "TOXIC"
elif spam_score >= 0.5:
    label = "SPAM"
else:
    label = "NORMAL"
```

**Priority order: TOXIC > SPAM > NORMAL**

This means if both scores exceed 0.5, the content is always classified as TOXIC (the more severe class), not SPAM.

**Example outputs:**

| toxicity_score | spam_score | Result |
|---|---|---|
| 0.85 | 0.30 | TOXIC |
| 0.85 | 0.90 | TOXIC (toxicity_score ≥ spam_score) |
| 0.20 | 0.75 | SPAM |
| 0.30 | 0.40 | NORMAL |
| 0.00 | 0.00 | NORMAL (empty text short-circuits) |

---

## Post Creation Pipeline

Triggered by `POST /api/posts`. The AI call is embedded inside `PostService.createPost()`.

```
Client sends POST /api/posts (with title, content_html, content_json, media)
        │
        ▼
[Upload middleware] — files uploaded to Cloudinary (or local /uploads fallback)
        │
        ▼
[PostController.createPost] — extracts fields, calls PostService
        │
        ▼
[AIService.analyze(title + stripped body text)]
   — HTTP POST to http://localhost:8000/analyze
   — 10s timeout (AbortController)
        │
        ▼
      label?
   ┌────┴────────────────────────┐
NORMAL                   SPAM or TOXIC
   │                            │
   │                            ├─ Post.visibility = "HIDDEN"
   │                            ├─ ModerationQueue.create (PENDING)
   │                            ├─ User.spamCount++ / toxicCount++
   │                            ├─ violationScore recalculated
   │                            ├─ User.status auto-escalated (WARNING / BANNED)
   │                            └─ Notification.AI_MODERATION sent (Socket.IO)
   │
   ▼
Post saved to MongoDB
   │
   ▼ (if PUBLIC)
Socket.IO broadcast: "new_post" to all connected clients
```

---

## Comment Creation Pipeline

Triggered by `POST /api/comments`. Handled in `CommentService.createComment()`.

```
Client sends POST /api/comments (post_id, content, optional parent_id)
        │
        ▼
[AIService.analyze(content)]
        │
        ▼
      label?
   ┌────┴────────────────────────┐
NORMAL                   SPAM or TOXIC
   │                            │
   │                            ├─ Comment.is_hidden = true
   │                            ├─ ModerationQueue.create (PENDING)
   │                            ├─ ModerationLog.create (action: QUEUED)
   │                            ├─ User.spamCount++ / toxicCount++
   │                            ├─ violationScore recalculated
   │                            ├─ User.status auto-escalated
   │                            └─ Notification.AI_MODERATION sent (Socket.IO)
   │
   ▼
Comment saved to MongoDB with AI scores embedded
   │
   ▼
Social notification sent (COMMENT to post author, or REPLY to parent comment author)
  — only if the commenter is not the same person as the recipient
```

> **Key difference from posts:** comments also write a `ModerationLog` entry (action `QUEUED`) in addition to the queue item. Posts currently do not write a log entry at creation time.

---

## Violation Scoring Formula

```javascript
violationScore = (spamCount × 1) + (toxicCount × 3)
```

| Threshold | Status set |
|---|---|
| `violationScore >= 10` | `BANNED` |
| `violationScore >= 5` | `WARNING` |
| otherwise | no change |

This scoring is **additive and permanent**: scores are never automatically reduced. Only an admin can reset them via `PUT /api/admin/users/:id/reset-score`.

TOXIC content is weighted 3× more than SPAM because it represents a more severe violation (hate speech, harassment) vs. promotional spam.

**Important:** The escalation check skips already-`BANNED` users — their status cannot be worsened further by the automatic system.

---

## AI Service Interface

**Endpoint:** `POST /analyze`

Request body:
```json
{ "text": "string" }
```

Response:
```json
{
  "spam_score": 0.0312,
  "toxicity_score": 0.9124,
  "label": "TOXIC",
  "raw_scores": { "TOXIC": 0.9124, "SPAM": 0.0312 }
}
```

**Health check:** `GET /health`
```json
{
  "status": "ok",
  "model_loaded": true,
  "device": "cuda",
  "labels": { "LABEL_0": "TOXIC", "LABEL_1": "SPAM" },
  "thresholds": { "spam": 0.5, "toxic": 0.5 }
}
```

---

## Fallback Behaviour (Service Unavailable)

`AIService.analyze()` wraps the HTTP call in a try/catch with an `AbortController` timeout.

| Error condition | Behaviour |
|---|---|
| `ECONNREFUSED` (Python service down) | Returns `{ label: "NORMAL", spam_score: 0.1, toxicity_score: 0.1 }` |
| Request timeout (>10 s) | Same fallback |
| Non-200 HTTP response from AI service | Same fallback |
| Empty text submitted | Short-circuits immediately, returns NORMAL without HTTP call |

**Effect:** When the AI service is unavailable, all content is published as if it were NORMAL. No content is blocked, no queue entries are created. This is a deliberate trade-off: user experience is never degraded by AI infrastructure failures, at the cost of temporarily allowing potentially violating content through until the service recovers.

> A `console.warn` is emitted for timeouts/connection refused; `console.error` for unexpected errors. No alerting or retry mechanism exists in the current implementation.

---

## Text Preparation

Before calling the AI service, the Node.js layer prepares the text:

- **For posts:** `title + ' ' + content_html_stripped_of_tags` (joined with a space, stripped with a regex `replace(/<[^>]+>/g, ' ')`)
- **For comments:** raw `content` string (plain text only, no HTML)
- Input is trimmed; empty strings after trimming return NORMAL immediately
- The Python service further tokenizes with `truncation=True, max_length=512`

---

## Limitations and Known Issues

1. **No image moderation in production.** The `media[]` array on posts is not passed to the AI. Images uploaded to posts are never screened.
2. **No re-analysis on edit.** `PostService.updatePost()` does not call the AI service. Edited content is not re-screened.
3. **Reposts bypass AI.** `PostService.repostPost()` creates a new Post document without calling the AI service, as the content is minimal (a reference to the original).
4. **Synchronous latency.** The AI call adds 200–2000 ms to every create request. If the model is running on CPU (no CUDA), this can be significantly higher.
5. **No threshold configurability at runtime.** SPAM_THRESHOLD and TOXIC_THRESHOLD are hard-coded in `ai_service/main.py` as constants and require a service restart to change.
6. **Vietnamese-specific dataset but multilingual model.** XLM-RoBERTa handles both Vietnamese and English, but the training dataset is skewed toward Vietnamese content. Accuracy on other languages may be lower.
