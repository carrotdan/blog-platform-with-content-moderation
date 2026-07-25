const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversation_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  sender_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    trim: true,
    default: ''
  },
  media: [{
    url: String,
    type: { type: String, enum: ['IMAGE', 'VIDEO'] }
  }],
  is_read: {
    type: Boolean,
    default: false
  },
  reactions: [{
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: String
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Message', messageSchema);


