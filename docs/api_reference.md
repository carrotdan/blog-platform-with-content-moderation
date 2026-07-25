# API Reference

All routes are prefixed with `/api`. The backend runs on port `5000` by default.

**Auth notation used in tables:**
- `—` = public (no token required)
- `optional` = token accepted if provided, guest mode if absent
- `auth` = valid access token required (`Authorization: Bearer <token>`)
- `auth + status` = auth + `checkStatus` middleware (BANNED/MUTED users blocked on writes)
- `admin` = auth + role must be `ADMIN`

---

## Authentication — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | — | Register a new user. Body: `{ email, password, username }` |
| `POST` | `/auth/login` | — | Login. Body: `{ email, password }`. Returns `{ accessToken, refreshToken, user }` |
| `POST` | `/auth/refresh` | — | Refresh access token. Body: `{ refreshToken }` |

> The auth controller (`auth.controller.js`) delegates to `AuthService` which issues HMAC-signed JWTs. The `auth.service.js` and `user.service.js` each have independent implementations of register/login; `auth.routes.js` uses `auth.controller.js` which calls `auth.service.js`.

---

## Users — `/api/users`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/users/:id` | optional | Get user profile by MongoDB ID |
| `GET` | `/users/username/:username` | optional | Get user profile by username |
| `PUT` | `/users/profile` | auth | Update own profile. Body: `{ username?, bio?, avatar? }` |
| `POST` | `/users/avatar` | auth | Upload avatar image (multipart/form-data, field: `avatar`) |
| `GET` | `/users/suggestions` | auth | Get follow suggestions (users not yet followed) |

---

## Posts — `/api/posts`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/posts` | optional | List public posts. Query: `skip`, `limit`, `tag`. Guests limited to 5 posts |
| `GET` | `/posts/me/posts` | auth + status | Get own posts (all visibility states) |
| `GET` | `/posts/me/bookmarks` | auth + status | Get bookmarked posts in bookmark order |
| `GET` | `/posts/:id` | optional | Get single post by ID (with likesCount, bookmarksCount, etc.) |
| `GET` | `/posts/:id/content` | auth | Get post content even if HIDDEN (for appeal preview) |
| `GET` | `/posts/slug/:slug` | optional | Get post by URL slug |
| `POST` | `/posts` | auth + status | Create post. Multipart form: `content_html`, `content_json`, `title`, `tags` (CSV), `visibility`, `media[]` (up to 10 files, max 100 MB each). **AI moderation runs here.** |
| `POST` | `/posts/:id/repost` | auth + status | Toggle repost of a post. Creates or deletes a repost Post document |
| `PUT` | `/posts/:id` | auth + status | Update own post. Body: `{ title?, content_html?, content_json?, tags? }` |
| `DELETE` | `/posts/:id` | auth + status | Delete own post |

**Post enrichment:** Single post and list responses include computed fields `likesCount`, `bookmarksCount`, `sharesCount`, `isLiked`, `isBookmarked`, `isReposted` (latter three only when authenticated).

---

## Comments — `/api/comments`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/comments/:post_id` | — | List top-level comments for a post. Query: `skip`, `limit` |
| `POST` | `/comments` | auth | Create a comment. Body: `{ post_id, content, parent_id? }`. **AI moderation runs here.** |
| `DELETE` | `/comments/:id` | auth | Delete own comment |

---

## Interactions — `/api/interactions`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/interactions/like` | auth | Toggle like on a post or comment. Body: `{ target_id, target_model }` |
| `POST` | `/interactions/bookmark` | auth | Toggle bookmark on a post. Body: `{ target_id, target_model }` |
| `GET` | `/interactions/check` | auth | Check like/bookmark status for a target. Query: `target_id`, `type` |

---

## Follows — `/api/follows`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/follows/:id` | auth | Toggle follow on a user |
| `GET` | `/follows/:id/followers` | auth | Get followers of a user |
| `GET` | `/follows/:id/following` | auth | Get users a user is following |
| `GET` | `/follows/:id/stats` | auth | Get `{ followersCount, followingCount }` |
| `GET` | `/follows/:id/is-following` | auth | Returns `{ isFollowing: bool }` |

