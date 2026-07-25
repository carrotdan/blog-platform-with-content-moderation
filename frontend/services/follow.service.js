import api from './api';

export const toggleFollow = async (following_id) => {
  return api.post('/follows', { following_id });
};

export const getFollowers = async (userId) => {
  return api.get(`/follows/${userId}/followers`);
};

export const getFollowing = async (userId) => {
  return api.get(`/follows/${userId}/following`);
};

export const getSuggestions = async () => {
  return api.get('/follows/suggestions');
};
