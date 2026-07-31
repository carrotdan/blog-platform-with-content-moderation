const User = require('../models/User');

class UserRepository {
  async create(userData) {
    return User.create(userData);
  }

  async findByEmail(email) {
    return User.findOne({ email, isDeleted: false }).select('-password -refreshTokens');
  }

  async findById(id) {
    return User.findOne({ _id: id, isDeleted: false }).select('-password -refreshTokens');
  }

  async findByUsername(username) {
    return User.findOne({ username, isDeleted: false }).select('-password -refreshTokens');
  }

  async update(id, updateData) {
    return User.findByIdAndUpdate(id, updateData, { new: true }).select('-password -refreshTokens');
  }

  async findAll(query = {}, options = {}) {
    const { skip = 0, limit = 0, sort = {} } = options;
    return User.find(query)
      .select('-password -refreshTokens')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async countAll(query = {}) {
    return User.countDocuments(query);
  }

  async incrementViolations(userId, spamDelta = 0, toxicDelta = 0) {
    return User.findByIdAndUpdate(
      userId,
      {
        $inc: {
          spamCount: spamDelta,
          toxicCount: toxicDelta,
          violationScore: spamDelta * 1 + toxicDelta * 3
        }
      },
      { new: true }
    ).select('-password -refreshTokens');
  }

  async decrementViolations(userId, spamDelta = 0, toxicDelta = 0) {
    return User.findByIdAndUpdate(
      userId,
      {
        $inc: {
          spamCount: -spamDelta,
          toxicCount: -toxicDelta,
          violationScore: -(spamDelta * 1 + toxicDelta * 3)
        }
      },
      { new: true }
    ).select('-password -refreshTokens');
  }
}

module.exports = new UserRepository();
