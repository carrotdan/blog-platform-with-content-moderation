/**
 * Mock Post Service
 * Returns realistic mock data that matches the real API response structure
 * Used when NEXT_PUBLIC_USE_MOCK=true
 */

import { isMockMode } from '@/config/mock';
import { mockPosts, mockCurrentUser } from '@/config/mockData';

/**
 * Simulates network delay
 */
const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Filter posts by tags
 */
const filterPostsByTags = (posts, tags = []) => {
  if (!tags.length) return posts;
  return posts.filter(post =>
    post.tags.some(tag => tags.includes(tag))
  );
};

/**
 * Mock getPosts - matches real API response structure
 */
export const getPosts = async (skip = 0, limit = 10, tags = []) => {
  // If not in mock mode, throw to let real API handle it
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(200 + Math.random() * 300); // Simulate network latency

  let filteredPosts = filterPostsByTags(mockPosts, tags);
  const paginatedPosts = filteredPosts.slice(skip, skip + limit);

  // Return format matching real API: { success: true, data: [...], meta: { isLimited: boolean } }
  return {
    success: true,
    data: paginatedPosts,
    meta: {
      isLimited: filteredPosts.length > skip + limit,
      total: filteredPosts.length,
      skip,
      limit,
    },
  };
};

/**
 * Mock getPostBySlug
 */
export const getPostBySlug = async (slug) => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(150 + Math.random() * 200);

  const post = mockPosts.find(p => p.slug === slug);
  if (!post) {
    return { success: false, message: 'Post not found', data: null };
  }

  return { success: true, data: post };
};

/**
 * Mock createPost
 */
export const createPost = async (postData) => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(500 + Math.random() * 500);

  const newPost = {
    _id: `post_${Date.now()}`,
    ...postData,
    author: mockCurrentUser,
    tags: postData.tags || [],
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
    isSensitive: false,
    likeCount: 0,
    commentCount: 0,
    bookmarkCount: 0,
    viewCount: 0,
    readingTime: Math.ceil(postData.content?.length / 200) || 3,
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isLiked: false,
    isBookmarked: false,
  };

  // Add to mock data (in memory)
  mockPosts.unshift(newPost);

  return { success: true, data: newPost };
};

/**
 * Mock deletePost
 */
export const deletePost = async (id) => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(200 + Math.random() * 300);

  const index = mockPosts.findIndex(p => p._id === id);
  if (index === -1) {
    return { success: false, message: 'Post not found' };
  }

  mockPosts.splice(index, 1);
  return { success: true, message: 'Post deleted' };
};

/**
 * Mock updatePost
 */
export const updatePost = async (id, postData) => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(300 + Math.random() * 400);

  const index = mockPosts.findIndex(p => p._id === id);
  if (index === -1) {
    return { success: false, message: 'Post not found' };
  }

  const updatedPost = {
    ...mockPosts[index],
    ...postData,
    updatedAt: new Date().toISOString(),
  };

  mockPosts[index] = updatedPost;
  return { success: true, data: updatedPost };
};

/**
 * Mock getMyPosts
 */
export const getMyPosts = async () => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(150 + Math.random() * 200);

  const myPosts = mockPosts.filter(p => p.author._id === mockCurrentUser._id);
  return { success: true, data: myPosts };
};

/**
 * Mock getBookmarkedPosts
 */
export const getBookmarkedPosts = async () => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(150 + Math.random() * 200);

  const bookmarked = mockPosts.filter(p => p.isBookmarked);
  return { success: true, data: bookmarked };
};