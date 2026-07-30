const express = require('express');
const router = express.Router();
const commentController = require('../controllers/comment.controller');
const { authenticate, checkStatus } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { createCommentSchema, getPostSchema, paginationSchema } = require('../validators/schemas');

router.get('/post/:postId', validate(paginationSchema), commentController.getComments);
router.get('/:id', authenticate, validate(getPostSchema), commentController.getCommentById);
router.post('/', authenticate, checkStatus, validate(createCommentSchema), commentController.createComment);

module.exports = router;
