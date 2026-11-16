import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Generate or retrieve persistent local device identifier for AirDrop-like pairing
  const [deviceId] = useState(() => {
    let id = localStorage.getItem('droplink_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('droplink_device_id', id);
    }
    return id;
  });

  const checkAuth = async () => {
    const token = localStorage.getItem('droplink_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
    } catch {
      localStorage.removeItem('droplink_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (usernameOrEmail, password) => {
    const res = await api.post('/auth/login', { usernameOrEmail, password });
    localStorage.setItem('droplink_token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const register = async (username, email, password, fullName) => {
    const res = await api.post('/auth/register', { username, email, password, fullName });
    localStorage.setItem('droplink_token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('droplink_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, deviceId, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
