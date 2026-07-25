const Appeal = require('../models/Appeal');

class AppealRepository {
  async create(data) {
    return Appeal.create(data);
  }

  async findById(id) {
    return Appeal.findById(id)
      .populate('user_id', 'username email avatar')
      .populate('target_id')
      .populate('reviewed_by', 'username');
  }

  async findByUserId(user_id) {
    return Appeal.find({ user_id })
      .populate('target_id')
      .sort({ createdAt: -1 });
  }

  // Kiểm tra user đã kháng cáo nội dung này chưa
  async findExisting(user_id, target_id) {
    return Appeal.findOne({ user_id, target_id, status: 'PENDING' });
  }

  async getPending() {
    return Appeal.find({ status: 'PENDING' })
      .populate('user_id', 'username email avatar')
      .populate('target_id')
      .sort({ createdAt: -1 });
  }

  async getAll() {
    return Appeal.find()
      .populate('user_id', 'username email avatar')
      .populate('target_id')
      .populate('reviewed_by', 'username email')
      .sort({ createdAt: -1 });
  }

  async update(id, data) {
    return Appeal.findByIdAndUpdate(id, data, { new: true });
  }
}

module.exports = new AppealRepository();
