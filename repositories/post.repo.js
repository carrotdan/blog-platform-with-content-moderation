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

  async findOne(query) {
    return Post.findOne(query);
  }
}

module.exports = new PostRepository();
