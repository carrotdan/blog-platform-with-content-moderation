const express = require('express');
const router = express.Router();
const postController = require('../controllers/post.controller');
const { authenticate, optionalAuthenticate, checkStatus } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

router.get('/', optionalAuthenticate, postController.listPosts);
router.get('/me/posts', authenticate, checkStatus, postController.getMyPosts);
router.get('/me/bookmarks', authenticate, checkStatus, postController.getBookmarkedPosts);
router.get('/:id/content', authenticate, postController.getPostContent); // lấy nội dung kể cả khi HIDDEN
router.get('/:id', optionalAuthenticate, postController.getPost);
router.get('/slug/:slug', optionalAuthenticate, postController.getPostBySlug);

router.post('/', authenticate, checkStatus, upload.array('media', 10), postController.createPost);
router.post('/:id/repost', authenticate, checkStatus, postController.repost);
router.put('/:id', authenticate, checkStatus, postController.updatePost);
router.delete('/:id', authenticate, checkStatus, postController.deletePost);

module.exports = router;
