const interactionRepository = require('../repositories/interaction.repo');
const notificationService = require('./notification.service');

class InteractionService {
  async interact(user_id, target_id, target_model, type) {
    const existing = await interactionRepository.findInteraction(user_id, target_id, type);
    
    if (existing) {
      // Toggle off (e.g. unlike)
      await interactionRepository.delete(user_id, target_id, type);
      return { success: true, action: 'removed' };
    } else {
      // Toggle on
      const interaction = await interactionRepository.create({
        user_id, target_id, target_model, type
      });

      if (type === 'LIKE') {
        const Post = require('../models/Post');
        const Comment = require('../models/Comment');
        let authorId = null;
        if (target_model === 'Post') {
          const p = await Post.findById(target_id);
          if (p && p.author.toString() !== user_id.toString()) authorId = p.author;
        } else if (target_model === 'Comment') {
          const c = await Comment.findById(target_id);
          if (c && c.author.toString() !== user_id.toString()) authorId = c.author;
        }

        if (authorId) {
          await notificationService.sendNotification({
            recipient: authorId,
            sender: user_id,
            type: 'LIKE',
            entity_id: target_id,
            entity_model: target_model
          });
        }
      }

      return { success: true, action: 'added', interaction };
    }
  }

  async addBookmark(user_id, post_id) {
    const existing = await interactionRepository.findInteraction(user_id, post_id, 'BOOKMARK');
    if (existing) return { success: true, action: 'already_saved' };

    const interaction = await interactionRepository.create({
      user_id,
      target_id: post_id,
      target_model: 'Post',
      type: 'BOOKMARK'
    });
    return { success: true, action: 'added', interaction };
  }

  async removeBookmark(user_id, post_id) {
    await interactionRepository.delete(user_id, post_id, 'BOOKMARK');
    return { success: true, action: 'removed' };
  }
}

module.exports = new InteractionService();
