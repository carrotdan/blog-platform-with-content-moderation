# Real-Time Communication and Notifications

The platform uses **Socket.IO 4** for real-time push delivery of notifications and direct messages. All notification events are also persisted to MongoDB, so clients can hydrate their state on mount even if they were offline when the event occurred.

---

## Socket.IO Setup

The Socket.IO server is **co-hosted with the Express app** on port 5000 using a shared `http.Server` instance:

```javascript
// app.js
const http = require('http');
const server = http.createServer(app);
socketService.init(server);   // attaches Socket.IO to same server
server.listen(PORT, ...);
```

**CORS config:** The Socket.IO instance is configured with `cors: { origin: '*' }` in development. This is intentionally permissive for local dev and should be restricted in production.

---

## User Room Pattern

Socket.IO uses named rooms to deliver events to specific users without broadcasting to everyone.

**Client-side join (frontend must call this after connecting):**
```javascript
socket.emit('join_user_room', userId);
```

**Server-side:**
```javascript
socket.on('join_user_room', (userId) => {
  socket.join(userId.toString());
});
```

All targeted emissions use `io.to(userId.toString()).emit(...)`. A user ID doubles as their room name. If a user has multiple open tabs/devices, all will receive the event.

---

## Events Emitted by the Server

### `new_notification`

**Emitted to:** the notification recipient's room.

**Payload:**
```json
{
  "message": "Human-readable notification string",
  "notification": { /* full Notification document, sender populated */ },
  "isSystem": true  // only present on system notifications
}
```

**Triggered by:** `NotificationService.sendNotification()` (social events) and `NotificationService.sendSystemNotification()` (AI/admin system events).

---

### `new_message`

**Emitted to:** the message recipient's room.

**Payload:**
```json
{
  "conversation_id": "...",
  "message": { /* full Message document */ }
}
```

**Triggered by:** `MessageService.sendMessage()` on every sent DM.

---

### `new_post`

**Emitted to:** all connected clients (global broadcast via `io.emit`).

**Payload:** The full new Post document.

**Triggered by:** `PostController.createPost()` — only when the new post's `visibility` is `PUBLIC` (i.e., not HIDDEN by the AI).

---

## Notification Types

All notifications are persisted in the `notifications` collection regardless of whether the target user is connected.

| Type | Sender | Trigger | entity_model |
|---|---|---|---|
| `FOLLOW` | The follower | User follows another user | `User` |
| `LIKE` | The liker | User likes a post | `Post` |
| `COMMENT` | The commenter | User comments on a post | `Comment` |
| `REPLY` | The replier | User replies to a comment | `Comment` |
| `REPOST` | The reposter | User reposts a post | `Post` |
| `AI_MODERATION` | `null` (system) | AI flags content as SPAM or TOXIC | `Post` or `Comment` |
| `APPEAL_RESOLVED` | `null` (system) | Admin approves or rejects an appeal | `Appeal` |

### Social Notification Messages

Generated in `NotificationService.sendNotification()`:

| Type | Message template |
|---|---|
| `LIKE` | `"{username} đã thích bài viết của bạn"` |
| `COMMENT` | `"{username} đã bình luận bài viết của bạn"` |
| `FOLLOW` | `"{username} đã bắt đầu theo dõi bạn"` |
| `REPOST` | `"{username} đã chia sẻ bài viết của bạn"` |
| `REPLY` | `"{username} đã trả lời bình luận của bạn"` |

### System Notification Messages

Generated in `NotificationService.sendSystemNotification()` (all in Vietnamese):

| Type + metadata | Message |
|---|---|
| `AI_MODERATION` + SPAM post | `"⚠️ bài viết của bạn bị hệ thống AI phát hiện là SPAM và đã bị ẩn. Bạn có thể gửi kháng cáo..."` |
| `AI_MODERATION` + TOXIC post | `"⚠️ bài viết của bạn bị hệ thống AI phát hiện chứa nội dung TOXIC và đã bị ẩn..."` |
| `AI_MODERATION` + SPAM comment | Same as above but "bình luận" instead of "bài viết" |
| `APPEAL_RESOLVED` + APPROVED | `"✅ Kháng cáo của bạn đã được CHẤP NHẬN. Nội dung đã được khôi phục."` |
| `APPEAL_RESOLVED` + REJECTED | `"❌ Kháng cáo của bạn đã bị TỪ CHỐI. {admin_note}"` |

### AI Moderation Notification Metadata

The `metadata` field on `AI_MODERATION` notifications contains:

```json
{
  "ai_label": "SPAM",
  "target_model": "Post",
  "spam_score": 0.87,
  "toxicity_score": 0.12,
  "content_preview": "First 300 characters of the original content..."
}
```

This gives the user enough context to understand why they were flagged and to decide whether to appeal, without needing to look up the hidden content themselves.

---

## Notification Persistence and Delivery Guarantee

The system uses a **fire-and-persist** model:

1. The notification is first written to MongoDB (`notificationRepository.create()`).
2. Then pushed over Socket.IO (`socketService.sendNotification()`).

If the Socket.IO push fails (e.g., the user is offline), the notification is still in the database. The frontend fetches all notifications on mount via `GET /api/notifications`, so the user sees it on next login.

**There is no delivery confirmation or retry logic.** Socket.IO is treated as a best-effort push layer, not a reliable message queue.

---

## Client Integration Notes

- The frontend must call `socket.emit('join_user_room', userId)` immediately after authentication to receive targeted events.
- The `NotificationBell` component (`frontend/components/NotificationBell.jsx`) polls on mount and listens for `new_notification` events to update the bell badge in real time.
- `socketService.getIO()` returns `null` if called before `socketService.init()` runs — all emission calls guard against this with `if (io)` checks.
