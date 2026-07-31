/**
 * Mock Interaction Service (likes, bookmarks, reposts)
 * Returns realistic mock data that matches the real API response structure
 * Used when NEXT_PUBLIC_USE_MOCK=true
 */

import { isMockMode } from '@/config/mock';
import { mockPosts } from '@/config/mockData';

const delay = (ms = 150) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mock likePost
 */
export const likePost = async (id) => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(100 + Math.random() * 200);

  const post = mockPosts.find(p => p._id === id);
  if (!post) {
    return { success: false, message: 'Post not found', data: null };
  }

  // Toggle like
  if (post.isLiked) {
    post.likeCount = Math.max(0, post.likeCount - 1);
    post.isLiked = false;
  } else {
    post.likeCount += 1;
    post.isLiked = true;
  }

  return {
    success: true,
    data: { likeCount: post.likeCount, isLiked: post.isLiked },
  };
};

/**
 * Mock bookmarkPost
 */
export const bookmarkPost = async (id) => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(100 + Math.random() * 200);

  const post = mockPosts.find(p => p._id === id);
  if (!post) {
    return { success: false, message: 'Post not found', data: null };
  }

  // Toggle bookmark
  if (post.isBookmarked) {
    post.bookmarkCount = Math.max(0, post.bookmarkCount - 1);
    post.isBookmarked = false;
  } else {
    post.bookmarkCount += 1;
    post.isBookmarked = true;
  }

  return {
    success: true,
    data: { bookmarkCount: post.bookmarkCount, isBookmarked: post.isBookmarked },
  };
};

/**
 * Mock repostPost
 */
export const repostPost = async (id) => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(200 + Math.random() * 300);

  const post = mockPosts.find(p => p._id === id);
  if (!post) {
    return { success: false, message: 'Post not found', data: null };
  }

  // In a real app, this would create a repost record
  // For mock, just return success
  return {
    success: true,
    data: { message: 'Reposted successfully', isReposted: true },
  };
};