const express = require('express');
const router = express.Router();
const commentController = require('../controllers/comment.controller');
const { authenticate, checkStatus } = require('../middlewares/auth.middleware');

router.get('/post/:postId', commentController.getComments);
router.get('/:id', authenticate, commentController.getCommentById);
router.post('/', authenticate, checkStatus, commentController.createComment);

module.exports = router;
