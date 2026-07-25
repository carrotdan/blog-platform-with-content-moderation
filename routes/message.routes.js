const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const { authenticate, checkStatus } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

router.use(authenticate);
router.use(checkStatus);

router.get('/conversations', messageController.getConversations);
router.post('/conversations', messageController.getOrCreateConversation);
router.get('/unread-count', messageController.getUnreadCount);
router.get('/:conversationId', messageController.getMessages);
router.delete('/:conversationId', messageController.deleteConversation);
router.post('/send', upload.array('media', 10), messageController.sendMessage);
router.post('/:messageId/react', messageController.reactToMessage);

module.exports = router;

