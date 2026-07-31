/**
 * Mock User Service
 * Returns realistic mock data that matches the real API response structure
 * Used when NEXT_PUBLIC_USE_MOCK=true
 */

import { isMockMode } from '@/config/mock';
import { mockUsers, mockCurrentUser } from '@/config/mockData';

const delay = (ms = 200) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mock getUserById
 */
export const getUserById = async (id) => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(150 + Math.random() * 200);

  const user = mockUsers.find(u => u._id === id);
  if (!user) {
    return { success: false, message: 'User not found', data: null };
  }

  return { success: true, data: user };
};

/**
 * Mock getUserByUsername
 */
export const getUserByUsername = async (username) => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(150 + Math.random() * 200);

  const user = mockUsers.find(u => u.username === username);
  if (!user) {
    return { success: false, message: 'User not found', data: null };
  }

  return { success: true, data: user };
};

/**
 * Mock followUser
 */
export const followUser = async (id) => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(200 + Math.random() * 300);

  const targetUser = mockUsers.find(u => u._id === id);
  if (!targetUser) {
    return { success: false, message: 'User not found', data: null };
  }

  if (targetUser._id === mockCurrentUser._id) {
    return { success: false, message: 'Cannot follow yourself', data: null };
  }

  // Toggle follow status (simplified - just return success)
  const isFollowing = !targetUser.isFollowedByCurrentUser;

  return {
    success: true,
    data: {
      isFollowing,
      followersCount: isFollowing ? targetUser.followersCount + 1 : Math.max(0, targetUser.followersCount - 1),
      followingCount: isFollowing ? mockCurrentUser.followingCount + 1 : Math.max(0, mockCurrentUser.followingCount - 1),
    },
  };
};

/**
 * Mock getFollowers
 */
export const getFollowers = async (id) => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(200 + Math.random() * 300);

  // Return a subset of users as followers
  const followers = mockUsers.filter(u => u._id !== id).slice(0, 10);
  return { success: true, data: followers };
};

/**
 * Mock getFollowing
 */
export const getFollowing = async (id) => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(200 + Math.random() * 300);

  const following = mockUsers.filter(u => u._id !== id).slice(0, 10);
  return { success: true, data: following };
};