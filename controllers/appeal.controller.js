const appealService = require('../services/appeal.service');

class AppealController {
  // User submits appeal
  async createAppeal(req, res, next) {
    try {
      const appeal = await appealService.createAppeal(req.user.id, req.body);
      res.status(201).json({ success: true, message: 'Appeal submitted successfully', data: appeal });
    } catch (error) {
      next(error);
    }
  }

  // User views their own appeals
  async getMyAppeals(req, res, next) {
    try {
      const appeals = await appealService.getUserAppeals(req.user.id);
      res.status(200).json({ success: true, data: appeals });
    } catch (error) {
      next(error);
    }
  }

  // Admin: get all PENDING appeals
  async getPendingAppeals(req, res, next) {
    try {
      const appeals = await appealService.getPendingAppeals();
      res.status(200).json({ success: true, data: appeals });
    } catch (error) {
      next(error);
    }
  }

  // Admin: get all appeals
  async getAllAppeals(req, res, next) {
    try {
      const appeals = await appealService.getAllAppeals();
      res.status(200).json({ success: true, data: appeals });
    } catch (error) {
      next(error);
    }
  }

  // Admin: approve appeal
  async approveAppeal(req, res, next) {
    try {
      const { admin_note } = req.body;
      const appeal = await appealService.approveAppeal(req.params.id, req.user.id, admin_note);
      res.status(200).json({ success: true, message: 'Appeal approved', data: appeal });
    } catch (error) {
      next(error);
    }
  }

  // Admin: reject appeal
  async rejectAppeal(req, res, next) {
    try {
      const { admin_note } = req.body;
      const appeal = await appealService.rejectAppeal(req.params.id, req.user.id, admin_note);
      res.status(200).json({ success: true, message: 'Appeal rejected', data: appeal });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AppealController();
