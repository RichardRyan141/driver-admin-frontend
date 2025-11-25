import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';
import { setAuthToken, setUser, getUser, logout as logoutUtil, isAuthenticated } from '../utils/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Initialize state from localStorage directly
  const [user, setUserState] = useState(() => {
    const storedUser = getUser();
    return (storedUser && isAuthenticated()) ? storedUser : null;
  });
  const [loading, setLoading] = useState(false);

  const login = async (username, password) => {
    try {
      const response = await authAPI.login(username, password);
      const { token, user } = response.data;
      
      setAuthToken(token);
      setUser(user);
      setUserState(user);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const logout = () => {
    logoutUtil();
    setUserState(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

// Separate export for the hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};