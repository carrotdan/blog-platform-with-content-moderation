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

  async login(data) {
    const { email, password } = data;
    const result = await authService.login(email, password);
    return {
      user: result.user,
      tokens: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      }
    };
  }

  async refreshToken(token) {
    const result = await authService.refreshToken(token);
    return {
      tokens: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      }
    };
  }

  async updateProfile(user_id, data) {
    const updateData = {};
    if (data.avatar !== undefined) updateData.avatar = data.avatar;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.username !== undefined) updateData.username = data.username;
    
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
