import api from './api';

export const toggleInteraction = async (targetId, targetModel, type) => {
  const { data } = await api.post('/interactions', { target_id: targetId, target_model: targetModel, type });
  return data;
};

export const bookmarkPost = async (postId) => {
  const { data } = await api.post('/interactions/bookmark', { target_id: postId });
  return data;
};

export const unbookmarkPost = async (postId) => {
  const { data } = await api.delete(`/interactions/bookmark/${postId}`);
  return data;
};
