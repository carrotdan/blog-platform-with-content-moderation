const userRepository = require('../repositories/user.repo');
const authService = require('./auth.service');
const followService = require('./follow.service');
const User = require('../models/User');

class UserService {
  // Delegate auth operations to authService but transform response format for user controller
  async register(data) {
    const result = await authService.register(data);
    // After registration, log in to get tokens
    const loginResult = await authService.login(data.email, data.password);
    return {
      user: loginResult.user,
      tokens: {
        accessToken: loginResult.accessToken,
        refreshToken: loginResult.refreshToken
      }
    };
  }

  async updateProfile(user_id, data) {
    const updateData = {};
    if (data.avatar !== undefined) updateData.avatar = data.avatar;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.username !== undefined) {
      // M36: defense-in-depth — reject usernames outside the allowed charset
      // even if a caller bypasses route validation.
      if (!/^[a-zA-Z0-9_]+$/.test(data.username) || data.username.length < 3 || data.username.length > 30) {
        const err = new Error('Username can only contain letters, numbers, and underscores (3-30 chars)');
        err.statusCode = 400;
        throw err;
      }
      updateData.username = data.username;
    }
    
    return userRepository.update(user_id, updateData);
  }

  async getUserById(id) {
    return userRepository.findById(id);
  }

  async getUserByUsername(username) {
    return userRepository.findByUsername(username);
  }

  async getFollowSuggestions(userId, limit = 5) {
    const following = await followService.getFollowing(userId);
    const followingIds = following.map(f => ((f.following_id && f.following_id._id) || f.following_id).toString());
    followingIds.push(userId.toString());

    return User.find({ _id: { $nin: followingIds }, isDeleted: false })
      .select('username avatar bio')
      .limit(limit);
  }
}

module.exports = new UserService();
