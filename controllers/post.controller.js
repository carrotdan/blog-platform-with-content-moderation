const postService = require('../services/post.service');
const { uploadToCloudinary } = require('../services/cloudinary.service');
const fs = require('fs');
const path = require('path');

class PostController {
  async createPost(req, res, next) {
    try {
      const { content_html, content_json, title, tags, visibility } = req.body;
      const files = req.files || [];
      
      let uploadedMedia = [];
      if (files.length > 0) {
        const uploadPromises = files.map(async (file, index) => {
          const isVideo = file.mimetype.startsWith('video/');
          try {
            if (!process.env.CLOUDINARY_API_KEY) throw new Error("No API Key");
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
          } catch (err) {
            // Fallback to local storage
            const uploadDir = path.join(__dirname, '..', 'uploads');
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }
            const ext = path.extname(file.originalname) || (isVideo ? '.mp4' : '.jpg');
            const filename = `media_${Date.now()}_${index}${ext}`;
            const filepath = path.join(uploadDir, filename);
            fs.writeFileSync(filepath, file.buffer);
            
            return {
              type: isVideo ? 'VIDEO' : 'IMAGE',
              url: `http://localhost:5000/uploads/${filename}`,
              public_id: filename,
              order_index: index
            };
          }
        });
        
        uploadedMedia = await Promise.all(uploadPromises);
      }

      const postData = {
        title: title || 'No Title', // Fallback
        content_html: content_html || req.body.content || '',
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

  // Lấy nội dung bài viết kể cả khi bị ẩn — chỉ dùng trong trường hợp kháng cáo
  async getPostContent(req, res, next) {
    try {
      const Post = require('../models/Post');
      const post = await Post.findById(req.params.id)
        .select('title content_html visibility author label');
      if (!post) {
        return res.status(404).json({ success: false, message: 'Post not found', data: null });
      }
      res.status(200).json({ success: true, data: post });
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

      if (!isAuthenticated) {
        // Strict limit for guests: only 5 posts, no pagination beyond that
        limit = 5;
        skip = 0;
        isLimited = true;
      }

      if (tag) {
        const tagsArray = tag.split(',').filter(t => t.trim());
        if (tagsArray.length > 0) {
          query.tags = { $in: tagsArray };
        }
      }

      const posts = await postService.listPosts(query, Number(skip) || 0, Number(limit) || 10, req.user?.id);
      
      res.status(200).json({ 
        success: true, 
        message: 'Posts retrieved', 
        data: posts,
        meta: {
          isLimited,
          total: isAuthenticated ? await postService.countPosts(query) : posts.length
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
