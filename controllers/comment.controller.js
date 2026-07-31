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
      const comments = await commentService.getCommentsByPost(
        postId,
        req.user?.id,
        Number(skip) || 0,
        Number(limit) || 20
      );
      
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
      // H42: visibility of the parent post is enforced in the service (a
      // comment under a PRIVATE/HIDDEN post is only readable by its author).
      const comment = await commentService.getCommentById(req.params.id, req.user?.id);
      if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

      // H22: Hidden/moderated comments must not leak content to non-owners
      if (comment.is_hidden && (!req.user || comment.author._id.toString() !== req.user.id.toString())) {
        return res.status(404).json({ success: false, message: 'Comment not found' });
      }

      res.status(200).json({ success: true, data: comment });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CommentController();
