const postService = require('../services/post.service');
const { uploadToCloudinary } = require('../services/cloudinary.service');
const fs = require('fs');
const path = require('path');
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
        const uploadPromises = files.map(async (file, index) => {
          const isVideo = file.mimetype.startsWith('video/');
          const result = await uploadToCloudinary(file.buffer, 'posts_media', isVideo ? 'video' : 'image');
          return {
            type: isVideo ? 'VIDEO' : 'IMAGE',
            url: result.secure_url,
            public_id: result.public_id,
            width: result.width,
            height: result.height,
            duration: result.duration,
            order_index: index
          };
        });
        
        uploadedMedia = await Promise.all(uploadPromises);
      }

      const postData = {
        title: title || 'No Title', // Fallback
        content_html: sanitizedHtml,
        content_json: content_json ? JSON.parse(content_json) : { text: req.body.content || '' },
        tags: tags ? tags.split(',') : [],
        visibility: visibility || 'PUBLIC',
        media: uploadedMedia
      };

      const post = await postService.createPost(req.user.id, postData);
      
      const io = req.app.get('io');
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
      const query = { visibility: 'PUBLIC' };
      
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
      const posts = await postService.getMyPosts(req.user.id);
      res.status(200).json({ success: true, message: 'User posts retrieved', data: posts });
    } catch (error) {
      next(error);
    }
  }

  async getBookmarkedPosts(req, res, next) {
    try {
      const posts = await postService.getBookmarkedPosts(req.user.id);
      res.status(200).json({ success: true, message: 'Bookmarked posts retrieved', data: posts });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PostController();
