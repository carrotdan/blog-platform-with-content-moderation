const mongoose = require('mongoose');

const appealSchema = new mongoose.Schema(
  {
    // Người gửi kháng cáo
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Nội dung bị flag (Post hoặc Comment)
    target_id: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'target_model' },
    target_model: { type: String, enum: ['Post', 'Comment'], required: true },

    // Lý do AI flag
    ai_label: { type: String, enum: ['SPAM', 'TOXIC'], required: true },
    ai_spam_score: { type: Number, default: 0 },
    ai_toxicity_score: { type: Number, default: 0 },

    // Lý do kháng cáo của user
    reason: { type: String, required: true, maxlength: 500 },

    // Trạng thái xử lý
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING'
    },

    // Admin xử lý
    reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    admin_note: { type: String, default: '' }
  },
  { timestamps: true }
);

appealSchema.index({ user_id: 1 });
appealSchema.index({ status: 1 });

module.exports = mongoose.model('Appeal', appealSchema);
