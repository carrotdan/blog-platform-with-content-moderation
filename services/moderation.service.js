const moderationRepository = require('../repositories/moderation.repo');

class ModerationService {
  async reportContent(reporter_id, data) {
    const { target_id, target_model, reason } = data;
    
    return moderationRepository.createReport({
      reporter_id,
      target_id,
      target_model,
      reason
    });
  }

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

  async getQueue() {
    const queue = await moderationRepository.getPendingQueue();
    // Filter out items where the target content was deleted
    return queue.filter(item => item.target_id !== null);
  }

  async approve(queueId) {
    const item = await moderationRepository.findQueueItemById(queueId);
    if (!item) throw new Error('Queue item not found');

    if (item.target_model === 'Comment') {
      const Comment = require('../models/Comment');
      await Comment.findByIdAndUpdate(item.target_id, { is_hidden: false });
    } else if (item.target_model === 'Post') {
      const Post = require('../models/Post');
      await Post.findByIdAndUpdate(item.target_id, { visibility: 'PUBLIC' });
    }

    return moderationRepository.updateQueueItem(queueId, { status: 'REVIEWED' });
  }

  async hide(queueId) {
    const item = await moderationRepository.findQueueItemById(queueId);
    if (!item) throw new Error('Queue item not found');

    if (item.target_model === 'Comment') {
      const Comment = require('../models/Comment');
      await Comment.findByIdAndUpdate(item.target_id, { is_hidden: true });
    } else if (item.target_model === 'Post') {
      const Post = require('../models/Post');
      await Post.findByIdAndUpdate(item.target_id, { visibility: 'HIDDEN' });
    }

    return moderationRepository.updateQueueItem(queueId, { status: 'REVIEWED' });
  }
  async warn(queueId) {
    const item = await moderationRepository.findQueueItemById(queueId);
    if (!item) throw new Error('Queue item not found');

    if (item.target_model === 'Comment') {
      const Comment = require('../models/Comment');
      // Comment: đánh dấu nhạy cảm, vẫn hiện nhưng bị blur
      await Comment.findByIdAndUpdate(item.target_id, {
        is_sensitive: true,
        is_hidden: false   // không ẩn hoàn toàn
      });
    } else if (item.target_model === 'Post') {
      const Post = require('../models/Post');
      // Post: đánh dấu nhạy cảm, vẫn PUBLIC nhưng có overlay cảnh báo
      await Post.findByIdAndUpdate(item.target_id, {
        is_sensitive: true,
        visibility: 'PUBLIC'
      });
    }

    return moderationRepository.updateQueueItem(queueId, { status: 'REVIEWED' });
  }
}

module.exports = new ModerationService();
