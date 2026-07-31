const postRepository = require('../repositories/post.repo');
const interactionRepository = require('../repositories/interaction.repo');
const Post = require('../models/Post');
const mongoose = require('mongoose');
const moderationRepository = require('../repositories/moderation.repo');
const userRepository = require('../repositories/user.repo');
const notificationService = require('./notification.service');
const { getStatusFromScore, getViolationDeltas, isViolationLabel } = require('../utils/violation');
const { randomUUID } = require('crypto');

class PostService {
  async createPost(user_id, data) {
    // Calculate reading time (avg 200 words per minute)
    const bodyText = data.content_html ? data.content_html.replace(/<[^>]+>/g, ' ') : '';
    const wordCount = bodyText.trim().split(/\s+/).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    const titleForSlug = data.title || bodyText.slice(0, 20) || 'post';
    
    // Analyze content with AI (combine title + content for more accurate analysis)
    const aiService = require('./ai.service');
    const analyzeText = [data.title || '', bodyText].filter(Boolean).join(' ').trim();
    const aiResult = await aiService.analyze(analyzeText);
    const { spam_score, toxicity_score, label } = aiResult;
    
    const isFlagged = label === 'SPAM' || label === 'TOXIC' || label === 'AI_UNAVAILABLE';

    const postData = {
      ...data,
      author: user_id,
      slug: this.generateUniqueSlug(titleForSlug),
      content_json: data.content_json,
      content_html: data.content_html,
      tags: data.tags || [],
      reading_time: readingTime,
      is_sensitive: false,
      // H25: Posts are created published (DRAFT state machine is not exposed via API)
      status: 'PUBLISHED',
      // Hide completely if AI flags as SPAM, TOXIC, or AI_UNAVAILABLE — wait for admin review
      visibility: isFlagged ? 'HIDDEN' : (data.visibility || 'PUBLIC'),
      // C23: Persist the AI moderation result on the post itself (was silently
      // dropped by the create path, so every post stored the default NORMAL).
      spam_score,
      toxicity_score,
      label
    };

    const newPost = await postRepository.create(postData);

    // If AI flags as SPAM, TOXIC, or AI_UNAVAILABLE, push to ModerationQueue
    if (isFlagged) {
      const reason = label === 'AI_UNAVAILABLE' 
        ? 'AI moderation service unavailable - queued for manual review' 
        : `AI detected ${label} (spam: ${spam_score}, toxicity: ${toxicity_score})`;

      await moderationRepository.addToQueue({
        target_type: label,
        target_id: newPost._id,
        target_model: 'Post',
        reason,
        spam_score,
        toxicity_score,
        status: 'PENDING',
        reporter_id: null
      });
      
      // Update user violation stats atomically (only for SPAM/TOXIC, not AI_UNAVAILABLE)
      if (isViolationLabel(label)) {
        const { spamDelta, toxicDelta } = getViolationDeltas(label);
        
        // Atomically increment violation counts
        const updatedUser = await userRepository.incrementViolations(user_id, spamDelta, toxicDelta);
        
        if (updatedUser) {
          const status = getStatusFromScore(updatedUser.violationScore, updatedUser.status);
          
          if (status !== updatedUser.status) {
            await userRepository.update(user_id, { status });
          }
        }

        // Send system notification to user
        const contentPreview = [
          data.title && data.title !== 'No Title' ? data.title : '',
          bodyText.slice(0, 200)
        ].filter(Boolean).join('\n').trim();

        await notificationService.sendSystemNotification({
          recipient: user_id,
          type: 'AI_MODERATION',
          entity_id: newPost._id,
          entity_model: 'Post',
          metadata: {
            ai_label: label,
            target_model: 'Post',
            spam_score,
            toxicity_score,
            content_preview: contentPreview.slice(0, 300)
          }
        });
      }
    }

    return newPost;
  }

