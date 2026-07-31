const mongoose = require('mongoose');

const appealSchema = new mongoose.Schema(
  {
    // User who submitted the appeal
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Flagged content (Post or Comment)
    target_id: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'target_model' },
    target_model: { type: String, enum: ['Post', 'Comment'], required: true },

    // Reason the AI flagged the content
    ai_label: { type: String, enum: ['SPAM', 'TOXIC', 'AI_UNAVAILABLE'], required: true },
    ai_spam_score: { type: Number, default: 0 },
    ai_toxicity_score: { type: Number, default: 0 },

    // User's appeal reason
    reason: { type: String, required: true, maxlength: 500 },

    // Processing status
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING'
    },

    // Admin who reviewed the appeal
    reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    admin_note: { type: String, default: '' }
  },
  { timestamps: true }
);

appealSchema.index({ user_id: 1, createdAt: -1 });
appealSchema.index({ status: 1, createdAt: -1 });
appealSchema.index({ target_model: 1, target_id: 1 });
appealSchema.index({ reviewed_by: 1, createdAt: -1 });

module.exports = mongoose.model('Appeal', appealSchema);
