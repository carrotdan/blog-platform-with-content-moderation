import api from './api';

export const getComments = async (postId, skip = 0, limit = 20) => {
  const { data } = await api.get(`/comments/post/${postId}?skip=${skip}&limit=${limit}`);
  return data;
};

export const createComment = async (postId, content, parentId = null) => {
  const { data } = await api.post('/comments', {
    post_id: postId,
    content,
    parent_id: parentId
  });
  return data;
};
