const mongoose = require('mongoose');

const moderationLogSchema = new mongoose.Schema(
  {
    moderator_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Null if AI action
    target_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    target_model: { type: String, enum: ['Post', 'Comment'], required: true },
    action: { type: String, enum: ['HIDE', 'DELETE', 'WARN', 'BAN', 'QUEUED'], required: true },
    reason: { type: String, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ModerationLog', moderationLogSchema);
