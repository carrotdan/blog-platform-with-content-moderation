const Report = require('../models/Report');
const { getReporterPopulate } = require('../utils/populate');

class ReportRepository {
  async create(reportData) {
    return Report.create(reportData);
  }

  async findAll(query = {}) {
    return Report.find(query).populate(getReporterPopulate()).sort({ createdAt: -1 });
  }

  async findById(id) {
    return Report.findById(id).populate(getReporterPopulate());
  }

  async updateStatus(id, status) {
    return Report.findByIdAndUpdate(id, { status }, { new: true });
  }
}

module.exports = new ReportRepository();
