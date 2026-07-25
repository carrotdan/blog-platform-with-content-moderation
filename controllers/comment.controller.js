const commentService = require('../services/comment.service');

class CommentController {
  async createComment(req, res, next) {
    try {
      const comment = await commentService.createComment(req.user.id, req.body);
      
      // Don't leak exact scores in the response if you don't want to, 
      // but returning the object as is for transparency in this demo.
      res.status(201).json({
        success: true,
        message: 'Comment added successfully',
        data: comment
      });
    } catch (error) {
      next(error);
    }
  }

  async getComments(req, res, next) {
    try {
      const { postId } = req.params;
      const { skip, limit } = req.query;
      const comments = await commentService.getCommentsByPost(postId, Number(skip) || 0, Number(limit) || 20);
      
      res.status(200).json({
        success: true,
        message: 'Comments retrieved',
        data: comments
      });
    } catch (error) {
      next(error);
    }
  }
  async getCommentById(req, res, next) {
    try {
      const Comment = require('../models/Comment');
      const comment = await Comment.findById(req.params.id).select('content author label is_hidden createdAt');
      if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });
      res.status(200).json({ success: true, data: comment });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CommentController();
