const appealService = require('../services/appeal.service');

class AppealController {
  // User gửi kháng cáo
  async createAppeal(req, res, next) {
    try {
      const appeal = await appealService.createAppeal(req.user.id, req.body);
      res.status(201).json({ success: true, message: 'Kháng cáo đã được gửi thành công', data: appeal });
    } catch (error) {
      next(error);
    }
  }

  // User xem kháng cáo của mình
  async getMyAppeals(req, res, next) {
    try {
      const appeals = await appealService.getUserAppeals(req.user.id);
      res.status(200).json({ success: true, data: appeals });
    } catch (error) {
      next(error);
    }
  }

  // Admin: lấy tất cả kháng cáo PENDING
  async getPendingAppeals(req, res, next) {
    try {
      const appeals = await appealService.getPendingAppeals();
      res.status(200).json({ success: true, data: appeals });
    } catch (error) {
      next(error);
    }
  }

  // Admin: lấy tất cả kháng cáo
  async getAllAppeals(req, res, next) {
    try {
      const appeals = await appealService.getAllAppeals();
      res.status(200).json({ success: true, data: appeals });
    } catch (error) {
      next(error);
    }
  }

  // Admin: duyệt kháng cáo
  async approveAppeal(req, res, next) {
    try {
      const { admin_note } = req.body;
      const appeal = await appealService.approveAppeal(req.params.id, req.user.id, admin_note);
      res.status(200).json({ success: true, message: 'Kháng cáo đã được chấp nhận', data: appeal });
    } catch (error) {
      next(error);
    }
  }

  // Admin: từ chối kháng cáo
  async rejectAppeal(req, res, next) {
    try {
      const { admin_note } = req.body;
      const appeal = await appealService.rejectAppeal(req.params.id, req.user.id, admin_note);
      res.status(200).json({ success: true, message: 'Kháng cáo đã bị từ chối', data: appeal });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AppealController();
