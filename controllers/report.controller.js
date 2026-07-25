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
      const reports = await reportService.getAllReports();
      res.status(200).json({ success: true, data: reports });
    } catch (error) {
      next(error);
    }
  }

  async resolveReport(req, res, next) {
    try {
      const { status } = req.body;
      const report = await reportService.resolveReport(req.params.id, status);
      res.status(200).json({ success: true, message: 'Report updated', data: report });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReportController();
