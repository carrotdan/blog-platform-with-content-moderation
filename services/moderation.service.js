const moderationRepository = require('../repositories/moderation.repo');

class ModerationService {
  async logModerationAction(moderator_id, data) {
    const { target_id, target_model, action, reason } = data;

    return moderationRepository.createLog({
      moderator_id,
      target_id,
      target_model,
      action,
      reason
    });
  }

  // M55: page the queue instead of loading every PENDING item.
  async getQueue(skip = 0, limit = 50) {
    const queue = await moderationRepository.getPendingQueue(skip, limit);
    // Filter out items where the target content was deleted
    return queue.filter(item => item.target_id !== null);
  }

  // M47: every moderator action must be recorded in ModerationLog so the
  // moderation trail is complete, and an approval must clear the stale AI label
  // (a NORMAL/clean re-review should not keep showing SPAM/TOXIC badges).
  _requireTarget(item) {
    if (!item.target_id) {
      const error = new Error('Target content no longer exists');
      error.statusCode = 404;
      throw error;
    }
  }

  async approve(queueId, moderator_id = null) {
    const item = await moderationRepository.findQueueItemById(queueId);
    if (!item) throw new Error('Queue item not found');
    this._requireTarget(item);

    const rawTargetId = item.rawTargetId || item.target_id;

    if (item.target_model === 'Comment') {
      const Comment = require('../models/Comment');
      await Comment.findByIdAndUpdate(rawTargetId, {
        is_hidden: false,
        is_sensitive: false,
        label: 'NORMAL'
      });
    } else if (item.target_model === 'Post') {
      const Post = require('../models/Post');
      await Post.findByIdAndUpdate(rawTargetId, {
        visibility: 'PUBLIC',
        is_sensitive: false,
        label: 'NORMAL'
      });
    }

    await moderationRepository.createLog({
      moderator_id,
      target_id: rawTargetId,
      target_model: item.target_model,
      action: 'UNHIDE',
      reason: 'Queue item approved - content restored'
    });

    return moderationRepository.updateQueueItem(queueId, { status: 'REVIEWED' });
  }

  async hide(queueId, moderator_id = null) {
    const item = await moderationRepository.findQueueItemById(queueId);
    if (!item) throw new Error('Queue item not found');
    this._requireTarget(item);

    const rawTargetId = item.rawTargetId || item.target_id;

    if (item.target_model === 'Comment') {
      // M44: hide the whole reply subtree, not just the flagged comment.
      const commentRepository = require('../repositories/comment.repo');
      await commentRepository.hideSubtree(rawTargetId);
    } else if (item.target_model === 'Post') {
      const Post = require('../models/Post');
      await Post.findByIdAndUpdate(rawTargetId, { visibility: 'HIDDEN' });
    }

    await moderationRepository.createLog({
      moderator_id,
      target_id: rawTargetId,
      target_model: item.target_model,
      action: 'HIDE',
      reason: 'Queue item hidden by moderator'
    });

    return moderationRepository.updateQueueItem(queueId, { status: 'REVIEWED' });
  }

  async warn(queueId, moderator_id = null) {
    const item = await moderationRepository.findQueueItemById(queueId);
    if (!item) throw new Error('Queue item not found');
    this._requireTarget(item);

    const rawTargetId = item.rawTargetId || item.target_id;

    if (item.target_model === 'Comment') {
      const Comment = require('../models/Comment');
      // Mark as sensitive: still visible but blurred in the UI
      await Comment.findByIdAndUpdate(rawTargetId, {
        is_sensitive: true,
        is_hidden: false   // do not fully hide
      });
    } else if (item.target_model === 'Post') {
      const Post = require('../models/Post');
      // Mark as sensitive: stays PUBLIC but shows a warning overlay
      await Post.findByIdAndUpdate(rawTargetId, {
        is_sensitive: true,
        visibility: 'PUBLIC'
      });
    }

    await moderationRepository.createLog({
      moderator_id,
      target_id: rawTargetId,
      target_model: item.target_model,
      action: 'WARN',
      reason: 'Content marked as sensitive'
    });

    return moderationRepository.updateQueueItem(queueId, { status: 'REVIEWED' });
  }
}

module.exports = new ModerationService();
