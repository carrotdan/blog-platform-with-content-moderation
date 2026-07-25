import api from './api';

export const updateProfile = async (profileData) => {
  const { data } = await api.put('/users/profile', profileData);
  return data;
};

export const getUserProfile = async (username) => {
  const { data } = await api.get(`/users/${username}`);
  return data;
};
