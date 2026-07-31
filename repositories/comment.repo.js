const Comment = require('../models/Comment');
const { getAuthorPopulate } = require('../utils/populate');

class CommentRepository {
  async create(commentData) {
    return Comment.create(commentData);
  }

  async findById(id) {
    return Comment.findById(id).populate(getAuthorPopulate());
  }

  async findByPostId(post_id, skip = 0, limit = 20) {
    return Comment.find({ post_id, is_hidden: false })
      .populate(getAuthorPopulate())
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: 1 });
  }

  async update(id, updateData) {
    return Comment.findByIdAndUpdate(id, updateData, { new: true });
  }

  async updateHidden(id, is_hidden) {
    return Comment.findByIdAndUpdate(id, { is_hidden }, { new: true });
  }

  async findByIdAdmin(id) {
    return Comment.findById(id).populate(getAuthorPopulate(true));
  }

  async findAllAdmin(query = {}, skip = 0, limit = 20) {
    return Comment.find(query)
      .populate(getAuthorPopulate(true))
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
  }

  async updateSensitive(id, is_sensitive) {
    return Comment.findByIdAndUpdate(id, { is_sensitive }, { new: true });
  }
}

module.exports = new CommentRepository();
