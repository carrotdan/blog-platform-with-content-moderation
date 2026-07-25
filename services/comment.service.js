const commentRepository = require('../repositories/comment.repo');
const moderationRepository = require('../repositories/moderation.repo');
const userRepository = require('../repositories/user.repo');
const aiService = require('./ai.service');

class CommentService {
  async createComment(user_id, data) {
    const { post_id, parent_id, content } = data;
    
    // Analyze content with AI
    const aiResult = await aiService.analyze(content);
    const { spam_score, toxicity_score, label } = aiResult;
    
    const is_hidden = label === 'SPAM' || label === 'TOXIC'; // ẩn cả SPAM lẫn TOXIC
    
    let depth = 0;
    if (parent_id) {
      const parentComment = await commentRepository.findById(parent_id);
      if (parentComment) {
        depth = parentComment.depth + 1;
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
    const notificationService = require('./notification.service');
    const Post = require('../models/Post');
    
    if (parent_id) {
      // It's a REPLY
      const parentComment = await commentRepository.findById(parent_id);
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

    // If AI flags as SPAM or TOXIC, push to ModerationQueue & ModerationLog
    if (label === 'SPAM' || label === 'TOXIC') {
      await moderationRepository.addToQueue({
        target_id: newComment._id,
        target_model: 'Comment',
        reason: `AI Flagged as ${label}`,
        spam_score,
        toxicity_score,
        status: 'PENDING'
      });

      await moderationRepository.createLog({
        target_id: newComment._id,
        target_model: 'Comment',
        action: 'QUEUED',
        reason: `Auto-queued by AI with label ${label}`
      });

      // Update user violation stats
      const user = await userRepository.findById(user_id);
      if (user) {
        let { spamCount, toxicCount } = user;
        if (label === 'SPAM') spamCount += 1;
        if (label === 'TOXIC') toxicCount += 1;
        const violationScore = (spamCount * 1) + (toxicCount * 3); // Example scoring
        
        // Auto-status updates based on score
        let status = user.status;
        if (status !== 'BANNED') {
          if (violationScore >= 10) status = 'BANNED';
          else if (violationScore >= 5) status = 'WARNING';
        }

        await userRepository.update(user_id, { spamCount, toxicCount, violationScore, status });
      }

      // Gửi thông báo hệ thống cho user
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
          content_preview: content.slice(0, 300)  // nội dung bình luận gốc
        }
      });
    }

    return newComment;
  }

  async getCommentsByPost(post_id, skip = 0, limit = 20) {
    return commentRepository.findByPostId(post_id, skip, limit);
  }
}

module.exports = new CommentService();
