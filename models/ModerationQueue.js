const mongoose = require('mongoose');

const moderationQueueSchema = new mongoose.Schema(
  {
    target_id: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'target_model' },
    target_model: { type: String, enum: ['Post', 'Comment'], required: true },
    target_type: { type: String, enum: ['SPAM', 'TOXIC', 'AI_UNAVAILABLE'], required: true },
    reason: { type: String, required: true },
    spam_score: { type: Number, default: 0 },
    toxicity_score: { type: Number, default: 0 },
    status: { type: String, enum: ['PENDING', 'REVIEWED'], default: 'PENDING' },
    reporter_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ModerationQueue', moderationQueueSchema);
