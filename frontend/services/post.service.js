import api from './api';

export const getPosts = async (skip = 0, limit = 10, tags = '') => {
  const tagParam = Array.isArray(tags) ? tags.join(',') : tags;
  const url = tagParam ? `/posts?skip=${skip}&limit=${limit}&tag=${encodeURIComponent(tagParam)}` : `/posts?skip=${skip}&limit=${limit}`;
  const { data } = await api.get(url);
  return data;
};

export const getPostBySlug = async (slug) => {
  const { data } = await api.get(`/posts/slug/${slug}`);
  return data;
};

export const createPost = async (postData) => {
  const { data } = await api.post('/posts', postData);
  return data;
};

export const deletePost = async (id) => {
  const { data } = await api.delete(`/posts/${id}`);
  return data;
};

export const updatePost = async (id, postData) => {
  const { data } = await api.put(`/posts/${id}`, postData);
  return data;
};

export const getMyPosts = async () => {
  const { data } = await api.get('/posts/me/posts');
  return data;
};

export const getBookmarkedPosts = async () => {
  const { data } = await api.get('/users/me/bookmarks');
  return data;
};
