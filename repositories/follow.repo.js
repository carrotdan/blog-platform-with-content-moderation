const Follow = require('../models/Follow');
const { BASE_FOLLOW_POPULATE, BASE_FOLLOWING_POPULATE } = require('../utils/populate');

class FollowRepository {
  async create(followData) {
    return Follow.create(followData);
  }

  async delete(follower_id, following_id) {
    return Follow.findOneAndDelete({ follower_id, following_id });
  }

  async findFollow(follower_id, following_id) {
    return Follow.findOne({ follower_id, following_id });
  }

  async getFollowers(userId) {
    return Follow.find({ following_id: userId }).populate(BASE_FOLLOW_POPULATE);
  }

  async getFollowing(userId) {
    return Follow.find({ follower_id: userId }).populate(BASE_FOLLOWING_POPULATE);
  }

  async getFollowersCount(userId) {
    return Follow.countDocuments({ following_id: userId });
  }

  async getFollowingCount(userId) {
    return Follow.countDocuments({ follower_id: userId });
  }
}

module.exports = new FollowRepository();
