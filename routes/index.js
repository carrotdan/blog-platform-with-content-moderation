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

// API v1 routes
const v1Router = express.Router();

v1Router.use('/auth', authRoutes);
v1Router.use('/users', userRoutes);
v1Router.use('/posts', postRoutes);
v1Router.use('/comments', commentRoutes);
v1Router.use('/interactions', interactionRoutes);
v1Router.use('/follows', followRoutes);
v1Router.use('/notifications', notificationRoutes);
v1Router.use('/moderation', moderationRoutes);
v1Router.use('/admin', adminRoutes);
v1Router.use('/reports', reportRoutes);
v1Router.use('/messages', messageRoutes);
v1Router.use('/appeals', appealRoutes);

router.use('/v1', v1Router);

// Health check endpoint (no version)
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API is healthy', version: '1.0.0' });
});

module.exports = router;
