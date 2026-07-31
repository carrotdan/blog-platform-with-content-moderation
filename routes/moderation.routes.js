const express = require('express');
const router = express.Router();
const moderationController = require('../controllers/moderation.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { idParamSchema } = require('../validators/schemas');

router.post('/report', authenticate, moderationController.reportContent);
router.post('/log', authenticate, authorize(['MODERATOR', 'ADMIN']), moderationController.logAction);

router.get('/queue', authenticate, authorize(['MODERATOR', 'ADMIN']), moderationController.getQueue);
router.put('/approve/:id', authenticate, authorize(['MODERATOR', 'ADMIN']), validate(idParamSchema), moderationController.approveItem);
router.put('/hide/:id', authenticate, authorize(['MODERATOR', 'ADMIN']), validate(idParamSchema), moderationController.hideItem);
router.put('/warn/:id', authenticate, authorize(['MODERATOR', 'ADMIN']), validate(idParamSchema), moderationController.warnItem);

module.exports = router;
