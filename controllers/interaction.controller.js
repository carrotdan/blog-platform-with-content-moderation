const interactionService = require('../services/interaction.service');

class InteractionController {
  async interact(req, res, next) {
    try {
      const { target_id, target_model, type } = req.body;
      const result = await interactionService.interact(req.user.id, target_id, target_model, type);
      
      res.status(200).json({
        success: true,
        message: `Interaction ${result.action}`,
        data: result.interaction || null
      });
    } catch (error) {
      next(error);
    }
  }

  async bookmark(req, res, next) {
    try {
      const { target_id } = req.body;
      const result = await interactionService.addBookmark(req.user.id, target_id);
      res.status(200).json({ success: true, message: 'Post bookmarked', data: result.interaction });
    } catch (error) {
      next(error);
    }
  }

  async unbookmark(req, res, next) {
    try {
      const { postId } = req.params;
      await interactionService.removeBookmark(req.user.id, postId);
      res.status(200).json({ success: true, message: 'Bookmark removed' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new InteractionController();
