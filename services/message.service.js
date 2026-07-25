const conversationRepo = require('../repositories/conversation.repo');
const messageRepo = require('../repositories/message.repo');
const socketService = require('./socket.service');

class MessageService {
  async sendMessage(senderId, recipientId, content, media = []) {
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

  async getMessages(conversationId, userId) {
    // Check if user is part of conversation
    const conversation = await conversationRepo.findById(conversationId);
    if (!conversation) throw new Error('Conversation not found');
    
    const isParticipant = conversation.participants.some(p => p._id.toString() === userId.toString());
    if (!isParticipant) throw new Error('Unauthorized');

    await messageRepo.markAsRead(conversationId, userId);
    return messageRepo.findByConversation(conversationId);
  }

  async deleteConversation(conversationId) {
    const Message = require('../models/Message');
    const Conversation = require('../models/Conversation');
    await Message.deleteMany({ conversation_id: conversationId });
    await Conversation.findByIdAndDelete(conversationId);
    return true;
  }

  async reactToMessage(messageId, userId, emoji) {
    const Message = require('../models/Message');
    const message = await Message.findById(messageId);
    if (!message) throw new Error('Message not found');

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
