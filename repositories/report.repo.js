const Report = require('../models/Report');
const { getReporterPopulate } = require('../utils/populate');

class ReportRepository {
  async create(reportData) {
    return Report.create(reportData);
  }

  async findAll(query = {}, skip = 0, limit = 50) {
    return Report.find(query)
      .populate(getReporterPopulate())
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
  }

  async countAll(query = {}) {
    return Report.countDocuments(query);
  }

  async findById(id) {
    return Report.findById(id).populate(getReporterPopulate());
  }

  async updateStatus(id, status) {
    return Report.findByIdAndUpdate(id, { status }, { new: true });
  }

  // M38: used to de-duplicate reports (one PENDING report per reporter+target)
  async findExisting(reporter_id, target_id, target_model) {
    return Report.findOne({ reporter_id, target_id, target_model, status: 'PENDING' });
  }
}

module.exports = new ReportRepository();
