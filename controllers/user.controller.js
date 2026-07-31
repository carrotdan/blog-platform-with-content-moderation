const userService = require('../services/user.service');
const followService = require('../services/follow.service');

class UserController {
  async register(req, res, next) {
    try {
      const data = await userService.register(req.body);
      
      // Send refresh token as HTTP Only cookie
      res.cookie('refreshToken', data.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: data.user,
          accessToken: data.tokens.accessToken
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const data = await userService.login(req.body);

      res.cookie('refreshToken', data.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: data.user,
          accessToken: data.tokens.accessToken
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const token = req.cookies?.refreshToken || req.body.refreshToken;
      if (!token) {
        return res.status(401).json({ success: false, message: 'Refresh token required', data: null });
      }

      const data = await userService.refreshToken(token);

      res.cookie('refreshToken', data.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.status(200).json({
        success: true,
        message: 'Token refreshed',
        data: { accessToken: data.tokens.accessToken }
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      // C19: Revoke the refresh token server-side so it can no longer be used
      const refreshToken = req.body?.refreshToken || req.cookies?.refreshToken;
      const authService = require('../services/auth.service');
      if (refreshToken) {
        await authService.logout(req.user.id, refreshToken);
      } else {
        // No specific token provided - revoke all sessions for this user
        await authService.logoutAll(req.user.id);
      }

      res.clearCookie('refreshToken');
      res.status(200).json({ success: true, message: 'Logout successful', data: null });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const updatedUser = await userService.updateProfile(req.user.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          id: updatedUser._id,
          username: updatedUser.username,
          email: updatedUser.email,
          role: updatedUser.role,
          avatar: updatedUser.avatar,
          bio: updatedUser.bio,
          violationScore: updatedUser.violationScore || 0,
          status: updatedUser.status || 'ACTIVE'
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getMe(req, res, next) {
    try {
      const user = await userService.getUserById(req.user.id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found', data: null });
      res.status(200).json({
        success: true,
        message: 'User retrieved',
        data: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          bio: user.bio,
          violationScore: user.violationScore || 0,
          status: user.status || 'ACTIVE'
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getPublicProfile(req, res, next) {
    try {
      const { username } = req.params;
      const user = await userService.getUserByUsername(username);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const postService = require('../services/post.service');
      const isAuthenticated = !!req.user;
      let isLimited = false;
      
      let skip = Number(req.query.skip) || 0;
      let limit = Math.min(Number(req.query.limit) || 10, 20);

      if (!isAuthenticated) {
        // M33: guests only ever see the first 3 posts. The window is capped
        // BEFORE querying — previously an attacker-controlled skip was applied
        // to the DB query and only the result was slice()d, letting ?skip=100
        // enumerate every post.
        skip = 0;
        limit = Math.min(limit, 3);
        isLimited = true;
      }
      
      const finalPosts = await postService.getPostsByUser(user._id, req.user?.id, skip, limit);

      const [followStats, isFollowing] = await Promise.all([
        followService.getFollowStats(user._id),
        followService.isFollowing(req.user?.id, user._id)
      ]);

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user._id,
            username: user.username,
            avatar: user.avatar,
            bio: user.bio,
            createdAt: user.createdAt,
            followersCount: followStats.followersCount,
            followingCount: followStats.followingCount,
            isFollowing: isFollowing
          },
          posts: finalPosts,
          meta: { isLimited, skip, limit }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getBookmarks(req, res, next) {
    try {
      const postService = require('../services/post.service');
      const skip = Number(req.query.skip) || 0;
      const limit = Math.min(Number(req.query.limit) || 10, 50);
      const { posts, total } = await postService.getBookmarkedPosts(req.user.id, skip, limit);
      res.status(200).json({
        success: true,
        message: 'Bookmarks retrieved',
        data: posts,
        meta: { total, skip, limit }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
