const appealRepository = require('../repositories/appeal.repo');

class AppealService {
  /**
   * User gửi kháng cáo về nội dung bị AI flag
   */
  async createAppeal(user_id, data) {
    const { target_id, target_model, ai_label, ai_spam_score, ai_toxicity_score, reason } = data;

    // Kiểm tra đã kháng cáo chưa
    const existing = await appealRepository.findExisting(user_id, target_id);
    if (existing) {
      throw new Error('Bạn đã gửi kháng cáo cho nội dung này và đang chờ xem xét.');
    }

    const appeal = await appealRepository.create({
      user_id,
      target_id,
      target_model,
      ai_label,
      ai_spam_score: ai_spam_score || 0,
      ai_toxicity_score: ai_toxicity_score || 0,
      reason
    });

    return appeal;
  }

  /**
   * Lấy danh sách kháng cáo của user
   */
  async getUserAppeals(user_id) {
    return appealRepository.findByUserId(user_id);
  }

  /**
   * Admin lấy tất cả kháng cáo PENDING
   */
  async getPendingAppeals() {
    return appealRepository.getPending();
  }

  /**
   * Admin lấy tất cả kháng cáo
   */
  async getAllAppeals() {
    return appealRepository.getAll();
  }

  /**
   * Admin duyệt kháng cáo (APPROVED) → khôi phục nội dung + thông báo user
   */
  async approveAppeal(appeal_id, admin_id, admin_note = '') {
    const appeal = await appealRepository.findById(appeal_id);
    if (!appeal) throw new Error('Kháng cáo không tồn tại');
    if (appeal.status !== 'PENDING') throw new Error('Kháng cáo này đã được xử lý');

    // Khôi phục nội dung bị ẩn
    if (appeal.target_model === 'Post') {
      const Post = require('../models/Post');
      await Post.findByIdAndUpdate(appeal.target_id._id || appeal.target_id, {
        visibility: 'PUBLIC',
        is_sensitive: false
      });
    } else if (appeal.target_model === 'Comment') {
      const Comment = require('../models/Comment');
      await Comment.findByIdAndUpdate(appeal.target_id._id || appeal.target_id, {
        is_hidden: false
      });
    }

    // Cập nhật trạng thái kháng cáo
    const updated = await appealRepository.update(appeal_id, {
      status: 'APPROVED',
      reviewed_by: admin_id,
      admin_note
    });

    // Gửi thông báo cho user
    const notificationService = require('./notification.service');
    await notificationService.sendSystemNotification({
      recipient: appeal.user_id._id || appeal.user_id,
      type: 'APPEAL_RESOLVED',
      entity_id: appeal._id,
      entity_model: 'Appeal',
      metadata: {
        result: 'APPROVED',
        target_model: appeal.target_model,
        admin_note: admin_note || 'Nội dung của bạn đã được khôi phục.',
        ai_label: appeal.ai_label
      }
    });

    return updated;
  }

  /**
   * Admin từ chối kháng cáo (REJECTED) + thông báo user
   */
  async rejectAppeal(appeal_id, admin_id, admin_note = '') {
    const appeal = await appealRepository.findById(appeal_id);
    if (!appeal) throw new Error('Kháng cáo không tồn tại');
    if (appeal.status !== 'PENDING') throw new Error('Kháng cáo này đã được xử lý');

    const updated = await appealRepository.update(appeal_id, {
      status: 'REJECTED',
      reviewed_by: admin_id,
      admin_note
    });

    // Gửi thông báo cho user
    const notificationService = require('./notification.service');
    await notificationService.sendSystemNotification({
      recipient: appeal.user_id._id || appeal.user_id,
      type: 'APPEAL_RESOLVED',
      entity_id: appeal._id,
      entity_model: 'Appeal',
      metadata: {
        result: 'REJECTED',
        target_model: appeal.target_model,
        admin_note: admin_note || 'Kháng cáo của bạn đã bị từ chối sau khi xem xét.',
        ai_label: appeal.ai_label
      }
    });

    return updated;
  }
}

module.exports = new AppealService();
