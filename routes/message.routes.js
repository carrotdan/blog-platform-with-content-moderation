const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const { authenticate, checkStatus } = require('../middlewares/auth.middleware');
const { upload, validateFileSize } = require('../middlewares/upload.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { conversationIdParamSchema, messageIdParamSchema } = require('../validators/schemas');

router.use(authenticate);
router.use(checkStatus);

router.get('/conversations', messageController.getConversations);
router.post('/conversations', messageController.getOrCreateConversation);
router.get('/unread-count', messageController.getUnreadCount);
router.get('/:conversationId', validate(conversationIdParamSchema), messageController.getMessages);
router.delete('/:conversationId', validate(conversationIdParamSchema), messageController.deleteConversation);
router.post('/send', upload.array('media', 10), validateFileSize, messageController.sendMessage);
router.post('/:messageId/react', validate(messageIdParamSchema), messageController.reactToMessage);

module.exports = router;

