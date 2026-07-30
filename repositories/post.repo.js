const Post = require('../models/Post');

class PostRepository {
  async create(postData) {
    return Post.create(postData);
  }

  async findById(id) {
    return Post.findById(id)
      .populate('author', 'username avatar')
      .populate({
        path: 'original_post',
        populate: { path: 'author', select: 'username avatar' }
      });
  }

  async findBySlug(slug) {
    return Post.findOne({ slug })
      .populate('author', 'username avatar')
      .populate({
        path: 'original_post',
        populate: { path: 'author', select: 'username avatar' }
      });
  }

  async update(id, updateData) {
    return Post.findByIdAndUpdate(id, updateData, { new: true });
  }

  async findAll(query = {}, skip = 0, limit = 10) {
    return Post.find(query)
      .populate('author', 'username avatar')
      .populate({
        path: 'original_post',
        populate: { path: 'author', select: 'username avatar' }
      })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
  }

  async delete(id) {
    return Post.findByIdAndDelete(id);
  }

  async findByAuthor(authorId) {
    return Post.find({ author: authorId })
      .populate('author', 'username avatar')
      .populate({
        path: 'original_post',
        populate: { path: 'author', select: 'username avatar' }
      })
      .sort({ createdAt: -1 });
  }

  async countReposts(originalPostId) {
    return Post.countDocuments({ original_post: originalPostId });
  }

  async countRepostsBatch(originalPostIds) {
    const results = await Post.aggregate([
      { $match: { original_post: { $in: originalPostIds } } },
      { $group: { _id: '$original_post', count: { $sum: 1 } } }
    ]);
    return results.reduce((acc, r) => {
      acc[r._id.toString()] = r.count;
      return acc;
    }, {});
  }

  async findOne(query) {
    return Post.findOne(query);
  }

  async updateVisibility(id, visibility) {
    return Post.findByIdAndUpdate(id, { visibility }, { new: true });
  }

  async findAdminAll(skip = 0, limit = 20) {
    return Post.find()
      .populate('author', 'username email avatar')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
  }

  async findByIdAdmin(id) {
    return Post.findById(id).populate('author', 'username email avatar');
  }
}

module.exports = new PostRepository();
