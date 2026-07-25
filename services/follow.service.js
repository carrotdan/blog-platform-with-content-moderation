const followRepository = require('../repositories/follow.repo');
const notificationService = require('./notification.service');

class FollowService {
  async toggleFollow(follower_id, following_id) {
    if (follower_id.toString() === following_id.toString()) {
      throw new Error('You cannot follow yourself');
    }

    const existing = await followRepository.findFollow(follower_id, following_id);
    
    if (existing) {
      await followRepository.delete(follower_id, following_id);
      return { success: true, action: 'unfollowed' };
    } else {
      const follow = await followRepository.create({ follower_id, following_id });
      
      // Notify user
      await notificationService.sendNotification({
        recipient: following_id,
        sender: follower_id,
        type: 'FOLLOW',
        entity_id: follower_id, // the user who followed
        entity_model: 'User'
      });

      return { success: true, action: 'followed', follow };
    }
  }

  async getFollowers(userId) {
    return followRepository.getFollowers(userId);
  }

  async getFollowing(userId) {
    return followRepository.getFollowing(userId);
  }

  async getFollowStats(userId) {
    const [followersCount, followingCount] = await Promise.all([
      followRepository.getFollowersCount(userId),
      followRepository.getFollowingCount(userId)
    ]);
    return { followersCount, followingCount };
  }

  async isFollowing(followerId, followingId) {
    if (!followerId) return false;
    const follow = await followRepository.findFollow(followerId, followingId);
    return !!follow;
  }
}

module.exports = new FollowService();
