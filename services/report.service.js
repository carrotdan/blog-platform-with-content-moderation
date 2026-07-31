const reportRepository = require('../repositories/report.repo');

class ReportService {
  _httpError(message, statusCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  }

  // M38: a report target must exist, be visible/reportable, not be the
  // reporter's own content, and not already have a PENDING report from the same
  // reporter (prevents spam and phantom reports on non-existent/self content).
  async report(reporter_id, target_id, target_model, reason) {
    const Post = require('../models/Post');
    const Comment = require('../models/Comment');

    let target;
    if (target_model === 'Post') {
      target = await Post.findById(target_id);
    } else if (target_model === 'Comment') {
      target = await Comment.findById(target_id);
    }
    if (!target) throw this._httpError('Target not found', 404);

    const isPost = target_model === 'Post';
    if (isPost && target.visibility !== 'PUBLIC') {
      throw this._httpError('Content cannot be reported', 400);
    }
    if (!isPost && target.is_hidden) {
      throw this._httpError('Content cannot be reported', 400);
    }

    const authorId = target.author ? target.author._id || target.author : null;
    if (authorId && authorId.toString() === reporter_id.toString()) {
      throw this._httpError('You cannot report your own content', 400);
    }

    const existing = await reportRepository.findExisting(reporter_id, target_id, target_model);
    if (existing) {
      throw this._httpError('You have already reported this content', 400);
    }

    return reportRepository.create({
      reporter_id,
      target_id,
      target_model,
      reason
    });
  }

  async getAllReports(query = {}) {
    return reportRepository.findAll(query);
  }

  async resolveReport(id, status) {
    return reportRepository.updateStatus(id, status);
  }
}

module.exports = new ReportService();
