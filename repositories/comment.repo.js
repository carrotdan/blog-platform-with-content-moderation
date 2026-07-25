const Comment = require('../models/Comment');

class CommentRepository {
  async create(commentData) {
    return Comment.create(commentData);
  }

  async findById(id) {
    return Comment.findById(id);
  }

  async findByPostId(post_id, skip = 0, limit = 20) {
    return Comment.find({ post_id, is_hidden: false })
      .populate('author', 'username avatar')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: 1 });
  }

  async update(id, updateData) {
    return Comment.findByIdAndUpdate(id, updateData, { new: true });
  }
}

module.exports = new CommentRepository();
