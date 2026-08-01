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

  // M34: stored refresh-token lifetime must match the configured
  // JWT_REFRESH_EXPIRE (jsonwebtoken accepts seconds or '<n>d/h/m/s' strings).
  parseDurationToMs(value, fallbackMs) {
    if (typeof value === 'number') return value * 1000;
    const match = String(value).trim().match(/^(\d+)([smhd])$/);
    if (!match) return fallbackMs;
    const n = parseInt(match[1], 10);
    const unitMs = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
    return n * unitMs[match[2]];
  }

  refreshTokenExpiresAt() {
    const ms = this.parseDurationToMs(process.env.JWT_REFRESH_EXPIRE, 7 * 24 * 60 * 60 * 1000);
    return new Date(Date.now() + ms);
  }

  // M35: emails are identity case-insensitive — normalize on register/login so
  // User@Example.com and user@example.com are the same account.
  normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  // M51: token issuance is shared between register/login so registration can
  // create the account and issue tokens in one flow (no fragile second login).
  _generateTokens(userId, role) {
    const payload = {
      userId: userId.toString(),
      role,
      jti: crypto.randomUUID()
    };

    const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
      expiresIn: process.env.JWT_ACCESS_EXPIRE || '15m'
    });

    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d'
    });

    return {
      accessToken,
      refreshToken,
      tokenHash: this.hashToken(refreshToken),
      expiresAt: this.refreshTokenExpiresAt()
    };
  }

  async register(data) {
    const { password, avatar, bio, username } = data;
    const email = this.normalizeEmail(data.email);

    // M43: defense-in-depth — a javascript:/data: avatar is a stored-XSS vector
    // when rendered in <img src>, reject it even if route validation is bypassed.
    if (avatar !== undefined && avatar !== null && avatar !== '' && !/^https?:\/\//i.test(avatar)) {
      const err = new Error('Avatar must be an http(s) URL');
      err.statusCode = 400;
      throw err;
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create the new user
    // C14: Always create with USER role. Role changes are only allowed via admin endpoints.
    // M36: the auto-generated fallback username must respect the allowed charset.
    const fallbackUsername = (email.split('@')[0] + Math.floor(Math.random() * 10000)).replace(/[^a-zA-Z0-9_]/g, '_');
    const newUser = new User({
      email,
      username: username || fallbackUsername,
      password: hashedPassword,
      role: 'USER',
      avatar,
      bio
    });

    // M52: the pre-check above catches the common duplicate, but two concurrent
    // registrations with the same email can both pass it and only one save wins.
    // Map that race's E11000 to the same friendly message instead of leaking a
    // raw Mongo duplicate-key string.
    try {
      await newUser.save();
    } catch (err) {
      if (err && err.code === 11000) {
        throw new Error('User already exists');
      }
      throw err;
    }

    // M51: registration is atomic — the account and its tokens are created
    // together, so a failed post-registration login can no longer strand an
    // account that has no access/refresh tokens.
    const tokens = this._generateTokens(newUser._id, 'USER');
    newUser.refreshTokens.push({ tokenHash: tokens.tokenHash, expiresAt: tokens.expiresAt });
    await newUser.save();

    // Return the user in the same public shape as login (no password/token hashes)
    const userToReturn = {
      id: newUser._id.toString(),
      email: newUser.email,
      username: newUser.username,
      role: newUser.role,
      avatar: newUser.avatar,
      bio: newUser.bio,
      status: newUser.status
    };

    return {
      user: userToReturn,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    };
  }

  async login(email, password) {
    // M35: normalize the email before lookup so case/padding mismatches resolve
    // to the same account.
    const normalizedEmail = this.normalizeEmail(email);
    // Find the user by email (password is select:false on the schema, re-include it)
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
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
    const { accessToken, refreshToken, tokenHash, expiresAt } = this._generateTokens(user._id, user.role);

    // M26: Clean expired tokens and cap the stored list (keep most recent 5) to
    // prevent unbounded document growth.
    this.cleanExpiredTokens(user);
    user.refreshTokens.push({ tokenHash, expiresAt });
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }
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
      const tokenHash = this.hashToken(token);

      // H43: Load the user for status/deleted checks (not for the rotation
      // itself — that must be atomic, see below).
      const existing = await User.findById(decoded.userId).select('+refreshTokens');
      if (!existing || existing.isDeleted) {
        throw new Error('User not found or deleted');
      }

      // Check user status
      if (existing.status === 'BANNED') {
        throw new Error('Account has been banned');
      }
      if (existing.status === 'MUTED') {
        throw new Error('Account is muted');
      }

      // Generate new tokens
      const payload = {
        userId: existing._id.toString(),
        role: existing.role,
        jti: crypto.randomUUID()
      };

      const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
        expiresIn: process.env.JWT_ACCESS_EXPIRE || '15m'
      });

      const newRefreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d'
      });

      const newTokenHash = this.hashToken(newRefreshToken);
      // M34: derive lifetime from JWT_REFRESH_EXPIRE (was hardcoded to 7 days)
      const expiresAt = this.refreshTokenExpiresAt();

      // H43: Rotate atomically — the conditional $pull keyed on the old token
      // hash is the gate. Two concurrent refreshes with the same (unexpired)
      // token can no longer both pass the "still valid" check: only the first
      // findOneAndUpdate matches and pulls the old hash; the second finds no
      // matching token and is treated as reuse → all tokens revoked.
      // (MongoDB forbids $pull + $push on the same array in one update, so the
      // old token is claimed atomically here, then the new one is appended.)
      const claimed = await User.findOneAndUpdate(
        {
          _id: decoded.userId,
          'refreshTokens.tokenHash': tokenHash
        },
        { $pull: { refreshTokens: { tokenHash } } },
        { new: true }
      ).select('+refreshTokens');

      if (!claimed) {
        // Token not matched — reuse attack or concurrent race loser. Revoke all.
        await User.updateOne({ _id: decoded.userId }, { $set: { refreshTokens: [] } });
        throw new Error('Invalid or expired refresh token');
      }

      claimed.refreshTokens.push({ tokenHash: newTokenHash, expiresAt });
      if (claimed.refreshTokens.length > 5) {
        claimed.refreshTokens = claimed.refreshTokens.slice(-5);
      }
      await claimed.save();

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
