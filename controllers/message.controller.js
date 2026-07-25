const messageService = require('../services/message.service');

class MessageController {
  async getConversations(req, res, next) {
    try {
      const conversations = await messageService.getConversations(req.user.id);
      res.status(200).json({ success: true, data: conversations });
    } catch (error) {
      next(error);
    }
  }

  async getOrCreateConversation(req, res, next) {
    try {
      const { recipientId } = req.body;
      const conversationRepo = require('../repositories/conversation.repo');
      const conversation = await conversationRepo.findOrCreate([req.user.id, recipientId]);
      res.status(200).json({ success: true, data: conversation });
    } catch (error) {
      next(error);
    }
  }

  async getMessages(req, res, next) {
    try {
      const { conversationId } = req.params;
      const messages = await messageService.getMessages(conversationId, req.user.id);
      res.status(200).json({ success: true, data: messages });
    } catch (error) {
      next(error);
    }
  }

  async sendMessage(req, res, next) {
    try {
      const { recipientId, content } = req.body;
      let media = [];
      
      if (req.files && req.files.length > 0) {
        const cloudinaryService = require('../services/cloudinary.service');
        const uploadPromises = req.files.map(file => cloudinaryService.uploadFile(file));
        media = await Promise.all(uploadPromises);
      }

      const message = await messageService.sendMessage(req.user.id, recipientId, content, media);
      res.status(201).json({ success: true, data: message });
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req, res, next) {
    try {
      const messageRepo = require('../repositories/message.repo');
      const Message = require('../models/Message');
      
      const conversationRepo = require('../repositories/conversation.repo');
      const convs = await conversationRepo.findByUser(req.user.id);
      const convIds = convs.map(c => c._id);
      
      const unreadCount = await Message.countDocuments({
        conversation_id: { $in: convIds },
        sender_id: { $ne: req.user.id },
        is_read: false
      });

      res.status(200).json({ success: true, data: { count: unreadCount } });
    } catch (error) {
      next(error);
    }
  }

  async deleteConversation(req, res, next) {
    try {
      const { conversationId } = req.params;
      await messageService.deleteConversation(conversationId);
      res.status(200).json({ success: true, message: 'Conversation deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async reactToMessage(req, res, next) {
    try {
      const { messageId } = req.params;
      const { emoji } = req.body;
      const message = await messageService.reactToMessage(messageId, req.user.id, emoji);
      
      // Optionally emit to socket
      const socketService = require('../services/socket.service');
      const conversationRepo = require('../repositories/conversation.repo');
      const conv = await conversationRepo.findById(message.conversation_id);
      if (conv) {
        const recipient = conv.participants.find(p => p._id.toString() !== req.user.id.toString());
        if (recipient) {
          socketService.sendToUser(recipient._id, 'message_reaction', { messageId, emoji, userId: req.user.id, conversationId: conv._id });
        }
      }

      res.status(200).json({ success: true, data: message });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MessageController();
