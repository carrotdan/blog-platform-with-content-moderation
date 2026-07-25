# Security Model

---

## Authentication: JWT Dual-Token Strategy

The platform uses **two separate JWT tokens** — a short-lived access token and a long-lived refresh token — to balance security and user experience.

| Token | Default TTL | Secret env var | Carried in |
|---|---|---|---|
| Access token | `15m` | `JWT_ACCESS_SECRET` | `Authorization: Bearer <token>` header |
| Refresh token | `7d` | `JWT_REFRESH_SECRET` | Request body (`{ refreshToken }`) |

### Token Payload

```json
{
  "userId": "<MongoDB ObjectId>",
  "role": "USER | MODERATOR | ADMIN"
}
```

> **Note:** There are two slightly inconsistent payload shapes in the codebase. `auth.service.js` uses `{ userId, role }`, while `user.service.js` uses `{ id, role }`. The `authMiddleware` handles both: `decoded.userId || decoded.id`. This is a known inconsistency.

### Token Lifecycle

```
Login → issued accessToken (15 min) + refreshToken (7 days)
         │
         ▼
Client uses accessToken on every API request
         │
     (expires)
         ▼
Client calls POST /api/auth/refresh with refreshToken
         │
         ▼
New accessToken issued (refreshToken NOT rotated)
```

Refresh tokens are **not stored in the database** — there is no token blocklist or revocation mechanism. A stolen refresh token remains valid for its full 7-day window. Logging out is client-side only (discard both tokens).

---

## Authorization: Role-Based Access Control (RBAC)

Three roles exist in ascending privilege:

| Role | Default | Can do |
|---|---|---|
| `USER` | All registered users | Read content, create posts/comments, interact, message |
| `MODERATOR` | Assigned by admin | Same as USER + access moderation queue routes |
| `ADMIN` | Assigned by admin | Everything + `/api/admin/*` routes |

### Auth Middleware Variants

**`authMiddleware` / `authenticate`** — Used on routes that require a logged-in user.

- Reads `Authorization: Bearer <token>` header
- Verifies signature against `JWT_ACCESS_SECRET`
- Attaches `{ id, role }` to `req.user`
- Returns `401` on missing, malformed, or expired token

**`optionalAuthenticate`** — Used on public routes where auth enriches the response (e.g., feed shows isLiked/isBookmarked when logged in).

- Same as `authenticate` but on any error, calls `next()` instead of `401`
- `req.user` is `undefined` for guest requests

**`authorize(roles[])`** — Applied after `authenticate` for RBAC.

- Checks `req.user.role` is in the allowed roles array
- Returns `403` on role mismatch
- Example: `authorize('ADMIN')` protects all `/api/admin` routes

---

## Account-Status Enforcement: `checkStatus` Middleware

Because the JWT payload embeds `role` but not `status`, a user could be banned after their token was issued and their token would still be valid. The `checkStatus` middleware performs a **live database lookup** on each request to enforce the current account status.

```
Request arrives with valid JWT
        │
        ▼
authMiddleware: token verified, req.user set
        │
        ▼
checkStatus: looks up User by req.user.id in MongoDB
        │
    status?
   ┌────┴───────────────┐
BANNED              MUTED
   │                    │
  403              req.method in
(all methods)    POST/PUT/DELETE/PATCH?
                   │         │
                  Yes        No
                   │         │
                  403    next() (read-only ok)
```

**Trade-off:** `checkStatus` adds a MongoDB query to every protected write route. This is intentional to ensure bans take effect immediately without waiting for token expiry.

`checkStatus` is applied on:
- `POST /api/posts` (create post)
- `PUT /api/posts/:id`, `DELETE /api/posts/:id`
- `GET /api/posts/me/posts`, `GET /api/posts/me/bookmarks`
- `POST /api/posts/:id/repost`
- `POST /api/comments`

---

## Password Security

- Passwords are hashed with **bcrypt** (salt rounds: 10) before storage.
- The raw password is never stored or logged.
- Login compares the submitted password against the stored hash using `bcrypt.compare()`.
- Password reset functionality does not exist in the current implementation.

---

## CORS Configuration

```javascript
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
```

- Only the single origin specified by `CLIENT_URL` is allowed.
- `credentials: true` allows cookies if used in the future (currently not used — auth is header-based).
- Socket.IO in development uses `cors: { origin: '*' }`, which is more permissive and should be tightened for production.

---

## Media Upload Security

File uploads go through the `upload` middleware (Multer):

- **Storage:** memory storage (files buffered in RAM, not written to disk by Multer)
- **Allowed MIME types:** `image/*` and `video/*` only — other types return a 400 error
- **Size limit:** 100 MB per file
- **Upload target:** Cloudinary (if `CLOUDINARY_API_KEY` is set) or local `uploads/` directory as fallback
- Up to 10 files per post creation request

**Cloudinary fallback risk:** If Cloudinary credentials are missing, files are written to `uploads/` at a predictable URL (`http://localhost:5000/uploads/media_{timestamp}_{index}.ext`). This is suitable for local development but not production.

---

## Soft Delete

Users can be soft-deleted:

- `isDeleted: true` and `deleted_at` timestamp are set
- `AuthService.login()` blocks login for soft-deleted accounts: `if (user.isDeleted || user.deleted_at) throw new Error('Account has been deleted')`
- Soft-deleted users are NOT filtered from general queries in the current implementation — their posts and comments remain visible

---

## Guest Access Restrictions

Unauthenticated users (guests) can:
- View the public post feed (limited to **5 posts**, no pagination)
- View individual public posts and their comments
- View user profiles

Guests cannot:
- Create posts, comments, or any content
- Like, bookmark, or interact with content
- Access their own bookmarks or post history
- Send messages
- Receive notifications

The 5-post guest limit is enforced in `PostController.listPosts()`:
```javascript
if (!isAuthenticated) {
  limit = 5;
  skip = 0;
  isLimited = true;
}
```

---

## Known Security Limitations

1. **No refresh token revocation.** Logout is purely client-side. Refresh tokens cannot be invalidated server-side.
2. **No rate limiting.** There is no throttling on login, registration, AI calls, or any other endpoint.
3. **No input sanitization beyond HTML stripping.** The AI receives HTML-stripped text, but no additional XSS sanitization is applied to stored `content_html`.
4. **Admin routes check role but not ownership.** Any ADMIN can modify any user or post.
5. **Inconsistent JWT payload structure** between `auth.service.js` and `user.service.js` (see above) — could cause issues if routes serve tokens from both sources.
