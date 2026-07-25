const User = require('../models/User');

class UserRepository {
  async create(userData) {
    return User.create(userData);
  }

  async findByEmail(email) {
    return User.findOne({ email, isDeleted: false });
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
}

module.exports = new UserRepository();
