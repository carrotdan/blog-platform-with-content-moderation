const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticate, checkStatus } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { paginationSchema, idParamSchema } = require('../validators/schemas');

router.get('/', authenticate, checkStatus, validate(paginationSchema), notificationController.getNotifications);
router.patch('/read-all', authenticate, checkStatus, notificationController.markAllAsRead);
router.patch('/:id/read', authenticate, checkStatus, validate(idParamSchema), notificationController.markAsRead);
router.put('/:id/read', authenticate, checkStatus, validate(idParamSchema), notificationController.markAsRead); // keep for backward compatibility
router.delete('/:id', authenticate, checkStatus, validate(idParamSchema), notificationController.delete);

module.exports = router;
