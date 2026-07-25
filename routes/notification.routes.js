const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.get('/', authenticate, notificationController.getNotifications);
router.patch('/read-all', authenticate, notificationController.markAllAsRead);
router.patch('/:id/read', authenticate, notificationController.markAsRead);
router.put('/:id/read', authenticate, notificationController.markAsRead); // keep for backward compatibility
router.delete('/:id', authenticate, notificationController.delete);

module.exports = router;
