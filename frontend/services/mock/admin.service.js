/**
 * Mock Admin Service
 * Returns realistic mock data that matches the real API response structure
 * Used when NEXT_PUBLIC_USE_MOCK=true
 */

import { isMockMode } from '@/config/mock';
import { mockAdminUsers, mockViolations, mockReports, mockPosts, mockAppeals } from '@/config/mockData';

const delay = (ms = 200) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mock getViolations
 */
export const getViolations = async () => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(200 + Math.random() * 300);
  return { success: true, data: mockViolations };
};

/**
 * Mock getUsers (admin view)
 */
export const getUsers = async () => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(200 + Math.random() * 300);
  return { success: true, data: mockAdminUsers };
};

/**
 * Mock changeRole
 */
export const changeRole = async (id, role) => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(300 + Math.random() * 400);

  const userIndex = mockAdminUsers.findIndex(u => u._id === id);
  if (userIndex === -1) {
    return { success: false, message: 'User not found', data: null };
  }

  mockAdminUsers[userIndex].role = role;
  mockAdminUsers[userIndex].updatedAt = new Date().toISOString();

  return { success: true, data: mockAdminUsers[userIndex] };
};

/**
 * Mock getAllPosts (admin view)
 */
export const getAllPosts = async () => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(200 + Math.random() * 300);
  return { success: true, data: mockPosts };
};

/**
 * Mock hidePost
 */
export const hidePost = async (id) => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(200 + Math.random() * 300);

  const postIndex = mockPosts.findIndex(p => p._id === id);
  if (postIndex === -1) {
    return { success: false, message: 'Post not found', data: null };
  }

  mockPosts[postIndex].status = 'HIDDEN';
  mockPosts[postIndex].updatedAt = new Date().toISOString();

  return { success: true, data: mockPosts[postIndex] };
};

/**
 * Mock unhidePost
 */
export const unhidePost = async (id) => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(200 + Math.random() * 300);

  const postIndex = mockPosts.findIndex(p => p._id === id);
  if (postIndex === -1) {
    return { success: false, message: 'Post not found', data: null };
  }

  mockPosts[postIndex].status = 'PUBLISHED';
  mockPosts[postIndex].updatedAt = new Date().toISOString();

  return { success: true, data: mockPosts[postIndex] };
};

/**
 * Mock markSensitive
 */
export const markSensitive = async (id) => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(200 + Math.random() * 300);

  const postIndex = mockPosts.findIndex(p => p._id === id);
  if (postIndex === -1) {
    return { success: false, message: 'Post not found', data: null };
  }

  mockPosts[postIndex].isSensitive = true;
  mockPosts[postIndex].updatedAt = new Date().toISOString();

  return { success: true, data: mockPosts[postIndex] };
};

/**
 * Mock unmarkSensitive
 */
export const unmarkSensitive = async (id) => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(200 + Math.random() * 300);

  const postIndex = mockPosts.findIndex(p => p._id === id);
  if (postIndex === -1) {
    return { success: false, message: 'Post not found', data: null };
  }

  mockPosts[postIndex].isSensitive = false;
  mockPosts[postIndex].updatedAt = new Date().toISOString();

  return { success: true, data: mockPosts[postIndex] };
};

/**
 * Mock deletePostByAdmin
 */
export const deletePostByAdmin = async (id) => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(200 + Math.random() * 300);

  const postIndex = mockPosts.findIndex(p => p._id === id);
  if (postIndex === -1) {
    return { success: false, message: 'Post not found', data: null };
  }

  mockPosts.splice(postIndex, 1);
  return { success: true, message: 'Post deleted successfully' };
};

/**
 * Mock getReports
 */
export const getReports = async () => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(200 + Math.random() * 300);
  return { success: true, data: mockReports };
};

/**
 * Mock resolveReport
 */
export const resolveReport = async (id, action = 'HIDE') => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(300 + Math.random() * 400);

  const reportIndex = mockReports.findIndex(r => r._id === id);
  if (reportIndex === -1) {
    return { success: false, message: 'Report not found', data: null };
  }

  mockReports[reportIndex].status = 'RESOLVED';
  mockReports[reportIndex].resolvedBy = 'le_van_c';
  mockReports[reportIndex].resolvedAction = action;
  mockReports[reportIndex].resolvedAt = new Date().toISOString();

  return { success: true, data: mockReports[reportIndex] };
};

/**
 * Mock muteUser
 */
export const muteUser = async (id) => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(300 + Math.random() * 400);

  const userIndex = mockAdminUsers.findIndex(u => u._id === id);
  if (userIndex === -1) {
    return { success: false, message: 'User not found', data: null };
  }

  mockAdminUsers[userIndex].isMuted = true;
  mockAdminUsers[userIndex].updatedAt = new Date().toISOString();

  return { success: true, data: mockAdminUsers[userIndex] };
};

/**
 * Mock banUser
 */
export const banUser = async (id) => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(300 + Math.random() * 400);

  const userIndex = mockAdminUsers.findIndex(u => u._id === id);
  if (userIndex === -1) {
    return { success: false, message: 'User not found', data: null };
  }

  mockAdminUsers[userIndex].isBanned = true;
  mockAdminUsers[userIndex].isMuted = true;
  mockAdminUsers[userIndex].updatedAt = new Date().toISOString();

  return { success: true, data: mockAdminUsers[userIndex] };
};

/**
 * Mock resetScore
 */
export const resetScore = async (id) => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(300 + Math.random() * 400);

  const userIndex = mockAdminUsers.findIndex(u => u._id === id);
  if (userIndex === -1) {
    return { success: false, message: 'User not found', data: null };
  }

  mockAdminUsers[userIndex].violationScore = 0;
  mockAdminUsers[userIndex].updatedAt = new Date().toISOString();

  return { success: true, data: mockAdminUsers[userIndex] };
};

/**
 * Mock getAppeals
 */
export const getAppeals = async () => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(200 + Math.random() * 300);
  return { success: true, data: mockAppeals };
};

/**
 * Mock resolveAppeal
 */
export const resolveAppeal = async (id, status, note = '') => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(300 + Math.random() * 400);

  const appealIndex = mockAppeals.findIndex(a => a._id === id);
  if (appealIndex === -1) {
    return { success: false, message: 'Appeal not found', data: null };
  }

  mockAppeals[appealIndex].status = status;
  mockAppeals[appealIndex].reviewedBy = 'le_van_c';
  mockAppeals[appealIndex].reviewNote = note;
  mockAppeals[appealIndex].reviewedAt = new Date().toISOString();

  return { success: true, data: mockAppeals[appealIndex] };
};