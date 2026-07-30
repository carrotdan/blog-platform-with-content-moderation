const userRepository = require('../repositories/user.repo');
const postRepository = require('../repositories/post.repo');
const commentRepository = require('../repositories/comment.repo');
const moderationRepository = require('../repositories/moderation.repo');

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
      const users = await userRepository.findAll();
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
      const posts = await postRepository.findAdminAll(0, 50);
      res.status(200).json({ success: true, message: 'All posts retrieved', data: posts });
    } catch (error) {
      next(error);
    }
  }

  async hidePost(req, res, next) {
    try {
      const post = await postRepository.updateVisibility(req.params.id, 'HIDDEN');
      res.status(200).json({ success: true, message: 'Post hidden', data: post });
    } catch (error) {
      next(error);
    }
  }

  async unhidePost(req, res, next) {
    try {
      const post = await postRepository.updateVisibility(req.params.id, 'PUBLIC');
      res.status(200).json({ success: true, message: 'Post restored', data: post });
    } catch (error) {
      next(error);
    }
  }

  async markSensitive(req, res, next) {
    try {
      const post = await postRepository.update(req.params.id, { is_sensitive: true });
      res.status(200).json({ success: true, message: 'Post marked as sensitive', data: post });
    } catch (error) {
      next(error);
    }
  }

  async unmarkSensitive(req, res, next) {
    try {
      const post = await postRepository.update(req.params.id, { is_sensitive: false });
      res.status(200).json({ success: true, message: 'Sensitive mark removed', data: post });
    } catch (error) {
      next(error);
    }
  }

  async getReports(req, res, next) {
    try {
      const reports = await moderationRepository.findReports({ status: 'PENDING' }, 0, 50);
      res.status(200).json({ success: true, message: 'Reports retrieved', data: reports });
    } catch (error) {
      next(error);
    }
  }

  async resolveReport(req, res, next) {
    try {
      const { action } = req.body; // 'HIDE' or 'DISMISS' or 'MARK_SENSITIVE'
      
      const report = await moderationRepository.findReportById(req.params.id);
      if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

      if (action === 'HIDE') {
        if (report.target_model === 'Post') {
          await postRepository.updateVisibility(report.target_id, 'HIDDEN');
        } else if (report.target_model === 'Comment') {
          // M7: Hide comment instead of delete
          await commentRepository.updateHidden(report.target_id, true);
        }
      } else if (action === 'MARK_SENSITIVE') {
        if (report.target_model === 'Post') {
          await postRepository.update(report.target_id, { is_sensitive: true });
        } else if (report.target_model === 'Comment') {
          await commentRepository.updateSensitive(report.target_id, true);
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
      const post = await postRepository.delete(req.params.id);
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
