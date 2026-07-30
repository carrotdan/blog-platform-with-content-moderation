const postRepository = require('../repositories/post.repo');
const interactionRepository = require('../repositories/interaction.repo');
const Post = require('../models/Post');
const moderationRepository = require('../repositories/moderation.repo');
const userRepository = require('../repositories/user.repo');
const notificationService = require('./notification.service');

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
      // Hide completely if AI flags as SPAM, TOXIC, or AI_UNAVAILABLE — wait for admin review
      visibility: isFlagged ? 'HIDDEN' : (data.visibility || 'PUBLIC')
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
      if (label === 'SPAM' || label === 'TOXIC') {
        const spamDelta = label === 'SPAM' ? 1 : 0;
        const toxicDelta = label === 'TOXIC' ? 1 : 0;
        
        // Atomically increment violation counts
        const updatedUser = await userRepository.incrementViolations(user_id, spamDelta, toxicDelta);
        
        if (updatedUser) {
          let status = updatedUser.status;
          if (status !== 'BANNED') {
            if (updatedUser.violationScore >= 10) status = 'BANNED';
            else if (updatedUser.violationScore >= 5) status = 'WARNING';
          }
          
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
    
    const postData = {
      author: user_id,
      title: `Repost: ${originalPost.title}`,
      slug: `repost-${originalPost._id}-${Date.now()}`,
      content_html: data.content_html || '<p></p>',
      content_json: data.content_json || {},
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      original_post: original_post_id,
      reading_time: 1
    };
    
    const newPost = await postRepository.create(postData);
    
    // Create notification
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
    return postRepository.delete(id);
  }

  async getMyPosts(user_id) {
    const posts = await postRepository.findByAuthor(user_id);
    return this._enrichPosts(posts, user_id);
  }

  async getPostsByUser(user_id, current_user_id = null) {
    const posts = await postRepository.findByAuthor(user_id);
    return this._enrichPosts(posts, current_user_id);
  }

  async getBookmarkedPosts(user_id) {
    const Interaction = require('../models/Interaction');
    
    const interactions = await Interaction.find({ user_id, type: 'BOOKMARK', target_model: 'Post' }).sort({ createdAt: -1 });
    const postIds = interactions.map(i => i.target_id);
    
    const posts = await Post.find({ _id: { $in: postIds } }).populate('author', 'username avatar');
    
    // Maintain the order of bookmarks
    const postMap = posts.reduce((acc, post) => {
      acc[post._id.toString()] = post;
      return acc;
    }, {});
    
    const orderedPosts = postIds.map(id => postMap[id.toString()]).filter(Boolean);
    return this._enrichPosts(orderedPosts, user_id);
  }

  async _enrichPosts(posts, current_user_id) {
    const postIds = posts.map(p => p._id);
    const likedPostIds = current_user_id ? await interactionRepository.findUserInteractions(current_user_id, postIds, 'LIKE') : [];
    const bookmarkedPostIds = current_user_id ? await interactionRepository.findUserInteractions(current_user_id, postIds, 'BOOKMARK') : [];

    let repostedPostIds = [];
    if (current_user_id) {
      const userReposts = await Post.find({ author: current_user_id, original_post: { $in: postIds } });
      repostedPostIds = userReposts.map(rp => rp.original_post.toString());
    }

    return Promise.all(posts.map(async (p) => {
      const pObj = p.toObject();
      pObj.likesCount = await interactionRepository.countInteractions(p._id, 'LIKE');
      pObj.bookmarksCount = await interactionRepository.countInteractions(p._id, 'BOOKMARK');
      pObj.sharesCount = await postRepository.countReposts(p._id);
      pObj.isLiked = likedPostIds.includes(p._id.toString());
      pObj.isBookmarked = bookmarkedPostIds.includes(p._id.toString());
      pObj.isReposted = repostedPostIds.includes(p._id.toString());
      return pObj;
    }));
  }

  async countPosts(query) {
    return Post.countDocuments(query);
  }

  generateUniqueSlug(baseTitle) {
    const baseSlug = baseTitle.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${baseSlug}-${timestamp}-${random}`;
  }
}

module.exports = new PostService();
