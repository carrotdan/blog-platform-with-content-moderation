const Message = require('../models/Message');

class MessageRepository {
  async create(data) {
    return Message.create(data);
  }

  async findByConversation(conversationId, limit = 50, skip = 0) {
    return Message.find({ conversation_id: conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  async markAsRead(conversationId, userId) {
    return Message.updateMany(
      { conversation_id: conversationId, sender_id: { $ne: userId }, is_read: false },
      { $set: { is_read: true } }
    );
  }
}

module.exports = new MessageRepository();
