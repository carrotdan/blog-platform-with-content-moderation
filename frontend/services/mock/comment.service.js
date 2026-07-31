/**
 * Mock Comment Service
 * Returns realistic mock data that matches the real API response structure
 * Used when NEXT_PUBLIC_USE_MOCK=true
 */

import { isMockMode } from '@/config/mock';
import { mockComments, mockPosts, mockCurrentUser } from '@/config/mockData';

const delay = (ms = 150) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mock getComments
 */
export const getComments = async (postId) => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(150 + Math.random() * 250);

  const comments = mockComments
    .filter(c => c.postId === postId && !c.parentId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return { success: true, data: comments };
};

/**
 * Mock addComment
 */
export const addComment = async (postId, content, parentId = null) => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(200 + Math.random() * 300);

  const newComment = {
    _id: `comment_${Date.now()}`,
    content,
    author: mockCurrentUser,
    postId,
    parentId,
    likeCount: 0,
    isLiked: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    replies: [],
  };

  if (parentId) {
    const parentComment = mockComments.find(c => c._id === parentId);
    if (parentComment) {
      parentComment.replies.push(newComment);
    }
  } else {
    mockComments.push(newComment);
  }

  // Update post comment count
  const post = mockPosts.find(p => p._id === postId);
  if (post) {
    post.commentCount = (post.commentCount || 0) + 1;
  }

  return { success: true, data: newComment };
};

/**
 * Mock updateComment
 */
export const updateComment = async (id, content) => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(150 + Math.random() * 250);

  const comment = mockComments.find(c => c._id === id);
  if (!comment) {
    return { success: false, message: 'Comment not found', data: null };
  }

  comment.content = content;
  comment.updatedAt = new Date().toISOString();

  return { success: true, data: comment };
};

/**
 * Mock deleteComment
 */
export const deleteComment = async (id) => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(150 + Math.random() * 250);

  const index = mockComments.findIndex(c => c._id === id);
  if (index === -1) {
    return { success: false, message: 'Comment not found', data: null };
  }

  const comment = mockComments[index];
  mockComments.splice(index, 1);

  // Update post comment count
  const post = mockPosts.find(p => p._id === comment.postId);
  if (post) {
    post.commentCount = Math.max(0, (post.commentCount || 0) - 1);
  }

  return { success: true, message: 'Comment deleted successfully' };
};

/**
 * Mock likeComment
 */
export const likeComment = async (id) => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(100 + Math.random() * 200);

  const comment = mockComments.find(c => c._id === id);
  if (!comment) {
    return { success: false, message: 'Comment not found', data: null };
  }

  if (comment.isLiked) {
    comment.likeCount = Math.max(0, comment.likeCount - 1);
    comment.isLiked = false;
  } else {
    comment.likeCount += 1;
    comment.isLiked = true;
  }

  return {
    success: true,
    data: { likeCount: comment.likeCount, isLiked: comment.isLiked },
  };
};