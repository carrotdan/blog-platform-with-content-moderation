const commentRepository = require('../repositories/comment.repo');
const moderationRepository = require('../repositories/moderation.repo');
const userRepository = require('../repositories/user.repo');
const aiService = require('./ai.service');
const notificationService = require('./notification.service');
const { getStatusFromScore, getDeltasFromLabel, isViolationLabel } = require('../utils/violation');

const MAX_COMMENT_DEPTH = 5;

class CommentService {
  async createComment(user_id, data) {
    const { post_id, parent_id, content } = data;
    
    // Analyze content with AI
    const aiResult = await aiService.analyze(content);
    const { spam_score, toxicity_score, label } = aiResult;
    
    const isFlagged = label === 'SPAM' || label === 'TOXIC' || label === 'AI_UNAVAILABLE';
    const is_hidden = isFlagged;
    
    let depth = 0;
    let parentComment = null;
    if (parent_id) {
      parentComment = await commentRepository.findById(parent_id);
      if (parentComment) {
        depth = parentComment.depth + 1;
        
        if (depth >= MAX_COMMENT_DEPTH) {
          const error = new Error(`Maximum comment depth of ${MAX_COMMENT_DEPTH} exceeded`);
          error.statusCode = 400;
          throw error;
        }
      }
    }

    const commentData = {
      post_id,
      author: user_id,
      parent_id: parent_id || null,
      depth,
      content,
      spam_score,
      toxicity_score,
      label,
      is_hidden
    };

    const newComment = await commentRepository.create(commentData);

    // Notification Logic
    const Post = require('../models/Post');
    
    if (parent_id) {
      // It's a REPLY
      if (parentComment && parentComment.author.toString() !== user_id.toString()) {
        await notificationService.sendNotification({
          recipient: parentComment.author,
          sender: user_id,
          type: 'REPLY',
          entity_id: newComment._id,
          entity_model: 'Comment'
        });
      }
    } else {
      // It's a COMMENT on a Post
      const post = await Post.findById(post_id);
      if (post && post.author.toString() !== user_id.toString()) {
        await notificationService.sendNotification({
          recipient: post.author,
          sender: user_id,
          type: 'COMMENT',
          entity_id: newComment._id,
          entity_model: 'Comment'
        });
      }
    }

    // If AI flags as SPAM, TOXIC, or AI_UNAVAILABLE, push to ModerationQueue & ModerationLog
    if (isFlagged) {
      const reason = label === 'AI_UNAVAILABLE' 
        ? 'AI moderation service unavailable - queued for manual review' 
        : `AI detected ${label} (spam: ${spam_score}, toxicity: ${toxicity_score})`;

      await moderationRepository.addToQueue({
        target_type: label,
        target_id: newComment._id,
        target_model: 'Comment',
        reason,
        spam_score,
        toxicity_score,
        status: 'PENDING',
        reporter_id: null
      });

      await moderationRepository.createLog({
        target_id: newComment._id,
        target_model: 'Comment',
        action: 'QUEUED',
        reason: `Auto-queued by AI with label ${label}`
      });

      // Update user violation stats atomically (only for SPAM/TOXIC, not AI_UNAVAILABLE)
      if (isViolationLabel(label)) {
        const { spamDelta, toxicDelta } = getDeltasFromLabel(label);
        
        const updatedUser = await userRepository.incrementViolations(user_id, spamDelta, toxicDelta);
        
        if (updatedUser) {
          const status = getStatusFromScore(updatedUser.violationScore, updatedUser.status);
          
          if (status !== updatedUser.status) {
            await userRepository.update(user_id, { status });
          }
        }

        // Send system notification to user
        await notificationService.sendSystemNotification({
          recipient: user_id,
          type: 'AI_MODERATION',
          entity_id: newComment._id,
          entity_model: 'Comment',
          metadata: {
            ai_label: label,
            target_model: 'Comment',
            spam_score,
            toxicity_score,
            content_preview: content.slice(0, 300)
          }
        });
      }
    }

    return newComment;
  }

  async getCommentsByPost(post_id, skip = 0, limit = 20) {
    return commentRepository.findByPostId(post_id, skip, limit);
  }
}

module.exports = new CommentService();
