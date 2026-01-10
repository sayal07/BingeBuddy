/**
 * Authentication context for BingeBuddy.
 * Provides user state and auth actions to the entire app.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import * as authService from '../services/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const tokens = JSON.parse(sessionStorage.getItem('tokens') || '{}');
    const savedUser = JSON.parse(sessionStorage.getItem('user') || 'null');

    if (tokens.access && savedUser) {
      try {
        const decoded = jwtDecode(tokens.access);
        if (decoded.exp * 1000 > Date.now()) {
          setUser(savedUser);
        } else {
          // Token expired — clear
          sessionStorage.removeItem('tokens');
          sessionStorage.removeItem('user');
        }
      } catch {
        sessionStorage.removeItem('tokens');
        sessionStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = (tokens, userData) => {
    sessionStorage.setItem('tokens', JSON.stringify(tokens));
    sessionStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const loginUser = async (email, password) => {
    const res = await authService.login({ email, password });
    const { user: userData, tokens } = res.data;
    login(tokens, userData);
    return res.data;
  };

  const logoutUser = async () => {
    const tokens = JSON.parse(sessionStorage.getItem('tokens') || '{}');
    try {
      await authService.logout(tokens.refresh);
    } catch {
      // Ignore logout errors
    }
    sessionStorage.removeItem('tokens');
    sessionStorage.removeItem('user');
    setUser(null);
  };

  const refreshProfile = async () => {
    try {
      const res = await authService.getProfile();
      updateUser(res.data);
    } catch {
      // Ignore
    }
  };

  const updateUser = (userData) => {
    sessionStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, login, loginUser, logoutUser, refreshProfile, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
