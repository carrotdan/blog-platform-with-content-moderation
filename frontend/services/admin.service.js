import api from './api';

export const getViolations = async () => {
  const { data } = await api.get('/admin/violations');
  return data;
};

export const getUsers = async () => {
  const { data } = await api.get('/admin/users');
  return data;
};

export const changeRole = async (id, role) => {
  const { data } = await api.put(`/admin/users/${id}/role`, { role });
  return data;
};

export const getAllPosts = async () => {
  const { data } = await api.get('/admin/posts');
  return data;
};

export const hidePost = async (id) => {
  const { data } = await api.put(`/admin/posts/${id}/hide`);
  return data;
};

export const unhidePost = async (id) => {
  const { data } = await api.put(`/admin/posts/${id}/unhide`);
  return data;
};

export const markSensitive = async (id) => {
  const { data } = await api.put(`/admin/posts/${id}/mark-sensitive`);
  return data;
};

export const unmarkSensitive = async (id) => {
  const { data } = await api.put(`/admin/posts/${id}/unmark-sensitive`);
  return data;
};

export const deletePostByAdmin = async (id) => {
  const { data } = await api.delete(`/admin/posts/${id}`);
  return data;
};

export const getReports = async () => {
  const { data } = await api.get('/admin/reports');
  return data;
};

export const resolveReport = async (id, action = 'HIDE') => {
  const { data } = await api.put(`/admin/reports/${id}/resolve`, { action });
  return data;
};

export const muteUser = async (id) => {
  const { data } = await api.put(`/admin/users/${id}/mute`);
  return data;
};

export const banUser = async (id) => {
  const { data } = await api.put(`/admin/users/${id}/ban`);
  return data;
};

export const resetScore = async (id) => {
  const { data } = await api.put(`/admin/users/${id}/reset-score`);
  return data;
};
