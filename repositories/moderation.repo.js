const mongoose = require('mongoose');
const ModerationQueue = require('../models/ModerationQueue');
const ModerationLog = require('../models/ModerationLog');
const Report = require('../models/Report');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { getAuthorPopulate } = require('../utils/populate');

class ModerationRepository {
  async addToQueue(queueData) {
    return ModerationQueue.create(queueData);
  }

  async createLog(logData) {
    return ModerationLog.create(logData);
  }

  async getPendingQueue() {
    const items = await ModerationQueue.find({ status: 'PENDING' }).sort({ createdAt: -1 });
    
    // Manually populate polymorphic target_id based on target_model
    for (const item of items) {
      if (item.target_model === 'Post') {
        item.target_id = await Post.findById(item.target_id).populate(getAuthorPopulate());
      } else if (item.target_model === 'Comment') {
        item.target_id = await Comment.findById(item.target_id).populate(getAuthorPopulate());
      }
    }
    
    return items;
  }

  async updateQueueItem(id, data) {
    return ModerationQueue.findByIdAndUpdate(id, data, { new: true });
  }

  async findQueueItemById(id) {
    const item = await ModerationQueue.findById(id);
    if (!item) return null;
    
    if (item.target_model === 'Post') {
      item.target_id = await Post.findById(item.target_id).populate(getAuthorPopulate());
    } else if (item.target_model === 'Comment') {
      item.target_id = await Comment.findById(item.target_id).populate(getAuthorPopulate());
    }
    
    return item;
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
