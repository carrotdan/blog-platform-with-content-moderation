const conversationRepo = require('../repositories/conversation.repo');
const messageRepo = require('../repositories/message.repo');
const socketService = require('./socket.service');

class MessageService {
  // H38: a conversation/message recipient must exist and differ from the sender,
  // otherwise ghost/self conversations are created.
  async validateRecipient(senderId, recipientId) {
    if (!recipientId) throw this._httpError('Recipient is required', 400);
    if (senderId.toString() === recipientId.toString()) {
      throw this._httpError('Cannot message yourself', 400);
    }
    const User = require('../models/User');
    const recipient = await User.findOne({ _id: recipientId, isDeleted: false }).select('_id');
    if (!recipient) throw this._httpError('Recipient not found', 404);
    return recipient;
  }

  async sendMessage(senderId, recipientId, content, media = []) {
    await this.validateRecipient(senderId, recipientId);

    // M40: a message must carry content or at least one media item — otherwise
    // an empty message row is persisted.
    const hasContent = !!(content && String(content).trim());
    const hasMedia = Array.isArray(media) && media.length > 0;
    if (!hasContent && !hasMedia) {
      throw this._httpError('Message content is required', 400);
    }

    const conversation = await conversationRepo.findOrCreate([senderId, recipientId]);
    
    const message = await messageRepo.create({
      conversation_id: conversation._id,
      sender_id: senderId,
      content,
      media
    });

    await conversationRepo.updateLastMessage(conversation._id, message._id);

    // Socket emit to recipient
    socketService.sendToUser(recipientId, 'new_message', {
      conversation_id: conversation._id,
      message
    });

    return message;
  }

  async getConversations(userId) {
    return conversationRepo.findByUser(userId);
  }

  async getMessages(conversationId, userId, skip = 0, limit = 50) {
    // Check if user is part of conversation
    const conversation = await conversationRepo.findById(conversationId);
    if (!conversation) throw this._httpError('Conversation not found', 404);
    
    const isParticipant = conversation.participants.some(p => p._id.toString() === userId.toString());
    if (!isParticipant) throw this._httpError('Unauthorized', 403);

    await messageRepo.markAsRead(conversationId, userId);
    return messageRepo.findByConversation(conversationId, limit, skip);
  }

  _httpError(message, statusCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  }

  async _assertParticipant(conversation, userId) {
    if (!conversation) throw this._httpError('Conversation not found', 404);
    const isParticipant = conversation.participants.some(p => p._id.toString() === userId.toString());
    if (!isParticipant) throw this._httpError('Unauthorized', 403);
  }

  async deleteConversation(conversationId, userId) {
    const Message = require('../models/Message');
    const Conversation = require('../models/Conversation');
    const conversation = await conversationRepo.findById(conversationId);
    await this._assertParticipant(conversation, userId);
    await Message.deleteMany({ conversation_id: conversationId });
    await Conversation.findByIdAndDelete(conversationId);
    return true;
  }

  async reactToMessage(messageId, userId, emoji) {
    const Message = require('../models/Message');
    const message = await Message.findById(messageId);
    if (!message) throw this._httpError('Message not found', 404);

    const conversation = await conversationRepo.findById(message.conversation_id);
    await this._assertParticipant(conversation, userId);

    const existingReactionIndex = message.reactions.findIndex(r => r.user_id.toString() === userId.toString());
    
    if (existingReactionIndex > -1) {
      if (message.reactions[existingReactionIndex].emoji === emoji) {
        message.reactions.splice(existingReactionIndex, 1);
      } else {
        message.reactions[existingReactionIndex].emoji = emoji;
      }
    } else {
      message.reactions.push({ user_id: userId, emoji });
    }

    await message.save();
    return message;
  }
}

module.exports = new MessageService();
