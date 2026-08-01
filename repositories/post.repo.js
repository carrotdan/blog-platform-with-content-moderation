const Post = require('../models/Post');
const { getAuthorPopulate, getOriginalPostPopulate } = require('../utils/populate');

class PostRepository {
  async create(postData) {
    // M46: createPost/repostPost returned an unpopulated author (raw ObjectId);
    // populate the same author shape as every other read path so responses are
    // consistent.
    const doc = await Post.create(postData);
    await doc.populate(getAuthorPopulate());
    return doc;
  }

  async findById(id) {
    return Post.findById(id)
      .populate(getAuthorPopulate())
      .populate(getOriginalPostPopulate());
  }

  async findBySlug(slug) {
    return Post.findOne({ slug })
      .populate(getAuthorPopulate())
      .populate(getOriginalPostPopulate());
  }

  async update(id, updateData) {
    return Post.findByIdAndUpdate(id, updateData, { new: true });
  }

  async findAll(query = {}, skip = 0, limit = 10) {
    return Post.find(query)
      .populate(getAuthorPopulate())
      .populate(getOriginalPostPopulate())
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
  }

  async delete(id) {
    return Post.findByIdAndDelete(id);
  }

  async findByAuthor(authorId, skip = 0, limit = 10, options = {}) {
    const query = { author: authorId };
    // C22: Public views only expose PUBLIC/PUBLISHED posts; the author's own
    // view (getMyPosts / visiting your own profile) may include all.
    if (!options.includeAll) {
      query.visibility = 'PUBLIC';
      query.status = 'PUBLISHED';
    }
    return Post.find(query)
      .populate(getAuthorPopulate())
      .populate(getOriginalPostPopulate())
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
  }

  async countByAuthor(authorId) {
    return Post.countDocuments({ author: authorId });
  }

  // L31: only PUBLIC + PUBLISHED reposts count as shares — hidden/private
  // (e.g. AI-flagged) reposts must not inflate the public share count.
  async countReposts(originalPostId) {
    return Post.countDocuments({ original_post: originalPostId, visibility: 'PUBLIC', status: 'PUBLISHED' });
  }

  async countRepostsBatch(originalPostIds) {
    const results = await Post.aggregate([
      {
        $match: {
          original_post: { $in: originalPostIds },
          visibility: 'PUBLIC',
          status: 'PUBLISHED'
        }
      },
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
      .populate(getAuthorPopulate(true))
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
  }

  async countAll() {
    return Post.countDocuments();
  }

  async findByIdAdmin(id) {
    return Post.findById(id).populate(getAuthorPopulate(true));
  }
}

module.exports = new PostRepository();
