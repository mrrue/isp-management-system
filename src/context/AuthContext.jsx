import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('isp_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('isp_settings');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('isp_auth_token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.user);
          localStorage.setItem('isp_user', JSON.stringify(res.user));

          // Fetch fresh settings
          const sRes = await api.get('/settings');
          setSettings(sRes.settings);
          localStorage.setItem('isp_settings', JSON.stringify(sRes.settings));
        } catch (err) {
          console.warn('Auth verification failed:', err);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username, password) => {
    const data = await api.post('/auth/login', { username, password });
    localStorage.setItem('isp_auth_token', data.token);
    localStorage.setItem('isp_user', JSON.stringify(data.user));
    if (data.settings) {
      localStorage.setItem('isp_settings', JSON.stringify(data.settings));
      setSettings(data.settings);
    }
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('isp_auth_token');
    localStorage.removeItem('isp_user');
    setUser(null);
  };

  const updateSettingsState = (newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    localStorage.setItem('isp_settings', JSON.stringify({ ...settings, ...newSettings }));
  };

  // Permission Checker: Admin has all permissions automatically
  const hasPermission = (permissionKey) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (Array.isArray(user.permissions) && user.permissions.includes(permissionKey)) {
      return true;
    }
    return false;
  };

  // Currency Formatter
  const formatCurrency = (amount) => {
    const symbol = settings?.business_info?.currency_symbol || 'Rs.';
    const num = parseFloat(amount) || 0;
    return `${symbol} ${num.toLocaleString()}`;
  };

  const value = {
    user,
    settings,
    loading,
    login,
    logout,
    hasPermission,
    formatCurrency,
    updateSettingsState,
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager',
    isEmployee: user?.role === 'employee'
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
