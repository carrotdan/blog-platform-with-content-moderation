const userRepository = require('../repositories/user.repo');
const User = require('../models/User');

class AdminController {
  async getViolations(req, res, next) {
    try {
      // Fetch all users using repository
      const users = await userRepository.findAll();
      
      // Sort by violation score descending
      users.sort((a, b) => (b.violationScore || 0) - (a.violationScore || 0));

      // Map to desired response format
      const data = users.map(u => ({
        userId: u._id.toString(),
        email: u.email,
        spamCount: u.spamCount || 0,
        toxicCount: u.toxicCount || 0,
        violationScore: u.violationScore || 0,
        status: u.status || 'ACTIVE'
      }));

      res.status(200).json({ success: true, message: 'Violations retrieved', data });
    } catch (error) {
      next(error);
    }
  }

  async getUsers(req, res, next) {
    try {
      const users = await User.find().select('-password').sort({ createdAt: -1 });
      res.status(200).json({ success: true, message: 'Users retrieved', data: users });
    } catch (error) {
      next(error);
    }
  }

  async changeRole(req, res, next) {
    try {
      const { role } = req.body;
      const user = await userRepository.update(req.params.id, { role });
      res.status(200).json({ success: true, message: 'Role updated', data: user });
    } catch (error) {
      next(error);
    }
  }

  async getPosts(req, res, next) {
    try {
      const Post = require('../models/Post');
      const posts = await Post.find()
        .populate('author', 'username email avatar')
        .sort({ createdAt: -1 });
      res.status(200).json({ success: true, message: 'All posts retrieved', data: posts });
    } catch (error) {
      next(error);
    }
  }

  async hidePost(req, res, next) {
    try {
      const Post = require('../models/Post');
      const post = await Post.findByIdAndUpdate(req.params.id, { visibility: 'HIDDEN' }, { new: true });
      res.status(200).json({ success: true, message: 'Post hidden', data: post });
    } catch (error) {
      next(error);
    }
  }

  async unhidePost(req, res, next) {
    try {
      const Post = require('../models/Post');
      const post = await Post.findByIdAndUpdate(req.params.id, { visibility: 'PUBLIC' }, { new: true });
      res.status(200).json({ success: true, message: 'Post restored', data: post });
    } catch (error) {
      next(error);
    }
  }

  async markSensitive(req, res, next) {
    try {
      const Post = require('../models/Post');
      const post = await Post.findByIdAndUpdate(req.params.id, { is_sensitive: true }, { new: true });
      res.status(200).json({ success: true, message: 'Post marked as sensitive', data: post });
    } catch (error) {
      next(error);
    }
  }

  async unmarkSensitive(req, res, next) {
    try {
      const Post = require('../models/Post');
      const post = await Post.findByIdAndUpdate(req.params.id, { is_sensitive: false }, { new: true });
      res.status(200).json({ success: true, message: 'Sensitive mark removed', data: post });
    } catch (error) {
      next(error);
    }
  }

  async getReports(req, res, next) {
    try {
      const Report = require('../models/Report');
      const Post = require('../models/Post');
      const Comment = require('../models/Comment');
      
      const reports = await Report.find({ status: 'PENDING' })
        .populate('reporter_id', 'username email')
        .sort({ createdAt: -1 });
      
      const enrichedReports = await Promise.all(reports.map(async (report) => {
        const reportObj = report.toObject();
        if (report.target_model === 'Post') {
          const post = await Post.findById(report.target_id).select('content_html slug');
          reportObj.target_data = post;
        } else if (report.target_model === 'Comment') {
          const comment = await Comment.findById(report.target_id).select('content');
          reportObj.target_data = comment;
        }
        return reportObj;
      }));

      res.status(200).json({ success: true, message: 'Reports retrieved', data: enrichedReports });
    } catch (error) {
      next(error);
    }
  }

  async resolveReport(req, res, next) {
    try {
      const { action } = req.body; // 'HIDE' or 'DISMISS'
      const Report = require('../models/Report');
      const Post = require('../models/Post');
      const Comment = require('../models/Comment');
      
      const report = await Report.findById(req.params.id);
      if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

      if (action === 'HIDE') {
        if (report.target_model === 'Post') {
          await Post.findByIdAndUpdate(report.target_id, { visibility: 'HIDDEN' });
        } else if (report.target_model === 'Comment') {
          await Comment.findByIdAndDelete(report.target_id);
        }
      } else if (action === 'MARK_SENSITIVE') {
        if (report.target_model === 'Post') {
          await Post.findByIdAndUpdate(report.target_id, { is_sensitive: true });
        } else if (report.target_model === 'Comment') {
          await Comment.findByIdAndUpdate(report.target_id, { is_sensitive: true });
        }
      }

      report.status = 'RESOLVED';
      await report.save();

      res.status(200).json({ 
        success: true, 
        message: action === 'HIDE' ? 'Content hidden and report resolved' : 'Report resolved', 
        data: report 
      });
    } catch (error) {
      next(error);
    }
  }

  async muteUser(req, res, next) {
    try {
      const user = await userRepository.update(req.params.id, { status: 'MUTED' });
      res.status(200).json({ success: true, message: 'User muted', data: user });
    } catch (error) {
      next(error);
    }
  }

  async banUser(req, res, next) {
    try {
      const user = await userRepository.update(req.params.id, { status: 'BANNED' });
      res.status(200).json({ success: true, message: 'User banned', data: user });
    } catch (error) {
      next(error);
    }
  }

  async resetScore(req, res, next) {
    try {
      const user = await userRepository.update(req.params.id, {
        spamCount: 0,
        toxicCount: 0,
        violationScore: 0,
        status: 'ACTIVE'
      });
      res.status(200).json({ success: true, message: 'Score reset', data: user });
    } catch (error) {
      next(error);
    }
  }

  async deletePost(req, res, next) {
    try {
      const Post = require('../models/Post');
      const post = await Post.findByIdAndDelete(req.params.id);
      if (!post) {
        return res.status(404).json({ success: false, message: 'Post not found' });
      }
      res.status(200).json({ success: true, message: 'Post deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();
