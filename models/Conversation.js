const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  // M29: Deterministic sorted key (e.g. "a_b_c") guaranteeing one conversation
  // per unique set of participants, even under concurrent findOrCreate calls.
  participant_key: { type: String, required: true, unique: true },
  last_message: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }
}, {
  timestamps: true
});

// Support the common "all conversations for a user" query
conversationSchema.index({ participants: 1 });
conversationSchema.index({ participant_key: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
