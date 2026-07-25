import api from './api';

// User gửi kháng cáo
export const createAppeal = async (data) => {
  const { res } = await api.post('/appeals', data);
  return res;
};

// User xem kháng cáo của mình
export const getMyAppeals = async () => {
  const { data } = await api.get('/appeals/my');
  return data;
};

// Admin: lấy kháng cáo pending
export const getPendingAppeals = async () => {
  const { data } = await api.get('/appeals/pending');
  return data;
};

// Admin: lấy tất cả kháng cáo
export const getAllAppeals = async () => {
  const { data } = await api.get('/appeals/all');
  return data;
};

// Admin: duyệt kháng cáo
export const approveAppeal = async (id, admin_note = '') => {
  const { data } = await api.put(`/appeals/${id}/approve`, { admin_note });
  return data;
};

// Admin: từ chối kháng cáo
export const rejectAppeal = async (id, admin_note = '') => {
  const { data } = await api.put(`/appeals/${id}/reject`, { admin_note });
  return data;
};
