const interactionRepository = require('../repositories/interaction.repo');
const notificationService = require('./notification.service');

class InteractionService {
  // M31: Validate the target exists and is visible before creating any interaction
  async _validateTarget(target_id, target_model, user_id) {
    const Post = require('../models/Post');
    const Comment = require('../models/Comment');

    if (target_model === 'Post') {
      const post = await Post.findById(target_id);
      if (!post) {
        const error = new Error('Post not found');
        error.statusCode = 404;
        throw error;
      }
      if (post.visibility === 'HIDDEN') {
        const error = new Error('Cannot interact with a hidden post');
        error.statusCode = 403;
        throw error;
      }
      if (post.visibility === 'PRIVATE' && post.author.toString() !== user_id.toString()) {
        const error = new Error('Cannot interact with a private post');
        error.statusCode = 403;
        throw error;
      }
      return post;
    }

    if (target_model === 'Comment') {
      const comment = await Comment.findById(target_id);
      if (!comment) {
        const error = new Error('Comment not found');
        error.statusCode = 404;
        throw error;
      }
      if (comment.is_hidden) {
        const error = new Error('Cannot interact with a hidden comment');
        error.statusCode = 403;
        throw error;
      }
      return comment;
    }

    const error = new Error('Unsupported target model');
    error.statusCode = 400;
    throw error;
  }

  async interact(user_id, target_id, target_model, type) {
    // H24: Reposts are real Post documents (POST /posts/:id/repost), not
    // Interaction rows. Reject the legacy REPOST type so counts stay consistent.
    if (type === 'REPOST') {
      const error = new Error('Reposts are handled via POST /posts/:id/repost');
      error.statusCode = 400;
      throw error;
    }

    const existing = await interactionRepository.findInteraction(user_id, target_id, type);
    
    if (existing) {
      // Toggle off (e.g. unlike)
      await interactionRepository.delete(user_id, target_id, type);
      return { success: true, action: 'removed' };
    } else {
      // Validate the target is visible before toggling on
      const target = await this._validateTarget(target_id, target_model, user_id);

      // Toggle on
      const interaction = await interactionRepository.create({
        user_id, target_id, target_model, type
      });

      if (type === 'LIKE') {
        let authorId = null;
        if (target_model === 'Post') {
          if (target.author.toString() !== user_id.toString()) authorId = target.author;
        } else if (target_model === 'Comment') {
          if (target.author.toString() !== user_id.toString()) authorId = target.author;
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

    // Validate the post is visible before bookmarking
    await this._validateTarget(post_id, 'Post', user_id);

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
