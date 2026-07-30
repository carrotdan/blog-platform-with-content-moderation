const express = require('express');
const router = express.Router();
const postController = require('../controllers/post.controller');
const { authenticate, optionalAuthenticate, checkStatus } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { 
  createPostSchema, 
  updatePostSchema, 
  repostSchema, 
  listPostsSchema, 
  getPostSchema,
  getPostBySlugSchema
} = require('../validators/schemas');

router.get('/', optionalAuthenticate, validate(listPostsSchema), postController.listPosts);
router.get('/me/posts', authenticate, checkStatus, postController.getMyPosts);
router.get('/me/bookmarks', authenticate, checkStatus, postController.getBookmarkedPosts);
router.get('/:id', optionalAuthenticate, validate(getPostSchema), postController.getPost);
router.get('/slug/:slug', optionalAuthenticate, validate(getPostBySlugSchema), postController.getPostBySlug);

router.post('/', authenticate, checkStatus, upload.array('media', 10), validate(createPostSchema), postController.createPost);
router.post('/:id/repost', authenticate, checkStatus, validate(repostSchema), postController.repost);
router.put('/:id', authenticate, checkStatus, validate(updatePostSchema), postController.updatePost);
router.delete('/:id', authenticate, checkStatus, validate(getPostSchema), postController.deletePost);

module.exports = router;
