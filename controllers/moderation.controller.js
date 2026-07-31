const moderationService = require('../services/moderation.service');

class ModerationController {
  async logAction(req, res, next) {
    try {
      const log = await moderationService.logModerationAction(req.user.id, req.body);
      res.status(201).json({
        success: true,
        message: 'Moderation action logged',
        data: log
      });
    } catch (error) {
      next(error);
    }
  }

  async getQueue(req, res, next) {
    try {
      const queue = await moderationService.getQueue();
      res.status(200).json({ success: true, message: 'Queue retrieved', data: queue });
    } catch (error) {
      next(error);
    }
  }

  async approveItem(req, res, next) {
    try {
      // M47: record which moderator approved the item in ModerationLog.
      await moderationService.approve(req.params.id, req.user.id);
      res.status(200).json({ success: true, message: 'Item approved' });
    } catch (error) {
      next(error);
    }
  }

  async hideItem(req, res, next) {
    try {
      // M47: record which moderator hid the item in ModerationLog.
      await moderationService.hide(req.params.id, req.user.id);
      res.status(200).json({ success: true, message: 'Item hidden' });
    } catch (error) {
      next(error);
    }
  }
  async warnItem(req, res, next) {
    try {
      // M47: record which moderator warned the item in ModerationLog.
      await moderationService.warn(req.params.id, req.user.id);
      res.status(200).json({ success: true, message: 'Item marked as sensitive (warned)' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ModerationController();