---

## Notifications — `/api/notifications`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/notifications` | auth | Get own notifications. Query: `skip`, `limit` (default 20) |
| `PUT` | `/notifications/:id/read` | auth | Mark a single notification as read |
| `PUT` | `/notifications/read-all` | auth | Mark all notifications as read |
| `DELETE` | `/notifications/:id` | auth | Delete a single notification |

---

## Moderation Queue — `/api/moderation`

Accessible to `ADMIN` and `MODERATOR` roles.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/moderation/queue` | auth | List PENDING queue items (deleted targets filtered out) |
| `PUT` | `/moderation/:id/approve` | auth | Approve flagged content (restore visibility) |
| `PUT` | `/moderation/:id/hide` | auth | Confirm hide (content stays HIDDEN) |
| `PUT` | `/moderation/:id/warn` | auth | Mark content as sensitive (is_sensitive = true) |

---

## Admin — `/api/admin`

All routes require role `ADMIN`. Protected by `authenticate + authorize('ADMIN')`.

### Users
| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/users` | All users sorted by creation date |
| `PUT` | `/admin/users/:id/role` | Change role. Body: `{ role }` |
| `PUT` | `/admin/users/:id/mute` | Set status → MUTED |
| `PUT` | `/admin/users/:id/ban` | Set status → BANNED |
| `PUT` | `/admin/users/:id/reset-score` | Reset violation counts and status → ACTIVE |
| `GET` | `/admin/violations` | All users sorted by violationScore descending |

### Posts
| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/posts` | All posts with author info, newest first |
| `PUT` | `/admin/posts/:id/hide` | Force visibility → HIDDEN |
| `PUT` | `/admin/posts/:id/unhide` | Force visibility → PUBLIC |
| `PUT` | `/admin/posts/:id/mark-sensitive` | Set is_sensitive → true |
| `PUT` | `/admin/posts/:id/unmark-sensitive` | Set is_sensitive → false |
| `DELETE` | `/admin/posts/:id` | Hard delete a post |

### Reports
| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/reports` | Pending reports with target content preview |
| `PUT` | `/admin/reports/:id/resolve` | Resolve report. Body: `{ action: "HIDE" | "MARK_SENSITIVE" | "DISMISS" }` |

---

## Reports — `/api/reports`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/reports` | auth | Submit a report. Body: `{ target_id, target_model, reason }` |

---

## Appeals — `/api/appeals`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/appeals` | auth | Submit an appeal. Body: `{ target_id, target_model, ai_label, ai_spam_score, ai_toxicity_score, reason }` |
| `GET` | `/appeals/me` | auth | Get own appeals |
| `GET` | `/appeals` | admin | Get all appeals |
| `GET` | `/appeals/pending` | admin | Get pending appeals only |
| `PUT` | `/appeals/:id/approve` | admin | Approve appeal + restore content. Body: `{ admin_note? }` |
| `PUT` | `/appeals/:id/reject` | admin | Reject appeal. Body: `{ admin_note? }` |

---

## Messages — `/api/messages`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/messages` | auth | Send a message. Body: `{ recipient_id, content, media? }`. Creates conversation if needed |
| `GET` | `/messages/conversations` | auth | List own conversations (with last_message and participant info) |
| `GET` | `/messages/conversations/:id` | auth | Get messages in a conversation (marks messages as read) |
| `POST` | `/messages/:id/react` | auth | Toggle emoji reaction on a message. Body: `{ emoji }` |
| `DELETE` | `/messages/conversations/:id` | auth | Delete conversation and all its messages |

---

## Standard Response Envelope

All endpoints respond with a consistent JSON shape:

```json
{
  "success": true,
  "message": "Human-readable description",
  "data": { ... }
}
```

On error (handled by `errorMiddleware`):

```json
{
  "success": false,
  "message": "Error description",
  "data": null
}
```

HTTP status codes follow REST conventions: `200` OK, `201` Created, `400` Bad Request, `401` Unauthorized, `403` Forbidden, `404` Not Found, `500` Internal Server Error.
