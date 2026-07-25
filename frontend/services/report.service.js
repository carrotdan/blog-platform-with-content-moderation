import api from './api';

export const createReport = async (reportData) => {
  const { data } = await api.post('/reports', reportData);
  return data;
};

export const getReports = async () => {
  const { data } = await api.get('/reports');
  return data;
};

export const resolveReport = async (id, status) => {
  const { data } = await api.put(`/reports/${id}`, { status });
  return data;
};
