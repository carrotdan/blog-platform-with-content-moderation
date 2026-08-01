const express = require('express');
const router = express.Router();
const moderationController = require('../controllers/moderation.controller');
const { authenticate, authorize, checkStatus } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { idParamSchema, paginationSchema } = require('../validators/schemas');

router.post('/log', authenticate, checkStatus, authorize(['MODERATOR', 'ADMIN']), moderationController.logAction);

router.get('/queue', authenticate, checkStatus, authorize(['MODERATOR', 'ADMIN']), validate(paginationSchema), moderationController.getQueue);
router.put('/approve/:id', authenticate, checkStatus, authorize(['MODERATOR', 'ADMIN']), validate(idParamSchema), moderationController.approveItem);
router.put('/hide/:id', authenticate, checkStatus, authorize(['MODERATOR', 'ADMIN']), validate(idParamSchema), moderationController.hideItem);
router.put('/warn/:id', authenticate, checkStatus, authorize(['MODERATOR', 'ADMIN']), validate(idParamSchema), moderationController.warnItem);

module.exports = router;
