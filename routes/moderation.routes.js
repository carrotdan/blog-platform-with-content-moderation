const express = require('express');
const router = express.Router();
const moderationController = require('../controllers/moderation.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.post('/report', authenticate, moderationController.reportContent);
router.post('/log', authenticate, authorize(['MODERATOR', 'ADMIN']), moderationController.logAction);

router.get('/queue', authenticate, authorize(['MODERATOR', 'ADMIN']), moderationController.getQueue);
router.put('/approve/:id', authenticate, authorize(['MODERATOR', 'ADMIN']), moderationController.approveItem);
router.put('/hide/:id', authenticate, authorize(['MODERATOR', 'ADMIN']), moderationController.hideItem);
router.put('/warn/:id', authenticate, authorize(['MODERATOR', 'ADMIN']), moderationController.warnItem);

module.exports = router;
