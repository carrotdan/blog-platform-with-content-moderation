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
    
    // H26: Validate the target post exists and is commentable BEFORE creating
    const Post = require('../models/Post');
    const post = await Post.findById(post_id);
    if (!post) {
      const error = new Error('Post not found');
      error.statusCode = 404;
      throw error;
    }
    if (post.visibility === 'HIDDEN') {
      const error = new Error('Cannot comment on a hidden post');
      error.statusCode = 403;
      throw error;
    }
    if (post.visibility === 'PRIVATE' && post.author.toString() !== user_id.toString()) {
      const error = new Error('Cannot comment on a private post');
      error.statusCode = 403;
      throw error;
    }

    // Analyze content with AI
    const aiResult = await aiService.analyze(content);
    const { spam_score, toxicity_score, label } = aiResult;
    
    const isFlagged = label === 'SPAM' || label === 'TOXIC' || label === 'AI_UNAVAILABLE';
    const is_hidden = isFlagged;
    
    let depth = 0;
    let parentComment = null;
    if (parent_id) {
      parentComment = await commentRepository.findById(parent_id);
      // H46: a provided parent_id that doesn't resolve must be a 404, not a
      // silent downgrade to a top-level comment (that created orphan replies).
      if (!parentComment) {
        const error = new Error('Parent comment not found');
        error.statusCode = 404;
        throw error;
      }
      // H37: replies to AI/moderator-hidden comments are not allowed
      if (parentComment.is_hidden) {
        const error = new Error('Cannot reply to a hidden comment');
        error.statusCode = 400;
        throw error;
      }
      // Ensure the reply belongs to the same post
      if (parentComment.post_id.toString() !== post_id.toString()) {
        const error = new Error('Parent comment does not belong to this post');
        error.statusCode = 400;
        throw error;
      }
      depth = parentComment.depth + 1;

      if (depth >= MAX_COMMENT_DEPTH) {
        const error = new Error(`Maximum comment depth of ${MAX_COMMENT_DEPTH} exceeded`);
        error.statusCode = 400;
        throw error;
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

    // Notification Logic — H37: never notify for AI-flagged (hidden) comments,
    // otherwise recipients get notifications for content they cannot see.
    if (!is_hidden) {
      if (parent_id) {
        // It's a REPLY
        // H27: author is populated here, so compare against _id, not toString()
        if (parentComment && parentComment.author._id.toString() !== user_id.toString()) {
          await notificationService.sendNotification({
            recipient: parentComment.author._id,
            sender: user_id,
            type: 'REPLY',
            entity_id: newComment._id,
            entity_model: 'Comment'
          });
        }
      } else {
        // It's a COMMENT on a Post (post already loaded above)
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

  async getCommentsByPost(post_id, current_user_id = null, skip = 0, limit = 20) {
    // H36: Enforce the same visibility rules as getPost — comments under a post
    // that was made PRIVATE/HIDDEN must not be exposed. Only the author may view
    // comments of their own non-PUBLIC posts; everyone else needs PUBLIC.
    const Post = require('../models/Post');
    const post = await Post.findById(post_id);
    if (!post) {
      const error = new Error('Post not found');
      error.statusCode = 404;
      throw error;
    }

    const isOwner = current_user_id && post.author.toString() === current_user_id.toString();
    if (post.visibility !== 'PUBLIC' && !isOwner) {
      const error = new Error('Post not found');
      error.statusCode = 404;
      throw error;
    }

    return commentRepository.findByPostId(post_id, skip, limit);
  }

  async getCommentById(comment_id, current_user_id = null) {
    // H42: single-comment reads must enforce the same parent-post visibility
    // rules as getCommentsByPost — a comment under a PRIVATE/HIDDEN post is
    // only readable by that post's author, everyone else needs PUBLIC.
    const comment = await commentRepository.findById(comment_id);
    if (!comment) {
      const error = new Error('Comment not found');
      error.statusCode = 404;
      throw error;
    }

    const Post = require('../models/Post');
    const post = await Post.findById(comment.post_id);
    if (!post) {
      const error = new Error('Post not found');
      error.statusCode = 404;
      throw error;
    }

    const isOwner = current_user_id && post.author.toString() === current_user_id.toString();
    if (post.visibility !== 'PUBLIC' && !isOwner) {
      const error = new Error('Post not found');
      error.statusCode = 404;
      throw error;
    }

    return comment;
  }
}

module.exports = new CommentService();