  async repostPost(user_id, original_post_id, data = {}) {
    // Check if already reposted
    const existingRepost = await postRepository.findOne({
      author: user_id,
      original_post: original_post_id
    });
    
    if (existingRepost) {
      await postRepository.delete(existingRepost._id);
      return { action: 'unreposted' };
    }

    const originalPost = await postRepository.findById(original_post_id);
    if (!originalPost) throw new Error('Original post not found');
    if (originalPost.visibility === 'PRIVATE') throw new Error('Cannot repost a private post');
    if (originalPost.author._id.toString() === user_id.toString()) throw new Error('Cannot repost your own post');
    
    // Analyze repost content with AI (if user adds commentary)
    let aiResult = { spam_score: 0.05, toxicity_score: 0.05, label: 'NORMAL' };
    let isFlagged = false;
    
    if (data.content_html && data.content_html.trim() !== '<p></p>') {
      const aiService = require('./ai.service');
      const bodyText = data.content_html.replace(/<[^>]+>/g, ' ');
      const analyzeText = [data.title || '', bodyText].filter(Boolean).join(' ').trim();
      if (analyzeText) {
        aiResult = await aiService.analyze(analyzeText);
        isFlagged = aiResult.label === 'SPAM' || aiResult.label === 'TOXIC' || aiResult.label === 'AI_UNAVAILABLE';
      }
    }

    const postData = {
      author: user_id,
      title: data.title || `Repost: ${originalPost.title}`,
      slug: this.generateUniqueSlug(`repost-${originalPost._id}`),
      content_html: data.content_html || '<p></p>',
      content_json: data.content_json || {},
      status: 'PUBLISHED',
      visibility: isFlagged ? 'HIDDEN' : 'PUBLIC',
      original_post: original_post_id,
      reading_time: 1,
      spam_score: aiResult.spam_score,
      toxicity_score: aiResult.toxicity_score,
      label: aiResult.label
    };
    
    const newPost = await postRepository.create(postData);

    // If flagged, add to moderation queue
    if (isFlagged) {
      const moderationRepository = require('../repositories/moderation.repo');
      await moderationRepository.addToQueue({
        target_type: aiResult.label,
        target_id: newPost._id,
        target_model: 'Post',
        reason: aiResult.label === 'AI_UNAVAILABLE' 
          ? 'AI moderation service unavailable - queued for manual review' 
          : `AI detected ${aiResult.label} on repost (spam: ${aiResult.spam_score}, toxicity: ${aiResult.toxicity_score})`,
        spam_score: aiResult.spam_score,
        toxicity_score: aiResult.toxicity_score,
        status: 'PENDING',
        reporter_id: null
      });

      // Update user violations for SPAM/TOXIC (not AI_UNAVAILABLE)
      if (aiResult.label === 'SPAM' || aiResult.label === 'TOXIC') {
        const userRepository = require('../repositories/user.repo');
        const notificationService = require('./notification.service');
        
        const { spamDelta, toxicDelta } = getViolationDeltas(aiResult.label);
        const updatedUser = await userRepository.incrementViolations(user_id, spamDelta, toxicDelta);
        
        if (updatedUser) {
          const status = getStatusFromScore(updatedUser.violationScore, updatedUser.status);
          if (status !== updatedUser.status) {
            await userRepository.update(user_id, { status });
          }
        }

        const contentPreview = data.content_html 
          ? data.content_html.replace(/<[^>]+>/g, ' ').slice(0, 200)
          : '(no additional content)';

        await notificationService.sendSystemNotification({
          recipient: user_id,
          type: 'AI_MODERATION',
          entity_id: newPost._id,
          entity_model: 'Post',
          metadata: {
            ai_label: aiResult.label,
            target_model: 'Post',
            spam_score: aiResult.spam_score,
            toxicity_score: aiResult.toxicity_score,
            content_preview: contentPreview.slice(0, 300)
          }
        });
      }
    }

    // Create notification for original author
    const notificationService = require('./notification.service');
    
    await notificationService.sendNotification({
      recipient: originalPost.author._id,
      sender: user_id,
      type: 'REPOST',
      entity_id: newPost._id,
      entity_model: 'Post'
    });
    
    return newPost;
  }

