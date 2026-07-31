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
      // H38: reject self/ghost conversations
      await messageService.validateRecipient(req.user.id, recipientId);
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
      const skip = Number(req.query.skip) || 0;
      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const messages = await messageService.getMessages(conversationId, req.user.id, skip, limit);
      res.status(200).json({ success: true, data: messages, meta: { skip, limit } });
    } catch (error) {
      next(error);
    }
  }

  async sendMessage(req, res, next) {
    try {
      const { recipientId, content } = req.body;
      let media = [];
      const uploadedPublicIds = [];
      
      if (req.files && req.files.length > 0) {
        const { uploadToCloudinary, destroyAssets } = require('../services/cloudinary.service');
        const uploaded = [];
        try {
          // H41: upload sequentially and track public_ids so a partial failure
          // cleans up already-uploaded assets (no orphaned media).
          for (const file of req.files) {
            const isVideo = file.mimetype.startsWith('video/');
            const result = await uploadToCloudinary(file.buffer, 'message_media', isVideo ? 'video' : 'image');
            uploadedPublicIds.push(result.public_id);
            uploaded.push({
              url: result.secure_url,
              type: isVideo ? 'VIDEO' : 'IMAGE'
            });
          }
          media = uploaded;
        } catch (error) {
          await destroyAssets(uploadedPublicIds);
          throw error;
        }
      }

      try {
        const message = await messageService.sendMessage(req.user.id, recipientId, content, media);
        return res.status(201).json({ success: true, data: message });
      } catch (error) {
        // C27: sendMessage failed AFTER a successful upload (DB error, validation,
        // etc.) — destroy the media uploaded for this request so nothing is
        // orphaned. H41 only handled upload-phase failures.
        if (uploadedPublicIds.length > 0) {
          const { destroyAssets } = require('../services/cloudinary.service');
          await destroyAssets(uploadedPublicIds);
        }
        throw error;
      }
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
      await messageService.deleteConversation(conversationId, req.user.id);
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
