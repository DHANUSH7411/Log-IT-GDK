import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [systemHealth, setSystemHealth] = useState(null);

  const checkHealth = useCallback(async () => {
    try {
      const res = await api.get('/health');
      setSystemHealth(res.data);
      return res.data;
    } catch (err) {
      setSystemHealth({ status: 'offline', error: err.message });
      return null;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user || null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    refreshUser();
  }, [checkHealth, refreshUser]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        systemHealth,
        checkHealth,
        login,
        register,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