  async getPost(id, current_user_id = null) {
    const post = await postRepository.findById(id);
    if (!post) return null;
    
    // C21: Only the author may view their own non-PUBLIC posts (PRIVATE/HIDDEN);
    // everyone else only sees PUBLIC posts.
    const isOwner = current_user_id && post.author._id.toString() === current_user_id.toString();
    if (post.visibility !== 'PUBLIC' && !isOwner) {
      return null;
    }
    
    const postObj = post.toObject();
    postObj.likesCount = await interactionRepository.countInteractions(id, 'LIKE');
    postObj.bookmarksCount = await interactionRepository.countInteractions(id, 'BOOKMARK');
    postObj.sharesCount = await postRepository.countReposts(id);
    
    if (current_user_id) {
      postObj.isLiked = !!(await interactionRepository.findInteraction(current_user_id, id, 'LIKE'));
      postObj.isBookmarked = !!(await interactionRepository.findInteraction(current_user_id, id, 'BOOKMARK'));
      postObj.isReposted = !!(await postRepository.findOne({ author: current_user_id, original_post: id }));
    }
    
    return postObj;
  }

  async getPostBySlug(slug, current_user_id = null) {
    const post = await postRepository.findBySlug(slug);
    if (!post) return null;
    
    // C21: Only the author may view their own non-PUBLIC posts (PRIVATE/HIDDEN);
    // everyone else only sees PUBLIC posts.
    const isOwner = current_user_id && post.author._id.toString() === current_user_id.toString();
    if (post.visibility !== 'PUBLIC' && !isOwner) {
      return null;
    }
    
    const postObj = post.toObject();
    postObj.likesCount = await interactionRepository.countInteractions(post._id, 'LIKE');
    postObj.bookmarksCount = await interactionRepository.countInteractions(post._id, 'BOOKMARK');
    postObj.sharesCount = await postRepository.countReposts(post._id);
    
    if (current_user_id) {
      postObj.isLiked = !!(await interactionRepository.findInteraction(current_user_id, post._id, 'LIKE'));
      postObj.isBookmarked = !!(await interactionRepository.findInteraction(current_user_id, post._id, 'BOOKMARK'));
      postObj.isReposted = !!(await postRepository.findOne({ author: current_user_id, original_post: post._id }));
    }
    
    return postObj;
  }

async updatePost(id, data, user_id) {
    const post = await postRepository.findById(id);
    if (!post) throw new Error('Post not found');
    if (post.author._id.toString() !== user_id.toString()) {
      throw new Error('Unauthorized to edit this post');
    }
    
    const updateData = {};
    if (data.title) updateData.title = data.title;
    if (data.content_json) updateData.content_json = data.content_json;
    if (data.content_html) {
      updateData.content_html = data.content_html;
      // Recalculate reading time
      const text = data.content_html.replace(/<[^>]+>/g, ' ');
      const wordCount = text.trim().split(/\s+/).length;
      updateData.reading_time = Math.max(1, Math.ceil(wordCount / 200));
    }
    if (data.tags) updateData.tags = data.tags;

    // H32: Re-run AI moderation whenever the title or body changes (a title-only
    // edit previously skipped analysis, letting users retitle posts with
    // toxic/spam text that stayed PUBLIC with stale scores).
    const contentChanged = !!(data.content_html || data.content_json || data.title);
    if (contentChanged) {
      const aiService = require('./ai.service');
      const bodyText = data.content_html ? data.content_html.replace(/<[^>]+>/g, ' ') : '';
      const analyzeText = [data.title || post.title || '', bodyText].filter(Boolean).join(' ').trim();
      const aiResult = await aiService.analyze(analyzeText);
      const { spam_score, toxicity_score, label } = aiResult;
      const isFlagged = label === 'SPAM' || label === 'TOXIC' || label === 'AI_UNAVAILABLE';

      updateData.spam_score = spam_score;
      updateData.toxicity_score = toxicity_score;
      updateData.label = label;

      // H33: Do NOT auto-unhide content that is currently HIDDEN — that state is
      // cleared only by an explicit moderation action (queue review / appeal
      // approval). Editing a hidden post to clean content keeps it HIDDEN.
      if (isFlagged) {
        updateData.visibility = 'HIDDEN';
      } else if (post.visibility === 'HIDDEN') {
        updateData.visibility = 'HIDDEN';
      } else {
        updateData.visibility = data.visibility || post.visibility || 'PUBLIC';
      }

      if (isFlagged) {
        const moderationRepository = require('../repositories/moderation.repo');
        await moderationRepository.addToQueue({
          target_type: label,
          target_id: post._id,
          target_model: 'Post',
          reason: label === 'AI_UNAVAILABLE' 
            ? 'AI moderation service unavailable - queued for manual review' 
            : `AI detected ${label} on update (spam: ${spam_score}, toxicity: ${toxicity_score})`,
          spam_score,
          toxicity_score,
          status: 'PENDING',
          reporter_id: null
        });

        if (isViolationLabel(label)) {
          const userRepository = require('../repositories/user.repo');
          const notificationService = require('./notification.service');
          
          const { spamDelta, toxicDelta } = getViolationDeltas(label);
          const updatedUser = await userRepository.incrementViolations(user_id, spamDelta, toxicDelta);
          
          if (updatedUser) {
            const status = getStatusFromScore(updatedUser.violationScore, updatedUser.status);
            if (status !== updatedUser.status) {
              await userRepository.update(user_id, { status });
            }
          }

          const contentPreview = [
            data.title && data.title !== 'No Title' ? data.title : '',
            bodyText.slice(0, 200)
          ].filter(Boolean).join('\n').trim();

          await notificationService.sendSystemNotification({
            recipient: user_id,
            type: 'AI_MODERATION',
            entity_id: post._id,
            entity_model: 'Post',
            metadata: {
              ai_label: label,
              target_model: 'Post',
              spam_score,
              toxicity_score,
              content_preview: contentPreview.slice(0, 300)
            }
          });
        }
      }
    }
  
    return postRepository.update(id, updateData);
  }

