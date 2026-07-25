const Report = require('../models/Report');

class ReportRepository {
  async create(reportData) {
    return Report.create(reportData);
  }

  async findAll(query = {}) {
    return Report.find(query).populate('reporter_id', 'username').sort({ createdAt: -1 });
  }

  async findById(id) {
    return Report.findById(id).populate('reporter_id', 'username');
  }

  async updateStatus(id, status) {
    return Report.findByIdAndUpdate(id, { status }, { new: true });
  }
}

module.exports = new ReportRepository();
