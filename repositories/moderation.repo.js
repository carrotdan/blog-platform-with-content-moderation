const mongoose = require('mongoose');
const ModerationQueue = require('../models/ModerationQueue');
const ModerationLog = require('../models/ModerationLog');
const Report = require('../models/Report');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { getAuthorPopulate } = require('../utils/populate');

class ModerationRepository {
  // L29: Upsert per (target_model, target_id) while a PENDING entry exists —
  // repeated edits of an already-flagged post used to create duplicate queue
  // items. A REVIEWED item (resolved by a moderator) lets a new flag insert a
  // fresh PENDING entry for the same target.
  async addToQueue(queueData) {
    const { target_id, target_model, ...rest } = queueData;
    return ModerationQueue.findOneAndUpdate(
      { target_model, target_id, status: 'PENDING' },
      { $set: { target_model, target_id, ...rest, status: 'PENDING' } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  async createLog(logData) {
    return ModerationLog.create(logData);
  }

  async getPendingQueue() {
    const items = await ModerationQueue.find({ status: 'PENDING' }).sort({ createdAt: -1 });
    return this._populateTargets(items);
  }

  async updateQueueItem(id, data) {
    return ModerationQueue.findByIdAndUpdate(id, data, { new: true });
  }

  async findQueueItemById(id) {
    const item = await ModerationQueue.findById(id);
    if (!item) return null;
    const populated = await this._populateTargets([item]);
    return populated[0] || null;
  }

  // M41: populate polymorphic target_id in batch ($in per model) instead of one
  // awaited query per queue item (N+1). Missing targets resolve to null.
  async _populateTargets(items) {
    const postIds = items.filter(i => i.target_model === 'Post').map(i => i.target_id);
    const commentIds = items.filter(i => i.target_model === 'Comment').map(i => i.target_id);

    const [posts, comments] = await Promise.all([
      postIds.length
        ? Post.find({ _id: { $in: postIds } }).populate(getAuthorPopulate())
        : Promise.resolve([]),
      commentIds.length
        ? Comment.find({ _id: { $in: commentIds } }).populate(getAuthorPopulate())
        : Promise.resolve([])
    ]);

    const postMap = new Map(posts.map(p => [p._id.toString(), p]));
    const commentMap = new Map(comments.map(c => [c._id.toString(), c]));

    return items.map(item => {
      if (item.target_model === 'Post') {
        item.target_id = postMap.get(item.target_id.toString()) || null;
      } else if (item.target_model === 'Comment') {
        item.target_id = commentMap.get(item.target_id.toString()) || null;
      }
      return item;
    });
  }

  async createReport(reportData) {
    return Report.create(reportData);
  }

  async findReports(query = {}, skip = 0, limit = 20) {
    return Report.find(query)
      .populate('reporter_id', 'username email')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
  }

  async findReportById(id) {
    return Report.findById(id)
      .populate('reporter_id', 'username email');
  }

  async updateReport(id, data) {
    return Report.findByIdAndUpdate(id, data, { new: true });
  }

  async getReportCount(query = {}) {
    return Report.countDocuments(query);
  }
}

module.exports = new ModerationRepository();
