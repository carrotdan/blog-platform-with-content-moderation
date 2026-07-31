const appealRepository = require('../repositories/appeal.repo');
const moderationRepository = require('../repositories/moderation.repo');
const postRepository = require('../repositories/post.repo');
const commentRepository = require('../repositories/comment.repo');
const userRepository = require('../repositories/user.repo');
const notificationService = require('./notification.service');
const { getStatusFromScore, getDeltasFromLabel, isViolationLabel } = require('../utils/violation');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const ModerationQueue = require('../models/ModerationQueue');

class AppealService {
  _throw(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    throw error;
  }

  async createAppeal(user_id, data) {
    const { target_id, target_model, reason } = data;

    if (!target_id || !target_model || !reason) {
      this._throw('Missing required fields: target_id, target_model, reason');
    }

    if (!['Post', 'Comment'].includes(target_model)) {
      this._throw('Invalid target_model (only Post or Comment)');
    }

    const existing = await appealRepository.findExisting(user_id, target_id);
    if (existing) {
      this._throw('You have already appealed this content and it is pending review');
    }

    const target = target_model === 'Post'
      ? await postRepository.findById(target_id)
      : await commentRepository.findById(target_id);

    if (!target) {
      this._throw('Content not found', 404);
    }

    // C24: Only the author of the flagged content may appeal it. Without this,
    // any user could appeal (and later reverse the penalties of) any content.
    const targetAuthor = target.author?._id || target.author;
    if (!targetAuthor || targetAuthor.toString() !== user_id.toString()) {
      this._throw('You can only appeal your own content', 403);
    }

    if (target_model === 'Post' && target.visibility !== 'HIDDEN') {
      this._throw('Can only appeal hidden posts');
    }
    if (target_model === 'Comment' && !target.is_hidden) {
      this._throw('Can only appeal hidden comments');
    }

    // C24: Never trust client-supplied ai_label/scores — resolve the real
    // moderation flag from the queue (or the target's persisted label) so an
    // approval reverses exactly the penalty that was actually applied.
    const { ai_label, ai_spam_score, ai_toxicity_score } =
      await this._resolveModerationFlag(target_id, target_model, target);

    const appeal = await appealRepository.create({
      user_id,
      target_id,
      target_model,
      reason,
      ai_label,
      ai_spam_score,
      ai_toxicity_score
    });

    return appeal;
  }

  async _resolveModerationFlag(target_id, target_model, target) {
    const queueItem = await ModerationQueue.findOne({ target_id, target_model })
      .sort({ createdAt: -1 })
      .select('target_type spam_score toxicity_score')
      .lean();

    if (queueItem && ['SPAM', 'TOXIC', 'AI_UNAVAILABLE'].includes(queueItem.target_type)) {
      return {
        ai_label: queueItem.target_type,
        ai_spam_score: queueItem.spam_score || 0,
        ai_toxicity_score: queueItem.toxicity_score || 0
      };
    }

    const persistedLabel = target.label;
    if (['SPAM', 'TOXIC', 'AI_UNAVAILABLE'].includes(persistedLabel)) {
      return {
        ai_label: persistedLabel,
        ai_spam_score: target.spam_score || 0,
        ai_toxicity_score: target.toxicity_score || 0
      };
    }

    this._throw('This content has no moderation flag to appeal');
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

    // H29: Reverse the violation penalties that were applied when the content
    // was originally flagged (SPAM/TOXIC), then recompute the user's status.
    if (isViolationLabel(appeal.ai_label)) {
      const { spamDelta, toxicDelta } = getDeltasFromLabel(appeal.ai_label);
      const userId = appeal.user_id._id || appeal.user_id;
      const updatedUser = await userRepository.decrementViolations(userId, spamDelta, toxicDelta);

      if (updatedUser) {
        const status = getStatusFromScore(updatedUser.violationScore, updatedUser.status);
        if (status !== updatedUser.status) {
          await userRepository.update(userId, { status });
        }
      }
    }

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