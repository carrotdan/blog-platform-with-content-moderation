import api from './api';

export const getModerationQueue = async () => {
  const { data } = await api.get('/moderation/queue');
  return data;
};

export const approveModerationItem = async (id) => {
  const { data } = await api.put(`/moderation/approve/${id}`);
  return data;
};

export const hideModerationItem = async (id) => {
  const { data } = await api.put(`/moderation/hide/${id}`);
  return data;
};

export const warnModerationItem = async (id) => {
  const { data } = await api.put(`/moderation/warn/${id}`);
  return data;
};
