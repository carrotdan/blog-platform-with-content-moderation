const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    target_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    target_model: { type: String, enum: ['Post', 'Comment'], required: true },
    type: { type: String, enum: ['LIKE', 'BOOKMARK', 'REPOST'], required: true }
  },
  { timestamps: true }
);

// Unique index to prevent duplicate interactions
interactionSchema.index({ user_id: 1, target_id: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Interaction', interactionSchema);
