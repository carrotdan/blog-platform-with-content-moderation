const Notification = require('../models/Notification');

class NotificationRepository {
  async create(notificationData) {
    return Notification.create(notificationData);
  }

  async findByRecipientId(recipient, skip = 0, limit = 20) {
    return Notification.find({ recipient })
      .populate('sender', 'username avatar')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
  }

  async markAsRead(id) {
    return Notification.findByIdAndUpdate(id, { is_read: true }, { new: true });
  }

  async markAllAsRead(recipient) {
    return Notification.updateMany({ recipient }, { is_read: true });
  }

  async delete(id) {
    return Notification.findByIdAndDelete(id);
  }
}

module.exports = new NotificationRepository();
