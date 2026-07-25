import api from './api';

export const getConversations = async () => {
  return api.get('/messages/conversations');
};

export const createConversation = async (recipientId) => {
  return api.post('/messages/conversations', { recipientId });
};

export const getMessages = async (conversationId) => {
  return api.get(`/messages/${conversationId}`);
};

export const getUnreadCount = async () => {
  return api.get('/messages/unread-count');
};

export const sendMessage = async (recipientId, content, mediaFiles = []) => {
  const formData = new FormData();
  formData.append('recipientId', recipientId);
  formData.append('content', content);
  mediaFiles.forEach(file => {
    formData.append('media', file);
  });
  
  return api.post('/messages/send', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const deleteConversation = async (conversationId) => {
  return api.delete(`/messages/${conversationId}`);
};

export const reactToMessage = async (messageId, emoji) => {
  return api.post(`/messages/${messageId}/react`, { emoji });
};