  async listPosts(query = {}, skip = 0, limit = 10, current_user_id = null) {
    const posts = await postRepository.findAll(query, skip, limit);
    return this._enrichPosts(posts, current_user_id);
  }

  async deletePost(id, user_id) {
    const post = await postRepository.findById(id);
    if (!post) throw new Error('Post not found');
    if (post.author._id.toString() !== user_id.toString()) {
      throw new Error('Unauthorized to delete this post');
    }
    const deleted = await postRepository.delete(id);
    // M18: Clean up Cloudinary assets for the deleted post
    if (deleted) {
      const { destroyAssets } = require('./cloudinary.service');
      const publicIds = (deleted.media || []).map(m => m.public_id);
      await destroyAssets(publicIds);
      // M37: cascade the dependent records (comments, reposts, interactions,
      // moderation-queue items, reports, appeals) so no dangling references remain.
      await this.cascadeDeletePost(id);
    }
    return deleted;
  }

  // M37: remove every record that references the post so deleting a post cannot
  // leave orphaned comments/reposts/queue items/reports/appeals behind. Reposts
  // are posts themselves, so they are cascaded recursively (including their own
  // media and dependents).
  async cascadeDeletePost(postId) {
    const Post = require('../models/Post');
    const Comment = require('../models/Comment');
    const Interaction = require('../models/Interaction');
    const ModerationQueue = require('../models/ModerationQueue');
    const Report = require('../models/Report');
    const Appeal = require('../models/Appeal');

    const reposts = await Post.find({ original_post: postId });
    for (const repost of reposts) {
      await this.cascadeDeletePost(repost._id);
      const { destroyAssets } = require('./cloudinary.service');
      await destroyAssets((repost.media || []).map(m => m.public_id));
    }

    const comments = await Comment.find({ post_id: postId }).select('_id');
    const commentIds = comments.map(c => c._id);

    await Interaction.deleteMany({
      $or: [
        { target_model: 'Post', target_id: postId },
        { target_model: 'Comment', target_id: { $in: commentIds } }
      ]
    });

    await Comment.deleteMany({ post_id: postId });

    await ModerationQueue.deleteMany({
      $or: [
        { target_model: 'Post', target_id: postId },
        { target_model: 'Comment', target_id: { $in: commentIds } }
      ]
    });

    await Report.deleteMany({
      $or: [
        { target_model: 'Post', target_id: postId },
        { target_model: 'Comment', target_id: { $in: commentIds } }
      ]
    });

    await Appeal.deleteMany({
      $or: [
        { target_model: 'Post', target_id: postId },
        { target_model: 'Comment', target_id: { $in: commentIds } }
      ]
    });
  }

  async getMyPosts(user_id, skip = 0, limit = 10) {
    const posts = await postRepository.findByAuthor(user_id, skip, limit, { includeAll: true });
    return this._enrichPosts(posts, user_id);
  }

