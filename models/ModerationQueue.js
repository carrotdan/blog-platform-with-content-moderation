const mongoose = require('mongoose');

const moderationQueueSchema = new mongoose.Schema(
  {
    target_id: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'target_model' },
    target_model: { type: String, enum: ['Post', 'Comment'], required: true },
    reason: { type: String, required: true }, // e.g. "AI Flagged as SPAM"
    spam_score: { type: Number, default: 0 },
    toxicity_score: { type: Number, default: 0 },
    status: { type: String, enum: ['PENDING', 'REVIEWED'], default: 'PENDING' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ModerationQueue', moderationQueueSchema);
