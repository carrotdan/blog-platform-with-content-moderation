const reportService = require('../services/report.service');

class ReportController {
  async createReport(req, res, next) {
    try {
      const { target_id, target_model, reason } = req.body;
      const report = await reportService.report(req.user.id, target_id, target_model, reason);
      res.status(201).json({
        success: true,
        message: 'Report submitted successfully',
        data: report
      });
    } catch (error) {
      next(error);
    }
  }

  async listReports(req, res, next) {
    try {
      // M53: paginate the admin report listing (was returning every report).
      const skip = Number(req.query.skip) || 0;
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const { reports, total } = await reportService.getAllReports({}, skip, limit);
      res.status(200).json({ success: true, data: reports, meta: { total, skip, limit } });
    } catch (error) {
      next(error);
    }
  }

  async resolveReport(req, res, next) {
    try {
      // H48: map the status-only API body onto the unified action-based resolver.
      // RESOLVED → HIDE (content hidden + resolved); DISMISSED → DISMISS.
      // L40: attribute the decision to the acting admin in the ModerationLog.
      const { status } = req.body;
      const action = status === 'DISMISSED' ? 'DISMISS' : 'HIDE';
      const report = await reportService.resolveReport(req.params.id, action, { moderator_id: req.user.id });
      res.status(200).json({ success: true, message: 'Report updated', data: report });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReportController();
