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

  // H48: single, consistent resolution path. The legacy report.controller
  // resolve (status-only) and admin.controller resolve (action-based) diverged:
  // one wrote arbitrary statuses, the other performed content actions. Now both
  // go through this one service which performs the content action and writes a
  // valid status.
  async resolveReport(id, action, options = {}) {
    const Report = require('../models/Report');
    const Post = require('../models/Post');
    const Comment = require('../models/Comment');
    const { updateHidden } = require('../repositories/comment.repo');

    const VALID_ACTIONS = ['HIDE', 'DISMISS', 'MARK_SENSITIVE'];
    if (!VALID_ACTIONS.includes(action)) {
      throw this._httpError('Invalid action', 400);
    }

    const report = await reportRepository.findById(id);
    if (!report) throw this._httpError('Report not found', 404);

    if (action === 'HIDE') {
      if (report.target_model === 'Post') {
        await Post.findByIdAndUpdate(report.target_id, { visibility: 'HIDDEN' });
      } else if (report.target_model === 'Comment') {
        await updateHidden(report.target_id, true);
      }
      report.status = 'RESOLVED';
    } else if (action === 'MARK_SENSITIVE') {
      if (report.target_model === 'Post') {
        await Post.findByIdAndUpdate(report.target_id, { is_sensitive: true });
      } else if (report.target_model === 'Comment') {
        await Comment.findByIdAndUpdate(report.target_id, { is_sensitive: true });
      }
      report.status = 'RESOLVED';
    } else {
      report.status = 'DISMISSED';
    }

    await report.save();
    return report;
  }
}

module.exports = new ReportService();
