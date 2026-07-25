const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/user.repo');

class UserService {
  async register(data) {
    const { email, password, username } = data;
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) throw new Error('User already exists');

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await userRepository.create({
      email,
      username,
      password: hashedPassword
    });

    return this._generateTokens(user);
  }

  async login(data) {
    const { email, password } = data;
    const user = await userRepository.findByEmail(email);
    if (!user) throw new Error('Invalid credentials');

    if (user.status === 'BANNED') {
      throw new Error('Tài khoản của bạn đã bị khóa.');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error('Invalid credentials');

    return this._generateTokens(user);
  }

  async refreshToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      const user = await userRepository.findById(decoded.id);
      if (!user) throw new Error('Invalid token');

      if (user.status === 'BANNED') {
        throw new Error('Tài khoản của bạn đã bị khóa.');
      }

      return this._generateTokens(user);
    } catch (err) {
      if (err.message === 'Tài khoản của bạn đã bị khóa.') {
        throw err;
      }
      throw new Error('Invalid or expired refresh token');
    }
  }

  _generateTokens(user) {
    const payload = { id: user._id, role: user.role };
    
    const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m'
    });

    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    });

    return {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        bio: user.bio,
        violationScore: user.violationScore || 0,
        status: user.status || 'ACTIVE'
      },
      tokens: {
        accessToken,
        refreshToken
      }
    };
  }

  async getUserById(id) {
    return userRepository.findById(id);
  }

  async getUserByUsername(username) {
    return userRepository.findByUsername(username);
  }

  async updateProfile(user_id, data) {
    const updateData = {};
    if (data.avatar !== undefined) updateData.avatar = data.avatar;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.username !== undefined) updateData.username = data.username;
    
    return userRepository.update(user_id, updateData);
  }
  async getFollowSuggestions(userId, limit = 5) {
    const Follow = require('../models/Follow');
    const User = require('../models/User');
    
    // Get IDs of users already following
    const following = await Follow.find({ follower_id: userId }).select('following_id');
    const followingIds = following.map(f => f.following_id);
    followingIds.push(userId); // Don't suggest self

    return User.find({ _id: { $nin: followingIds } })
      .select('username avatar bio')
      .limit(limit);
  }
}

module.exports = new UserService();
