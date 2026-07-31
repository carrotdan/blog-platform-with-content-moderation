const Comment = require('../models/Comment');
const { getAuthorPopulate } = require('../utils/populate');

class CommentRepository {
  async create(commentData) {
    // M46: createComment returned an unpopulated author (raw ObjectId); match
    // the author shape returned by every other comment read path.
    const doc = await Comment.create(commentData);
    await doc.populate(getAuthorPopulate());
    return doc;
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

  // M44: hiding a comment must hide its whole reply subtree — otherwise replies
  // to a moderated comment stay visible and re-expose the thread. BFS over
  // parent_id chains, then hides every collected id in one updateMany.
  async hideSubtree(commentId) {
    const toHide = [commentId];
    let frontier = [commentId];
    while (frontier.length) {
      const children = await Comment.find({ parent_id: { $in: frontier } }).select('_id');
      const childIds = children.map(c => c._id);
      if (!childIds.length) break;
      toHide.push(...childIds);
      frontier = childIds;
    }
    await Comment.updateMany({ _id: { $in: toHide } }, { is_hidden: true });
    return toHide;
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
