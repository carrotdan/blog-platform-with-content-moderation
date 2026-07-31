const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const postController = require('../controllers/post.controller');
const { authenticate, optionalAuthenticate, checkStatus } = require('../middlewares/auth.middleware');
const { upload, validateFileSize } = require('../middlewares/upload.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { 
  createPostSchema, 
  updatePostSchema, 
  repostSchema, 
  listPostsSchema, 
  getPostSchema,
  getPostBySlugSchema,
  paginationSchema
} = require('../validators/schemas');

const contentCreateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many posts created, please try again after 1 minute' },
  standardHeaders: true,
  legacyHeaders: false
});

const contentActionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, message: 'Too many requests, please try again after 1 minute' },
  standardHeaders: true,
  legacyHeaders: false
});

router.get('/', optionalAuthenticate, validate(listPostsSchema), postController.listPosts);
router.get('/me/posts', authenticate, checkStatus, validate(paginationSchema), postController.getMyPosts);
router.get('/me/bookmarks', authenticate, checkStatus, validate(paginationSchema), postController.getBookmarkedPosts);
router.get('/:id', optionalAuthenticate, validate(getPostSchema), postController.getPost);
router.get('/slug/:slug', optionalAuthenticate, validate(getPostBySlugSchema), postController.getPostBySlug);

router.post('/', authenticate, checkStatus, contentCreateLimiter, upload.array('media', 10), validateFileSize, validate(createPostSchema), postController.createPost);
router.post('/:id/repost', authenticate, checkStatus, contentCreateLimiter, validate(repostSchema), postController.repost);
router.put('/:id', authenticate, checkStatus, contentActionLimiter, validate(updatePostSchema), postController.updatePost);
router.delete('/:id', authenticate, checkStatus, contentActionLimiter, validate(getPostSchema), postController.deletePost);

module.exports = router;