  async countMyPosts(user_id) {
    return postRepository.countByAuthor(user_id);
  }

  async getPostsByUser(user_id, current_user_id = null, skip = 0, limit = 10) {
    // C22: The profile owner sees all their posts; everyone else only gets PUBLIC ones.
    const isOwner = current_user_id && current_user_id.toString() === user_id.toString();
    const posts = await postRepository.findByAuthor(user_id, skip, limit, { includeAll: !!isOwner });
    return this._enrichPosts(posts, current_user_id);
  }

  async getBookmarkedPosts(user_id, skip = 0, limit = 10) {
    const Interaction = require('../models/Interaction');
    // Aggregate $match stages are not auto-cast by Mongoose, so convert the
    // string userId (from req.user.id) to an ObjectId before matching.
    const userObjId = typeof user_id === 'string' ? new mongoose.Types.ObjectId(user_id) : user_id;
    
    // L31: total must only count bookmarks whose target post still exists and
    // is not HIDDEN — deleted/moderated targets were previously counted even
    // though they can never be returned, making pagination meta inaccurate.
    const [totalAgg] = await Interaction.aggregate([
      { $match: { user_id: userObjId, type: 'BOOKMARK', target_model: 'Post' } },
      { $lookup: { from: 'posts', localField: 'target_id', foreignField: '_id', as: 'post' } },
      { $unwind: '$post' },
      { $match: { 'post.visibility': { $ne: 'HIDDEN' }, 'post.status': 'PUBLISHED' } },
      { $count: 'total' }
    ]);
    const total = totalAgg ? totalAgg.total : 0;

    const interactions = await Interaction.find({ user_id, type: 'BOOKMARK', target_model: 'Post' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const postIds = interactions.map(i => i.target_id);
    
    const posts = await Post.find({
      _id: { $in: postIds },
      visibility: { $ne: 'HIDDEN' },
      status: 'PUBLISHED'
    }).populate('author', 'username avatar');
    
    // Maintain the order of bookmarks
    const postMap = posts.reduce((acc, post) => {
      acc[post._id.toString()] = post;
      return acc;
    }, {});
    
    const orderedPosts = postIds.map(id => postMap[id.toString()]).filter(Boolean);
    const enriched = await this._enrichPosts(orderedPosts, user_id);
    return { posts: enriched, total };
  }

  async _enrichPosts(posts, current_user_id) {
    const postIds = posts.map(p => p._id);
    const postIdStrings = postIds.map(id => id.toString());
    
    const [likedPostIds, bookmarkedPostIds, likesCounts, bookmarksCounts, sharesCounts] = await Promise.all([
      current_user_id ? interactionRepository.findUserInteractions(current_user_id, postIds, 'LIKE') : Promise.resolve([]),
      current_user_id ? interactionRepository.findUserInteractions(current_user_id, postIds, 'BOOKMARK') : Promise.resolve([]),
      interactionRepository.countInteractionsBatch(postIds, 'LIKE'),
      interactionRepository.countInteractionsBatch(postIds, 'BOOKMARK'),
      postRepository.countRepostsBatch(postIdStrings)
    ]);

    let repostedPostIds = [];
    if (current_user_id) {
      const userReposts = await Post.find({ author: current_user_id, original_post: { $in: postIds } });
      repostedPostIds = userReposts.map(rp => rp.original_post.toString());
    }

    return posts.map(p => {
      const pObj = p.toObject();
      const idStr = p._id.toString();
      pObj.likesCount = likesCounts[idStr] || 0;
      pObj.bookmarksCount = bookmarksCounts[idStr] || 0;
      pObj.sharesCount = sharesCounts[idStr] || 0;
      pObj.isLiked = likedPostIds.includes(idStr);
      pObj.isBookmarked = bookmarkedPostIds.includes(idStr);
      pObj.isReposted = repostedPostIds.includes(idStr);
      return pObj;
    });
  }

  async countPosts(query) {
    return Post.countDocuments(query);
  }

  generateUniqueSlug(baseTitle) {
    const baseSlug = baseTitle.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const uuid = randomUUID().replace(/-/g, '').slice(0, 12);
    return `${baseSlug}-${uuid}`;
  }
}

module.exports = new PostService();
