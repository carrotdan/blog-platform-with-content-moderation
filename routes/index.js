const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const postRoutes = require('./post.routes');
const commentRoutes = require('./comment.routes');
const interactionRoutes = require('./interaction.routes');
const followRoutes = require('./follow.routes');
const notificationRoutes = require('./notification.routes');
const moderationRoutes = require('./moderation.routes');
const adminRoutes = require('./admin.routes');
const reportRoutes = require('./report.routes');
const messageRoutes = require('./message.routes');
const appealRoutes = require('./appeal.routes');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/posts', postRoutes);
router.use('/comments', commentRoutes);
router.use('/interactions', interactionRoutes);
router.use('/follows', followRoutes);
router.use('/notifications', notificationRoutes);
router.use('/moderation', moderationRoutes);
router.use('/admin', adminRoutes);
router.use('/reports', reportRoutes);
router.use('/messages', messageRoutes);
router.use('/appeals', appealRoutes);

module.exports = router;
