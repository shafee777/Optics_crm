import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('optics_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('optics_token');
    if (!token) {
      setUser(null);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token, refreshToken, user: userData } = response.data.data;

    localStorage.setItem('optics_token', token);
    if (refreshToken) {
      localStorage.setItem('optics_refresh_token', refreshToken);
    }
    localStorage.setItem('optics_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('optics_refresh_token');
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (err) {
      console.warn('Server logout error:', err);
    } finally {
      localStorage.removeItem('optics_token');
      localStorage.removeItem('optics_refresh_token');
      localStorage.removeItem('optics_user');
      setUser(null);
      window.location.href = '/login';
    }
  };

  const updateStore = (updatedStore) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updatedUser = {
        ...prev,
        store: {
          ...prev.store,
          ...updatedStore,
        },
      };
      localStorage.setItem('optics_user', JSON.stringify(updatedUser));
      return updatedUser;
    });
  };

  const value = {
    user,
    login,
    logout,
    updateStore,
    isAuthenticated: !!user,
    isOwner: user?.role === 'OWNER',
    isStaff: user?.role === 'STAFF',
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
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