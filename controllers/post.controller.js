const postService = require('../services/post.service');
const { uploadToCloudinary, destroyAssets } = require('../services/cloudinary.service');
const { sanitizeHtml } = require('../utils/sanitize');

class PostController {
  async createPost(req, res, next) {
    try {
      const { content_html, content_json, title, tags, visibility } = req.body;
      const files = req.files || [];
      
      // Sanitize HTML content
      const sanitizedHtml = sanitizeHtml(content_html || req.body.content || '');
      
      let uploadedMedia = [];
      if (files.length > 0) {
        const uploaded = [];
        try {
          // H41: upload sequentially so we can track already-uploaded public_ids
          // and clean them up if a later file fails (avoids orphaned assets).
          for (const [index, file] of files.entries()) {
            const isVideo = file.mimetype.startsWith('video/');
            const result = await uploadToCloudinary(file.buffer, 'posts_media', isVideo ? 'video' : 'image');
            uploaded.push({
              type: isVideo ? 'VIDEO' : 'IMAGE',
              url: result.secure_url,
              public_id: result.public_id,
              width: result.width,
              height: result.height,
              duration: result.duration,
              order_index: index
            });
          }
          uploadedMedia = uploaded;
        } catch (error) {
          await destroyAssets(uploaded.map(m => m.public_id));
          throw error;
        }
      }

      let parsedContentJson = { text: req.body.content || '' };
      if (content_json) {
        if (typeof content_json === 'object') {
          parsedContentJson = content_json;
        } else {
          try {
            parsedContentJson = JSON.parse(content_json);
          } catch (err) {
            return res.status(400).json({ success: false, message: 'content_json must be valid JSON' });
          }
        }
      }

      const postData = {
        title: title || 'No Title', // Fallback
        content_html: sanitizedHtml,
        content_json: parsedContentJson,
        tags: Array.isArray(tags) ? tags : (typeof tags === 'string' && tags ? tags.split(',') : []),
        visibility: visibility || 'PUBLIC',
        media: uploadedMedia
      };

      const post = await postService.createPost(req.user.id, postData);
      
      // M17: Socket.io is registered on the socket.service module, not via
      // app.set('io'). Use getIO() so the real-time event actually fires.
      const { getIO } = require('../services/socket.service');
      const io = getIO();
      if (io && post.visibility === 'PUBLIC') {
        io.emit('new_post', post);
      }

      res.status(201).json({
        success: true,
        message: 'Post created successfully',
        data: post
      });
    } catch (error) {
      next(error);
    }
  }

  async repost(req, res, next) {
    try {
      const post = await postService.repostPost(req.user.id, req.params.id, req.body);
      res.status(201).json({
        success: true,
        message: 'Post reposted successfully',
        data: post
      });
    } catch (error) {
      next(error);
    }
  }

  async getPost(req, res, next) {
    try {
      const post = await postService.getPost(req.params.id, req.user?.id);
      if (!post) {
        return res.status(404).json({ success: false, message: 'Post not found', data: null });
      }
      res.status(200).json({ success: true, message: 'Post retrieved', data: post });
    } catch (error) {
      next(error);
    }
  }

  async getPostBySlug(req, res, next) {
    try {
      const post = await postService.getPostBySlug(req.params.slug, req.user?.id);
      if (!post) {
        return res.status(404).json({ success: false, message: 'Post not found', data: null });
      }
      res.status(200).json({ success: true, message: 'Post retrieved', data: post });
    } catch (error) {
      next(error);
    }
  }

  async listPosts(req, res, next) {
    try {
      let { skip, limit, tag } = req.query;
      const query = { visibility: 'PUBLIC', status: 'PUBLISHED' };
      
      const isAuthenticated = !!req.user;
      let isLimited = false;
      let maxPosts = 0;

      if (!isAuthenticated) {
        // Guests: allow pagination within first 5 posts
        limit = Math.min(Number(limit) || 5, 5);
        skip = Math.min(Number(skip) || 0, 5); // Cap skip at 5
        isLimited = true;
        maxPosts = 5;
      } else {
        limit = Number(limit) || 10;
        skip = Number(skip) || 0;
      }

      if (tag) {
        const tagsArray = tag.split(',').filter(t => t.trim());
        if (tagsArray.length > 0) {
          query.tags = { $in: tagsArray };
        }
      }

      const posts = await postService.listPosts(query, skip, limit, req.user?.id);
      const total = await postService.countPosts(query);
      const guestTotal = isLimited ? Math.min(total, maxPosts) : total;
      
      res.status(200).json({ 
        success: true, 
        message: 'Posts retrieved', 
        data: posts,
        meta: {
          isLimited,
          total: guestTotal,
          skip,
          limit
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async deletePost(req, res, next) {
    try {
      await postService.deletePost(req.params.id, req.user.id);
      res.status(200).json({ success: true, message: 'Post deleted successfully', data: null });
    } catch (error) {
      next(error);
    }
  }

  async updatePost(req, res, next) {
    try {
      // Sanitize HTML content if present
      if (req.body.content_html) {
        req.body.content_html = sanitizeHtml(req.body.content_html);
      }
      const post = await postService.updatePost(req.params.id, req.body, req.user.id);
      res.status(200).json({ success: true, message: 'Post updated successfully', data: post });
    } catch (error) {
      next(error);
    }
  }

  async getMyPosts(req, res, next) {
    try {
      const skip = Number(req.query.skip) || 0;
      const limit = Math.min(Number(req.query.limit) || 10, 50);
      const [posts, total] = await Promise.all([
        postService.getMyPosts(req.user.id, skip, limit),
        postService.countMyPosts(req.user.id)
      ]);
      res.status(200).json({
        success: true,
        message: 'User posts retrieved',
        data: posts,
        meta: { total, skip, limit }
      });
    } catch (error) {
      next(error);
    }
  }

  async getBookmarkedPosts(req, res, next) {
    try {
      const skip = Number(req.query.skip) || 0;
      const limit = Math.min(Number(req.query.limit) || 10, 50);
      const { posts, total } = await postService.getBookmarkedPosts(req.user.id, skip, limit);
      res.status(200).json({
        success: true,
        message: 'Bookmarked posts retrieved',
        data: posts,
        meta: { total, skip, limit }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PostController();
