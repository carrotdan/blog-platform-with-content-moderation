const reportRepository = require('../repositories/report.repo');

class ReportService {
  async report(reporter_id, target_id, target_model, reason) {
    return reportRepository.create({
      reporter_id,
      target_id,
      target_model,
      reason
    });
  }

  async getAllReports(query = {}) {
    return reportRepository.findAll(query);
  }

  async resolveReport(id, status) {
    return reportRepository.updateStatus(id, status);
  }
}

module.exports = new ReportService();
