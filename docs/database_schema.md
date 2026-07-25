# Database Schema

All data is stored in **MongoDB** via Mongoose 8. Every collection uses `timestamps: true`, which automatically adds `createdAt` and `updatedAt` fields to every document.

---

## Collection Overview

| Collection | Model file | Purpose |
|---|---|---|
| `users` | `User.js` | Accounts, roles, violation state |
| `posts` | `Post.js` | Blog posts with dual content representation |
| `comments` | `Comment.js` | Threaded comments with inline AI fields |
| `interactions` | `Interaction.js` | Likes, bookmarks |
| `follows` | `Follow.js` | Directional follow graph |
| `moderationqueues` | `ModerationQueue.js` | AI-flagged content awaiting human review |
| `moderationlogs` | `ModerationLog.js` | Audit trail of all moderation actions |
| `reports` | `Report.js` | User-submitted content reports |
| `appeals` | `Appeal.js` | User appeals against AI decisions |
| `notifications` | `Notification.js` | In-app notification feed |
| `conversations` | `Conversation.js` | 1:1 DM threads |
| `messages` | `Message.js` | Individual DM messages |

---

## `users`

Stores accounts, role assignments, and AI-driven violation tracking.

| Field | Type | Notes |
|---|---|---|
| `email` | String | Unique, required |
| `password` | String | bcrypt hash |
| `username` | String | Unique, required |
| `role` | String enum | `USER` · `MODERATOR` · `ADMIN` — default `USER` |
| `status` | String enum | `ACTIVE` · `MUTED` · `BANNED` · `WARNING` — default `ACTIVE` |
| `spamCount` | Number | Incremented each time the AI labels their content SPAM |
| `toxicCount` | Number | Incremented each time the AI labels their content TOXIC |
| `violationScore` | Number | Computed as `(spamCount × 1) + (toxicCount × 3)` |
| `avatar` | String | URL to avatar image |
| `bio` | String | Profile description |
| `isDeleted` | Boolean | Soft-delete flag |
| `deleted_at` | Date | Timestamp of soft-delete |

**Escalation thresholds (applied in `post.service` and `comment.service`):**

| Score | Auto-status |
|---|---|
| ≥ 5 | `WARNING` |
| ≥ 10 | `BANNED` |

> `BANNED` is a terminal state — the service only escalates, never auto-demotes.

---

## `posts`

Blog posts with rich-text content stored in two parallel formats.

| Field | Type | Notes |
|---|---|---|
| `author` | ObjectId → `User` | Required |
| `title` | String | Defaults to empty; fallback slug uses first 20 chars of body |
| `slug` | String | Unique; generated as `kebab-title-{timestamp}` |
| `content_json` | Object | Structured editor JSON (e.g., TipTap/ProseMirror document) |
| `content_html` | String | Rendered HTML for display |
| `status` | String enum | `DRAFT` · `PUBLISHED` — default `DRAFT` |
| `visibility` | String enum | `PUBLIC` · `PRIVATE` · `HIDDEN` — default `PUBLIC` |
| `reading_time` | Number | Minutes; calculated as `ceil(wordCount / 200)`, minimum 1 |
| `cover_image` | String | URL |
| `is_locked` | Boolean | Reserved field (not used in current logic) |
| `is_sensitive` | Boolean | Set to `true` by AI or admin; shows a content warning overlay |
| `tags` | String[] | Free-form tags; indexed for fast filtering |
| `original_post` | ObjectId → `Post` | Self-reference for reposts; `null` on original posts |
| `media` | Embedded array | See below |

**`media` embedded document:**

| Field | Type | Notes |
|---|---|---|
| `type` | String enum | `IMAGE` · `VIDEO` |
| `url` | String | Cloudinary CDN URL or local URL |
| `public_id` | String | Cloudinary public_id for deletion |
| `width` / `height` | Number | Pixel dimensions |
| `duration` | Number | Video duration in seconds |
| `order_index` | Number | Display ordering |

