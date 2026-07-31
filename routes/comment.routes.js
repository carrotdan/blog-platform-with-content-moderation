const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const commentController = require('../controllers/comment.controller');
const { authenticate, checkStatus } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { createCommentSchema, getPostSchema, paginationSchema, postIdParamSchema } = require('../validators/schemas');

const contentCreateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many comments created, please try again after 1 minute' },
  standardHeaders: true,
  legacyHeaders: false
});

router.get('/post/:postId', validate(paginationSchema), validate(postIdParamSchema), commentController.getComments);
router.get('/:id', authenticate, validate(getPostSchema), commentController.getCommentById);
router.post('/', authenticate, checkStatus, contentCreateLimiter, validate(createCommentSchema), commentController.createComment);

module.exports = router;
