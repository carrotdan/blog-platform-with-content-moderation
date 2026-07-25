"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { getToken, removeToken } from '../utils/token';
import { logout as logoutService } from '../services/auth.service';
import { useRouter } from 'next/navigation';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      // Restore from localStorage immediately (fast path)
      const saved = localStorage.getItem('user');
      if (saved) {
        try {
          setUser(JSON.parse(saved));
          setIsAuthenticated(true);
        } catch {
          localStorage.removeItem('user');
        }
      }

      // Then fetch fresh profile from server to get latest username/avatar/bio
      try {
        const { data } = await api.get('/users/me');
        if (data?.success && data?.data) {
          const fresh = data.data;
          setUser(fresh);
          setIsAuthenticated(true);
          localStorage.setItem('user', JSON.stringify(fresh));
        }
      } catch {
        // If /me fails (token expired etc.), clear session
        removeToken();
        localStorage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const login = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  // Merge partial fields (e.g. after profile update)
  const updateUser = (partial) => {
    setUser(prev => {
      const merged = { ...prev, ...partial };
      localStorage.setItem('user', JSON.stringify(merged));
      return merged;
    });
  };

  const logout = async () => {
    try { await logoutService(); } catch {}
    removeToken();
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
