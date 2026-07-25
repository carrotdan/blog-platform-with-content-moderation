const followService = require('../services/follow.service');
const userService = require('../services/user.service');

class FollowController {
  async toggleFollow(req, res, next) {
    try {
      const { following_id } = req.body;
      const result = await followService.toggleFollow(req.user.id, following_id);
      
      res.status(200).json({
        success: true,
        message: `User ${result.action}`,
        data: result.follow || null
      });
    } catch (error) {
      next(error);
    }
  }
  async getFollowers(req, res, next) {
    try {
      const { userId } = req.params;
      const followers = await followService.getFollowers(userId);
      res.status(200).json({ success: true, data: followers });
    } catch (error) {
      next(error);
    }
  }

  async getFollowing(req, res, next) {
    try {
      const { userId } = req.params;
      const following = await followService.getFollowing(userId);
      res.status(200).json({ success: true, data: following });
    } catch (error) {
      next(error);
    }
  }
  async getSuggestions(req, res, next) {
    try {
      const suggestions = await userService.getFollowSuggestions(req.user?.id);
      res.status(200).json({ success: true, data: suggestions });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new FollowController();
