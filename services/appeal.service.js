const appealRepository = require('../repositories/appeal.repo');
const moderationRepository = require('../repositories/moderation.repo');
const postRepository = require('../repositories/post.repo');
const commentRepository = require('../repositories/comment.repo');
const userRepository = require('../repositories/user.repo');
const notificationService = require('./notification.service');
const Post = require('../models/Post');
const Comment = require('../models/Comment');

class AppealService {
  async createAppeal(user_id, data) {
    const { target_id, target_model, reason, ai_label, ai_spam_score, ai_toxicity_score } = data;

    if (!target_id || !target_model || !reason) {
      throw new Error('Thiếu thông tin: target_id, target_model, reason là bắt buộc');
    }

    if (!['Post', 'Comment'].includes(target_model)) {
      throw new Error('target_model không hợp lệ (chỉ Post hoặc Comment)');
    }

    if (!['SPAM', 'TOXIC', 'AI_UNAVAILABLE'].includes(ai_label)) {
      throw new Error('ai_label không hợp lệ (chỉ SPAM, TOXIC, AI_UNAVAILABLE)');
    }

    const existing = await appealRepository.findExisting(user_id, target_id);
    if (existing) {
      throw new Error('Bạn đã kháng cáo nội dung này và đang chờ xử lý');
    }

    const target = target_model === 'Post'
      ? await postRepository.findById(target_id)
      : await commentRepository.findById(target_id);

    if (!target) {
      throw new Error('Nội dung không tồn tại');
    }

    if (target_model === 'Post' && target.visibility !== 'HIDDEN') {
      throw new Error('Chỉ có thể kháng cáo bài viết đang bị ẩn');
    }
    if (target_model === 'Comment' && !target.is_hidden) {
      throw new Error('Chỉ có thể kháng cáo bình luận đang bị ẩn');
    }

    const appeal = await appealRepository.create({
      user_id,
      target_id,
      target_model,
      reason,
      ai_label,
      ai_spam_score: ai_spam_score || 0,
      ai_toxicity_score: ai_toxicity_score || 0
    });

    return appeal;
  }

  async getUserAppeals(user_id) {
    return appealRepository.findByUserId(user_id);
  }

  async getPendingAppeals() {
    return appealRepository.getPending();
  }

  async getAllAppeals() {
    return appealRepository.getAll();
  }

  async approveAppeal(appeal_id, admin_id, admin_note = '') {
    const appeal = await appealRepository.findById(appeal_id);
    if (!appeal) throw new Error('Kháng cáo không tồn tại');
    if (appeal.status !== 'PENDING') throw new Error('Kháng cáo này đã được xử lý');

    if (appeal.target_model === 'Post') {
      await postRepository.updateVisibility(appeal.target_id, 'PUBLIC');
    } else {
      await commentRepository.updateHidden(appeal.target_id, false);
    }

    const updated = await appealRepository.update(appeal_id, {
      status: 'APPROVED',
      reviewed_by: admin_id,
      admin_note
    });

    await moderationRepository.createLog({
      moderator_id: admin_id,
      target_id: appeal.target_id,
      target_model: appeal.target_model,
      action: 'UNHIDE',
      reason: `Admin approved appeal: ${admin_note || 'No note provided'}`
    });

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

  async rejectAppeal(appeal_id, admin_id, admin_note = '') {
    const appeal = await appealRepository.findById(appeal_id);
    if (!appeal) throw new Error('Kháng cáo không tồn tại');
    if (appeal.status !== 'PENDING') throw new Error('Kháng cáo này đã được xử lý');

    const updated = await appealRepository.update(appeal_id, {
      status: 'REJECTED',
      reviewed_by: admin_id,
      admin_note
    });

    await moderationRepository.createLog({
      moderator_id: admin_id,
      target_id: appeal.target_id,
      target_model: appeal.target_model,
      action: 'WARN',
      reason: `Admin rejected appeal: ${admin_note || 'No note provided'}`
    });

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