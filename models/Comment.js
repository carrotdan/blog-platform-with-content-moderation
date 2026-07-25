const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    post_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
    depth: { type: Number, default: 0 },
    content: { type: String, required: true },
    
    // AI Moderation Fields
    spam_score: { type: Number, default: 0 },
    toxicity_score: { type: Number, default: 0 },
    label: { type: String, enum: ['NORMAL', 'SPAM', 'TOXIC'], default: 'NORMAL' },
    is_hidden: { type: Boolean, default: false },
    is_sensitive: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Indexing for faster lookups by post
commentSchema.index({ post_id: 1 });

module.exports = mongoose.model('Comment', commentSchema);
