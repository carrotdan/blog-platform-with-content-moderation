import api from './api';
import { setToken, setRefreshToken, removeToken } from '../utils/token';

export const login = async (email, password) => {
  const { data } = await api.post('/auth/login', { email, password });
  if (data.success && data.data?.accessToken) {
    setToken(data.data.accessToken);
    if (data.data.refreshToken) setRefreshToken(data.data.refreshToken);
  }
  return data;
};

export const register = async (username, email, password) => {
  const { data } = await api.post('/auth/register', { username, email, password });
  if (data.success && data.data?.accessToken) {
    setToken(data.data.accessToken);
    if (data.data.refreshToken) setRefreshToken(data.data.refreshToken);
  }
  return data;
};

export const logout = async () => {
  try {
    await api.post('/users/logout');
  } catch (error) {
    // Ignore error
  }
  removeToken();
};
