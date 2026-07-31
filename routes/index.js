const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const aiService = require('../services/ai.service');
const logger = require('../utils/logger');

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

// Health check endpoint (no version) - checks critical dependencies
router.get('/health', async (req, res) => {
  const start = Date.now();

  const dbStates = ['DISCONNECTED', 'CONNECTED', 'CONNECTING', 'DISCONNECTING'];
  const dbState = mongoose.connection.readyState;
  const dbUp = dbState === 1;

  let aiUp = false;
  try {
    aiUp = await aiService.isHealthy();
  } catch (err) {
    logger.warn('[Health] AI service health check failed', { error: err.message });
  }

  const checks = {
    database: {
      status: dbUp ? 'up' : 'down',
      state: dbStates[dbState] || 'UNKNOWN'
    },
    aiService: {
      status: aiUp ? 'up' : 'down'
    }
  };

  const responseTime = Date.now() - start;

  // Database is the critical dependency; AI being down does not take the
  // service down (AI failures fail-closed), so it only marks the service degraded.
  const status = dbUp ? 200 : 503;

  res.status(status).json({
    success: dbUp,
    message: dbUp ? (aiUp ? 'All systems operational' : 'Service healthy, AI service degraded') : 'Service unavailable',
    version: '1.0.0',
    checks,
    responseTime: `${responseTime}ms`
  });
});

module.exports = router;
