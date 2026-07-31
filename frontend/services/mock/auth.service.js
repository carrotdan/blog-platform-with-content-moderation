/**
 * Mock Auth Service
 * Returns realistic mock data that matches the real API response structure
 * Used when NEXT_PUBLIC_USE_MOCK=true
 */

import { isMockMode } from '@/config/mock';
import { mockUsers, mockCurrentUser } from '@/config/mockData';

const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

// Mock token generator
const generateToken = (prefix = 'mock') => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Mock login
 */
export const login = async (email, password) => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(500 + Math.random() * 500);

  // Find user by email
  const user = mockUsers.find(u => u.email === email);
  if (!user) {
    return { success: false, message: 'Email hoặc mật khẩu không đúng', data: null };
  }

  // Check password (mock: password123 for all users)
  if (password !== 'password123') {
    return { success: false, message: 'Email hoặc mật khẩu không đúng', data: null };
  }

  const accessToken = generateToken('access');
  const refreshToken = generateToken('refresh');

  // Store in localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
  }

  return {
    success: true,
    data: { user, accessToken, refreshToken },
  };
};

/**
 * Mock register
 */
export const register = async (username, email, password) => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(500 + Math.random() * 500);

  // Check if user exists
  if (mockUsers.some(u => u.email === email)) {
    return { success: false, message: 'Email đã được đăng ký', data: null };
  }
  if (mockUsers.some(u => u.username === username)) {
    return { success: false, message: 'Username đã tồn tại', data: null };
  }

  const newUser = {
    _id: `user_${Date.now()}`,
    username,
    email,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
    bio: '',
    role: 'USER',
    violationScore: 0,
    isMuted: false,
    isBanned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
  };

  mockUsers.push(newUser);

  const accessToken = generateToken('access');
  const refreshToken = generateToken('refresh');

  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  }

  return {
    success: true,
    data: { user: newUser, accessToken, refreshToken },
  };
};

/**
 * Mock logout
 */
export const logout = async () => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(100 + Math.random() * 200);

  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  return { success: true, message: 'Đăng xuất thành công' };
};

/**
 * Mock getCurrentUser
 */
export const getCurrentUser = async () => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(100 + Math.random() * 150);

  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('user');
    if (stored) {
      return { success: true, data: JSON.parse(stored) };
    }
  }

  return { success: true, data: mockCurrentUser };
};

/**
 * Mock refreshAccessToken
 */
export const refreshAccessToken = async () => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(150 + Math.random() * 200);

  const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
  if (!refreshToken) {
    return { success: false, message: 'No refresh token', data: null };
  }

  const accessToken = generateToken('access');
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', accessToken);
  }

  return { success: true, data: { accessToken } };
};

/**
 * Mock updateProfile
 */
export const updateProfile = async (userData) => {
  if (!isMockMode()) {
    throw new Error('Mock mode disabled');
  }

  await delay(300 + Math.random() * 400);

  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('user');
    if (stored) {
      const user = JSON.parse(stored);
      const updatedUser = { ...user, ...userData, updatedAt: new Date().toISOString() };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // Also update in mockUsers array
      const idx = mockUsers.findIndex(u => u._id === user._id);
      if (idx !== -1) {
        mockUsers[idx] = updatedUser;
      }

      return { success: true, data: updatedUser };
    }
  }

  return { success: false, message: 'User not found', data: null };
};