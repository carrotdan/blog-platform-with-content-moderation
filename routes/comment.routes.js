const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const commentController = require('../controllers/comment.controller');
const { authenticate, optionalAuthenticate, checkStatus } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { createCommentSchema, getPostSchema, paginationSchema, postIdParamSchema } = require('../validators/schemas');

const contentCreateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many comments created, please try again after 1 minute' },
  standardHeaders: true,
  legacyHeaders: false
});

// H36: optionalAuthenticate so a post's author can view comments on their own
// PRIVATE post; guests/others only see comments under PUBLIC posts.
router.get('/post/:postId', optionalAuthenticate, validate(paginationSchema), validate(postIdParamSchema), commentController.getComments);
router.get('/:id', authenticate, validate(getPostSchema), commentController.getCommentById);
router.post('/', authenticate, checkStatus, contentCreateLimiter, validate(createCommentSchema), commentController.createComment);

module.exports = router;
