const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

class AuthService {
  // Hash token for storage
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Clean expired refresh tokens
  cleanExpiredTokens(user) {
    const now = new Date();
    user.refreshTokens = user.refreshTokens.filter(rt => rt.expiresAt > now);
  }

  async register(data) {
    const { email, password, role, avatar, bio, username } = data;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create the new user
    const newUser = new User({
      email,
      username: username || email.split('@')[0] + Math.floor(Math.random() * 10000),
      password: hashedPassword,
      role: role || 'USER',
      avatar,
      bio
    });

    await newUser.save();
    
    // Return user without password
    const userToReturn = newUser.toObject();
    delete userToReturn.password;
    
    return userToReturn;
  }

  async login(email, password) {
    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if user has been soft-deleted
    if (user.isDeleted || user.deleted_at) {
      throw new Error('Account has been deleted');
    }

    // Check if user is banned or muted
    if (user.status === 'BANNED') {
      throw new Error('Account has been banned');
    }
    if (user.status === 'MUTED') {
      throw new Error('Account is muted');
    }

    // Compare password using bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const payload = {
      userId: user._id.toString(),
      role: user.role
    };

    const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
      expiresIn: process.env.JWT_ACCESS_EXPIRE || '15m'
    });

    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d'
    });

    // Store refresh token hash
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    user.refreshTokens.push({ tokenHash, expiresAt });
    await user.save();

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        role: user.role,
        avatar: user.avatar,
        bio: user.bio,
        status: user.status
      }
    };
  }

  async refreshToken(token) {
    if (!token) throw new Error('Refresh token is required');

    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      
      // Verify user still exists and not deleted
      const user = await User.findById(decoded.userId).select('+refreshTokens');
      if (!user || user.isDeleted) {
        throw new Error('User not found or deleted');
      }

      // Check user status
      if (user.status === 'BANNED') {
        throw new Error('Account has been banned');
      }
      if (user.status === 'MUTED') {
        throw new Error('Account is muted');
      }

      // Clean expired tokens
      this.cleanExpiredTokens(user);

      // Find and remove the used refresh token
      const tokenHash = this.hashToken(token);
      const tokenIndex = user.refreshTokens.findIndex(rt => rt.tokenHash === tokenHash);
      
      if (tokenIndex === -1) {
        // Token not found - possible reuse attack, revoke all tokens
        user.refreshTokens = [];
        await user.save();
        throw new Error('Invalid or expired refresh token');
      }

      // Remove the used token (rotation)
      user.refreshTokens.splice(tokenIndex, 1);

      // Generate new tokens
      const payload = {
        userId: user._id.toString(),
        role: user.role
      };

      const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
        expiresIn: process.env.JWT_ACCESS_EXPIRE || '15m'
      });

      const newRefreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d'
      });

      // Store new refresh token hash
      const newTokenHash = this.hashToken(newRefreshToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      user.refreshTokens.push({ tokenHash: newTokenHash, expiresAt });

      await user.save();

      return { accessToken, refreshToken: newRefreshToken };
    } catch (error) {
      if (error.message === 'Invalid or expired refresh token' || 
          error.message === 'User not found or deleted' ||
          error.message === 'Account has been banned' ||
          error.message === 'Account is muted') {
        throw error;
      }
      throw new Error('Invalid or expired refresh token');
    }
  }

  // Optional: logout - revoke specific refresh token
  async logout(userId, refreshToken) {
    const user = await User.findById(userId).select('+refreshTokens');
    if (!user) return;

    const tokenHash = this.hashToken(refreshToken);
    user.refreshTokens = user.refreshTokens.filter(rt => rt.tokenHash !== tokenHash);
    await user.save();
  }

  // Optional: logout from all devices - revoke all refresh tokens
  async logoutAll(userId) {
    const user = await User.findById(userId).select('+refreshTokens');
    if (!user) return;

    user.refreshTokens = [];
    await user.save();
  }
}

module.exports = new AuthService();
