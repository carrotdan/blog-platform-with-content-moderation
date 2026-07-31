const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const messageController = require('../controllers/message.controller');
const { authenticate, checkStatus } = require('../middlewares/auth.middleware');
const { upload, validateFileSize } = require('../middlewares/upload.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { conversationIdParamSchema, messageIdParamSchema, conversationMessagesSchema, sendMessageSchema } = require('../validators/schemas');

router.use(authenticate);
router.use(checkStatus);

// H44: message routes were previously unlimited — an authenticated user could
// flood a victim's inbox or create unbounded conversations. Rate limits now
// match the interaction/follow/report limiters.
const messageSendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many messages sent, please try again after 1 minute' },
  standardHeaders: true,
  legacyHeaders: false
});

const conversationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many requests, please try again after 1 minute' },
  standardHeaders: true,
  legacyHeaders: false
});

router.get('/conversations', messageController.getConversations);
router.post('/conversations', conversationLimiter, messageController.getOrCreateConversation);
router.get('/unread-count', messageController.getUnreadCount);
router.get('/:conversationId', validate(conversationMessagesSchema), messageController.getMessages);
router.delete('/:conversationId', validate(conversationIdParamSchema), messageController.deleteConversation);
router.post('/send', messageSendLimiter, upload.array('media', 10), validateFileSize, validate(sendMessageSchema), messageController.sendMessage);
router.post('/:messageId/react', messageSendLimiter, validate(messageIdParamSchema), messageController.reactToMessage);

module.exports = router;

