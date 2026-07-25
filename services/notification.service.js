const notificationRepository = require('../repositories/notification.repo');

class NotificationService {
  async sendNotification(data) {
    const notification = await notificationRepository.create(data);
    const populatedNotif = await notification.populate('sender', 'username avatar');
    
    let message = 'Bạn có thông báo mới';
    if (data.type === 'LIKE') message = `${populatedNotif.sender?.username} đã thích bài viết của bạn`;
    if (data.type === 'COMMENT') message = `${populatedNotif.sender?.username} đã bình luận bài viết của bạn`;
    if (data.type === 'FOLLOW') message = `${populatedNotif.sender?.username} đã bắt đầu theo dõi bạn`;
    if (data.type === 'REPOST') message = `${populatedNotif.sender?.username} đã chia sẻ bài viết của bạn`;
    if (data.type === 'REPLY') message = `${populatedNotif.sender?.username} đã trả lời bình luận của bạn`;
    
    const socketService = require('./socket.service');
    socketService.sendNotification(data.recipient, {
      message,
      notification: populatedNotif
    });
    
    return notification;
  }

  /**
   * Gửi thông báo hệ thống (không có sender - từ AI/Admin)
   */
  async sendSystemNotification({ recipient, type, entity_id, entity_model, metadata = {} }) {
    const notifData = {
      recipient,
      sender: null,
      type,
      entity_id,
      entity_model,
      metadata
    };

    const notification = await notificationRepository.create(notifData);

    // Tạo message thân thiện
    let message = 'Bạn có thông báo từ hệ thống';

    if (type === 'AI_MODERATION') {
      const label = metadata.ai_label || 'vi phạm';
      const targetType = metadata.target_model === 'Post' ? 'bài viết' : 'bình luận';
      if (label === 'SPAM') {
        message = `⚠️ ${targetType} của bạn bị hệ thống AI phát hiện là SPAM và đã bị ẩn. Bạn có thể gửi kháng cáo nếu cho rằng đây là nhầm lẫn.`;
      } else if (label === 'TOXIC') {
        message = `⚠️ ${targetType} của bạn bị hệ thống AI phát hiện chứa nội dung TOXIC và đã bị ẩn. Bạn có thể gửi kháng cáo nếu cho rằng đây là nhầm lẫn.`;
      }
    }

    if (type === 'APPEAL_RESOLVED') {
      if (metadata.result === 'APPROVED') {
        message = `✅ Kháng cáo của bạn đã được CHẤP NHẬN. Nội dung đã được khôi phục.`;
      } else {
        message = `❌ Kháng cáo của bạn đã bị TỪ CHỐI. ${metadata.admin_note || ''}`;
      }
    }

    const socketService = require('./socket.service');
    socketService.sendNotification(recipient.toString(), {
      message,
      notification,
      isSystem: true
    });

    return notification;
  }

  async getUserNotifications(user_id, skip = 0, limit = 20) {
    return notificationRepository.findByRecipientId(user_id, skip, limit);
  }

  async markAsRead(notification_id) {
    return notificationRepository.markAsRead(notification_id);
  }

  async markAllAsRead(user_id) {
    return notificationRepository.markAllAsRead(user_id);
  }

  async deleteNotification(notification_id) {
    return notificationRepository.delete(notification_id);
  }
}

module.exports = new NotificationService();
