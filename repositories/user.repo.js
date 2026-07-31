const User = require('../models/User');

class UserRepository {
  async create(userData) {
    return User.create(userData);
  }

  async findByEmail(email) {
    return User.findOne({ email, isDeleted: false }).select('-password');
  }

  async findById(id) {
    return User.findOne({ _id: id, isDeleted: false }).select('-password');
  }

  async findByUsername(username) {
    return User.findOne({ username, isDeleted: false }).select('-password');
  }

  async update(id, updateData) {
    return User.findByIdAndUpdate(id, updateData, { new: true }).select('-password');
  }

  async findAll(query = {}) {
    return User.find(query).select('-password');
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
    ).select('-password');
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
    ).select('-password');
  }
}

module.exports = new UserRepository();