**Indexes:**
- `slug` — unique (defined inline)
- `tags` — `{ tags: 1 }` — for tag-based filtering

**Visibility rules:**
| Value | Who sees it |
|---|---|
| `PUBLIC` | Everyone (guests see max 5 posts) |
| `PRIVATE` | Author only |
| `HIDDEN` | No one in the feed; author can still fetch via `/posts/:id/content` |

---

## `comments`

Threaded comments. AI moderation fields are stored inline.

| Field | Type | Notes |
|---|---|---|
| `post_id` | ObjectId → `Post` | Required |
| `author` | ObjectId → `User` | Required |
| `parent_id` | ObjectId → `Comment` | `null` = top-level comment |
| `depth` | Number | `0` = top-level; `parent.depth + 1` for replies |
| `content` | String | Required |
| `spam_score` | Number | Raw AI probability (0–1) |
| `toxicity_score` | Number | Raw AI probability (0–1) |
| `label` | String enum | `NORMAL` · `SPAM` · `TOXIC` |
| `is_hidden` | Boolean | `true` if AI flagged as SPAM or TOXIC |
| `is_sensitive` | Boolean | `true` if admin issued a Warn action |

**Indexes:**
- `post_id` — `{ post_id: 1 }` — for fetching comments by post

---

## `interactions`

Polymorphic user interactions with posts or comments.

| Field | Type | Notes |
|---|---|---|
| `user_id` | ObjectId → `User` | Required |
| `target_id` | ObjectId | Polymorphic — points to a Post or Comment |
| `target_model` | String enum | `Post` · `Comment` |
| `type` | String enum | `LIKE` · `BOOKMARK` · `REPOST` |

**Indexes:**
- `{ user_id, target_id, type }` — **unique compound** — prevents duplicate interactions

> `REPOST` type in this model is distinct from the `Post.original_post` self-reference; the actual repost document is a new `Post`. Reposts counted via `postRepository.countReposts()` query on `Post.original_post`.

---

## `follows`

Directed follow relationship between users.

| Field | Type | Notes |
|---|---|---|
| `follower_id` | ObjectId → `User` | The user who is following |
| `following_id` | ObjectId → `User` | The user being followed |

**Indexes:**
- `{ follower_id, following_id }` — **unique compound** — prevents duplicate follows

---

## `moderationqueues`

Queue of AI-flagged content pending human review.

| Field | Type | Notes |
|---|---|---|
| `target_id` | ObjectId (refPath) | Polymorphic — Post or Comment |
| `target_model` | String enum | `Post` · `Comment` |
| `reason` | String | E.g., `"AI Flagged as SPAM"` |
| `spam_score` | Number | Score from the AI at the time of flagging |
| `toxicity_score` | Number | Score from the AI at the time of flagging |
| `status` | String enum | `PENDING` · `REVIEWED` — default `PENDING` |

> Items whose `target_id` content has been deleted are filtered out in `ModerationService.getQueue()` before being returned to the admin.

---

## `moderationlogs`

Immutable audit trail of every moderation action.

| Field | Type | Notes |
|---|---|---|
| `moderator_id` | ObjectId → `User` | `null` when the action was taken by the AI automatically |
| `target_id` | ObjectId | Polymorphic |
| `target_model` | String enum | `Post` · `Comment` |
| `action` | String enum | `HIDE` · `DELETE` · `WARN` · `BAN` · `QUEUED` |
| `reason` | String | Required |

> `QUEUED` actions are written automatically by `comment.service` when the AI flags a comment. Post flagging currently only writes to the queue without a log entry.

---

## `reports`

User-submitted reports about specific content.

