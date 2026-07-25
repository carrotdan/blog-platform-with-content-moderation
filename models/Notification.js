const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null = system notification
    type: {
      type: String,
      enum: ['FOLLOW', 'LIKE', 'COMMENT', 'REPLY', 'REPOST', 'AI_MODERATION', 'APPEAL_RESOLVED'],
      required: true
    },
    entity_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    entity_model: { type: String, enum: ['Post', 'Comment', 'User', 'Appeal'], required: true },
    // Extra metadata for AI moderation notifications
    metadata: { type: Object, default: {} },
    is_read: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
