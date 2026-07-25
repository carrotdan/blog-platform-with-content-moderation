# Human Moderation and Appeals

The AI pipeline (described in `ai_moderation_pipeline.md`) is the first line of defence. This document covers the human review layer that follows: the moderation queue, the three available admin actions, user-submitted reports, the appeal system, and the account-level enforcement mechanisms.

---

## The Moderation Queue

When the AI flags content as SPAM or TOXIC, it creates a `ModerationQueue` document with status `PENDING`. The queue is the primary work surface for moderators and admins.

**Queue item lifecycle:**

```
[AI flags content]
        │
        ▼
  ModerationQueue: PENDING
        │
        ▼
  Admin visits queue at GET /api/moderation/queue
        │
        ├─── Approve → content restored, queue item: REVIEWED
        ├─── Hide    → content stays hidden, queue item: REVIEWED
        └─── Warn    → content marked sensitive, queue item: REVIEWED
```

Once an item is marked `REVIEWED`, it is no longer returned by `ModerationService.getQueue()`. There is no "re-open" mechanism — all decisions are final via the queue (though admins can still change content state directly via `/api/admin` routes).

Items whose target content has been deleted are silently filtered out before being returned to the UI.

---

## Admin Queue Actions

All three actions resolve the queue item (set status to `REVIEWED`). They differ only in what they do to the target content.

### Approve — `PUT /api/moderation/:id/approve`

Restores the content to a visible state.

| Content type | What changes |
|---|---|
| Post | `visibility` → `PUBLIC` |
| Comment | `is_hidden` → `false` |

**When to use:** The AI made a false positive. The content is legitimate.

---

### Hide — `PUT /api/moderation/:id/hide`

Keeps the content hidden.

| Content type | What changes |
|---|---|
| Post | `visibility` → `HIDDEN` |
| Comment | `is_hidden` → `true` |

**When to use:** The AI was correct. The content violates guidelines.

---

### Warn — `PUT /api/moderation/:id/warn`

Marks content as sensitive. The content remains accessible but with a warning overlay in the UI.

| Content type | What changes |
|---|---|
| Post | `is_sensitive` → `true`, `visibility` remains `PUBLIC` |
| Comment | `is_sensitive` → `true`, `is_hidden` → `false` (un-hides if it was hidden) |

**When to use:** The content is borderline — not a clear violation, but warrants user discretion (e.g., graphic but newsworthy, strong language in context).

---

## User-Submitted Reports

Independent of the AI pipeline, authenticated users can report any post or comment using `POST /api/reports`.

**Report lifecycle:**

```
User submits report
        │
        ▼
  Report: PENDING
        │
        ▼
  Admin views at GET /api/admin/reports
  (enriched with target content preview)
        │
        ├─── HIDE          → content hidden + report: RESOLVED
        ├─── MARK_SENSITIVE → content marked sensitive + report: RESOLVED
        └─── DISMISS       → report: RESOLVED (no content change)
```

**Note on report vs. queue:** Reports and the AI moderation queue are separate systems with separate admin routes. A piece of content can simultaneously be in the queue (AI-flagged) and also have user reports against it, but they are resolved independently.

**Comment deletion on HIDE:** When an admin hides a comment via report resolution, `Comment.findByIdAndDelete()` is called — the comment is **hard deleted**, unlike posts which are only hidden. This is an asymmetry in the current implementation.

---

## Appeal System

Users can dispute an AI moderation decision by filing an appeal. This is the primary recourse for false positives.

### Appeal Lifecycle

```
User receives AI_MODERATION notification
        │
        ▼
User submits appeal via POST /api/appeals
(includes reason, original AI scores)
        │
        ▼
  Appeal: PENDING
  (duplicate appeals for the same content are rejected)
        │
        ▼
  Admin views pending appeals at GET /api/appeals/pending
        │
        ├─── APPROVED
        │       ├─ Post: visibility → PUBLIC, is_sensitive → false
        │       ├─ Comment: is_hidden → false
        │       ├─ Appeal: APPROVED, reviewed_by = admin_id
        │       └─ Notification APPEAL_RESOLVED (result: APPROVED) → user
        │
        └─── REJECTED
                ├─ Content state unchanged
                ├─ Appeal: REJECTED, reviewed_by = admin_id
                └─ Notification APPEAL_RESOLVED (result: REJECTED) → user
```

**State diagram:**

```
PENDING ──approve──► APPROVED
        └──reject──► REJECTED
```

Both `APPROVED` and `REJECTED` are terminal — an appeal cannot be reopened.

### Appeal Constraints

- **One appeal per content item per user.** `AppealService.createAppeal()` calls `appealRepository.findExisting(user_id, target_id)` before creating. If an existing appeal exists (in any state), creation is rejected with an error.
- **Appeals carry the original AI context.** The `ai_label`, `ai_spam_score`, and `ai_toxicity_score` fields are recorded at appeal creation time, preserving what the AI decided even if model thresholds change later.
- **Admins can attach a note.** The `admin_note` field is sent to the user in the `APPEAL_RESOLVED` notification, giving a reason for the decision.

---

## Admin Panel Capabilities

All admin routes are under `/api/admin` and protected by `authenticate + authorize('ADMIN')`.

### User Management

| Route | Action |
|---|---|
| `GET /api/admin/users` | List all users (excluding password) |
| `PUT /api/admin/users/:id/role` | Promote or demote role |
| `PUT /api/admin/users/:id/mute` | Set status → `MUTED` |
| `PUT /api/admin/users/:id/ban` | Set status → `BANNED` |
| `PUT /api/admin/users/:id/reset-score` | Reset spamCount, toxicCount, violationScore to 0, status → `ACTIVE` |
| `GET /api/admin/violations` | All users sorted by violationScore descending |

### Content Management

| Route | Action |
|---|---|
| `GET /api/admin/posts` | All posts with author info |
| `PUT /api/admin/posts/:id/hide` | Force-hide a post |
| `PUT /api/admin/posts/:id/unhide` | Restore post to PUBLIC |
| `PUT /api/admin/posts/:id/mark-sensitive` | Mark post as sensitive |
| `PUT /api/admin/posts/:id/unmark-sensitive` | Remove sensitive flag |
| `DELETE /api/admin/posts/:id` | Hard delete post |

### Report Management

| Route | Action |
|---|---|
| `GET /api/admin/reports` | Pending reports with content preview |
| `PUT /api/admin/reports/:id/resolve` | Resolve with action: HIDE, MARK_SENSITIVE, or no-op (DISMISS) |

---

## Account-Level Enforcement (`checkStatus` Middleware)

The `checkStatus` middleware is applied to write routes and performs a **live database lookup** on every request to enforce the current user status. This is important because a user could be banned after they obtained a valid JWT — the token alone is not sufficient.

| User status | HTTP methods blocked |
|---|---|
| `BANNED` | All methods — returns `403` |
| `MUTED` | `POST`, `PUT`, `DELETE`, `PATCH` — returns `403` (read access preserved) |
| `ACTIVE` or `WARNING` | No restriction |

`checkStatus` is applied on:
- `POST /api/posts`, `PUT /api/posts/:id`, `DELETE /api/posts/:id`
- `POST /api/comments`
- `GET /api/posts/me/posts`, `GET /api/posts/me/bookmarks`

> `WARNING` status currently carries no functional restriction — it is a visible signal to the user (returned in `violationScore` in the auth response) but does not block any routes.
