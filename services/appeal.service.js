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
      throw new Error('Missing required fields: target_id, target_model, reason');
    }

    if (!['Post', 'Comment'].includes(target_model)) {
      throw new Error('Invalid target_model (only Post or Comment)');
    }

    if (!['SPAM', 'TOXIC', 'AI_UNAVAILABLE'].includes(ai_label)) {
      throw new Error('Invalid ai_label (only SPAM, TOXIC, AI_UNAVAILABLE)');
    }

    const existing = await appealRepository.findExisting(user_id, target_id);
    if (existing) {
      throw new Error('You have already appealed this content and it is pending review');
    }

    const target = target_model === 'Post'
      ? await postRepository.findById(target_id)
      : await commentRepository.findById(target_id);

    if (!target) {
      throw new Error('Content not found');
    }

    if (target_model === 'Post' && target.visibility !== 'HIDDEN') {
      throw new Error('Can only appeal hidden posts');
    }
    if (target_model === 'Comment' && !target.is_hidden) {
      throw new Error('Can only appeal hidden comments');
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
    if (!appeal) throw new Error('Appeal not found');
    if (appeal.status !== 'PENDING') throw new Error('This appeal has already been processed');

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
        admin_note: admin_note || 'Your content has been restored.',
        ai_label: appeal.ai_label
      }
    });

    return updated;
  }

  async rejectAppeal(appeal_id, admin_id, admin_note = '') {
    const appeal = await appealRepository.findById(appeal_id);
    if (!appeal) throw new Error('Appeal not found');
    if (appeal.status !== 'PENDING') throw new Error('This appeal has already been processed');

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
        admin_note: admin_note || 'Your appeal has been rejected after review.',
        ai_label: appeal.ai_label
      }
    });

    return updated;
  }
}

module.exports = new AppealService();