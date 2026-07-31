const notificationRepository = require('../repositories/notification.repo');

class NotificationService {
  async sendNotification(data) {
    const notification = await notificationRepository.create(data);
    
    // Only populate sender if it exists (not system notification)
    let populatedNotif = notification;
    if (notification.sender) {
      populatedNotif = await notification.populate('sender', 'username avatar');
    }
    
    let message = 'You have a new notification';
    if (data.type === 'LIKE') message = `${populatedNotif.sender?.username} liked your post`;
    if (data.type === 'COMMENT') message = `${populatedNotif.sender?.username} commented on your post`;
    if (data.type === 'FOLLOW') message = `${populatedNotif.sender?.username} started following you`;
    if (data.type === 'REPOST') message = `${populatedNotif.sender?.username} reposted your post`;
    if (data.type === 'REPLY') message = `${populatedNotif.sender?.username} replied to your comment`;
    
    const socketService = require('./socket.service');
    socketService.sendNotification(data.recipient, {
      message,
      notification: populatedNotif
    });
    
    return notification;
  }

  /**
   * Send system notification (no sender - from AI/Admin)
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

    // Create friendly message
    let message = 'You have a system notification';

    if (type === 'AI_MODERATION') {
      const label = metadata.ai_label || 'violation';
      const targetType = metadata.target_model === 'Post' ? 'post' : 'comment';
      if (label === 'SPAM') {
        message = `⚠️ Your ${targetType} was flagged as SPAM by AI moderation and has been hidden. You can appeal if you believe this is a mistake.`;
      } else if (label === 'TOXIC') {
        message = `⚠️ Your ${targetType} was flagged as TOXIC by AI moderation and has been hidden. You can appeal if you believe this is a mistake.`;
      }
    }

    if (type === 'APPEAL_RESOLVED') {
      if (metadata.result === 'APPROVED') {
        message = `✅ Your appeal has been APPROVED. Content has been restored.`;
      } else {
        message = `❌ Your appeal has been REJECTED. ${metadata.admin_note || ''}`;
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