| Field | Type | Notes |
|---|---|---|
| `reporter_id` | ObjectId → `User` | Required |
| `target_id` | ObjectId (refPath) | Polymorphic |
| `target_model` | String enum | `Post` · `Comment` |
| `reason` | String | Required |
| `status` | String enum | `PENDING` · `RESOLVED` · `DISMISSED` — default `PENDING` |

---

## `appeals`

User appeals against AI moderation decisions.

| Field | Type | Notes |
|---|---|---|
| `user_id` | ObjectId → `User` | The appealing user |
| `target_id` | ObjectId (refPath) | The flagged Post or Comment |
| `target_model` | String enum | `Post` · `Comment` |
| `ai_label` | String enum | `SPAM` · `TOXIC` — the AI's original decision |
| `ai_spam_score` | Number | Original AI score at time of flagging |
| `ai_toxicity_score` | Number | Original AI score at time of flagging |
| `reason` | String | User's explanation (max 500 chars) |
| `status` | String enum | `PENDING` · `APPROVED` · `REJECTED` — default `PENDING` |
| `reviewed_by` | ObjectId → `User` | Admin who processed the appeal |
| `admin_note` | String | Admin's note to the user |

**Indexes:**
- `{ user_id: 1 }` — for fetching a user's own appeals
- `{ status: 1 }` — for admin pending-appeals view

> One appeal per user per content item is enforced in `appeal.service.createAppeal()` by checking for an existing document before creation.

---

## `notifications`

In-app notification feed. Supports both social (user→user) and system (AI→user, admin→user) notifications.

| Field | Type | Notes |
|---|---|---|
| `recipient` | ObjectId → `User` | Required |
| `sender` | ObjectId → `User` | `null` for system/AI notifications |
| `type` | String enum | `FOLLOW` · `LIKE` · `COMMENT` · `REPLY` · `REPOST` · `AI_MODERATION` · `APPEAL_RESOLVED` |
| `entity_id` | ObjectId | The referenced entity |
| `entity_model` | String enum | `Post` · `Comment` · `User` · `Appeal` |
| `metadata` | Object | Free-form JSON; used by AI_MODERATION to carry `ai_label`, `spam_score`, `toxicity_score`, `content_preview` |
| `is_read` | Boolean | Default `false` |

---

## `conversations`

1:1 direct-message threads between exactly two users.

| Field | Type | Notes |
|---|---|---|
| `participants` | ObjectId[] → `User` | Exactly 2 participants |
| `last_message` | ObjectId → `Message` | Updated on each new message |

**Indexes:**
- `{ participants: 1 }` — for finding a conversation by participants

> `conversationRepo.findOrCreate()` ensures only one conversation exists per user pair.

---

## `messages`

Individual messages within a conversation.

| Field | Type | Notes |
|---|---|---|
| `conversation_id` | ObjectId → `Conversation` | Indexed |
| `sender_id` | ObjectId → `User` | Required |
| `content` | String | Plain text; may be empty if message is media-only |
| `media` | Embedded array | `{ url, type: IMAGE|VIDEO }` |
| `is_read` | Boolean | Default `false` |
| `reactions` | Embedded array | `{ user_id, emoji }` — supports emoji reactions |

---

## Index Catalogue

| Collection | Index | Type | Purpose |
|---|---|---|---|
| `users` | `email` | Unique | Fast login lookup |
| `users` | `username` | Unique | Fast profile lookup |
| `posts` | `slug` | Unique | URL-based post retrieval |
| `posts` | `tags` | Regular | Tag-based feed filtering |
| `comments` | `post_id` | Regular | Comment listing by post |
| `interactions` | `{ user_id, target_id, type }` | Unique compound | Dedup interactions |
| `follows` | `{ follower_id, following_id }` | Unique compound | Dedup follows |
| `appeals` | `user_id` | Regular | User's own appeals list |
| `appeals` | `status` | Regular | Pending appeals queue |
| `conversations` | `participants` | Regular | Find/create conversation |
| `messages` | `conversation_id` | Regular | Message history lookup |
