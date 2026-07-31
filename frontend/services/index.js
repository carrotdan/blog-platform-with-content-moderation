/**
 * Service Factory - Auto-switches between mock and real services based on config
 * Import from this file instead of individual services
 */

import { isMockMode } from '@/config/mock';

// Real services
import * as realPostService from './post.service';
import * as realAuthService from './auth.service';
import * as realAdminService from './admin.service';
import * as realUserService from './user.service';
import * as realInteractionService from './interaction.service';
import * as realCommentService from './comment.service';
import * as realFollowService from './follow.service';
import * as realAppealService from './appeal.service';
import * as realModerationService from './moderation.service';
import * as realReportService from './report.service';
import * as realMessageService from './message.service';

// Mock services
import * as mockPostService from './mock/post.service';
import * as mockAuthService from './mock/auth.service';
import * as mockAdminService from './mock/admin.service';
import * as mockUserService from './mock/user.service';
import * as mockInteractionService from './mock/interaction.service';

/**
 * Get the appropriate service based on mock mode
 */
function getService(real, mock) {
  return isMockMode() ? mock : real;
}

// Export unified services
export const postService = getService(realPostService, mockPostService);
export const authService = getService(realAuthService, mockAuthService);
export const adminService = getService(realAdminService, mockAdminService);
export const userService = getService(realUserService, mockUserService);
export const interactionService = getService(realInteractionService, mockInteractionService);
export const commentService = getService(realCommentService, mockCommentService);
export const followService = realFollowService; // No mock yet
export const appealService = realAppealService; // No mock yet
export const moderationService = realModerationService; // No mock yet
export const reportService = realReportService; // No mock yet
export const messageService = realMessageService; // No mock yet

// Also export individual functions for backward compatibility
export const {
  getPosts,
  getPostBySlug,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  getMyPosts,
  getBookmarkedPosts,
} = postService;

export const {
  login,
  register,
  logout,
  refreshAccessToken,
  getCurrentUser,
  updateProfile,
} = authService;

export const {
  getViolations,
  getUsers: getAdminUsers,
  changeRole,
  getAllPosts,
  hidePost,
  unhidePost,
  markSensitive,
  unmarkSensitive,
  deletePostByAdmin,
  getReports,
  resolveReport,
  muteUser,
  banUser,
  resetScore,
  getAppeals,
  resolveAppeal,
} = adminService;

export const {
  getUserById,
  getUserByUsername,
  followUser,
  getFollowers,
  getFollowing,
} = userService;

export const {
  likePost,
  bookmarkPost,
  repostPost,
} = interactionService;

export const {
  getComments,
  addComment,
  updateComment,
  deleteComment,
  likeComment,
} = commentService;

// Re-export config for easy access
export { isMockMode, enableMockMode, disableMockMode, toggleMockMode, getMockModeInfo } from '@/config/mock';

export default {
  post: postService,
  auth: authService,
  admin: adminService,
  user: userService,
  interaction: interactionService,
  comment: commentService,
  follow: followService,
  appeal: appealService,
  moderation: moderationService,
  report: reportService,
  message: messageService,
};