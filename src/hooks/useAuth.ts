import { useState, useCallback, useEffect } from 'react';
import { api } from '../lib/api';

interface AuthUser {
  id?: string;
  email: string;
  role: 'agency_admin' | 'subaccount_user';
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string, role: 'agency_admin' | 'subaccount_user') => Promise<void>;
  register: (email: string, password: string, role: 'agency_admin' | 'subaccount_user') => Promise<void>;
  logout: () => void;
  error: string | null;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Restore session from httpOnly cookie on mount
  useEffect(() => {
    api.get<{ user: AuthUser }>('/auth/me')
      .then(data => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string, _role: 'agency_admin' | 'subaccount_user') => {
    setError(null);
    try {
      const data = await api.post<{ user: AuthUser }>('/auth/login', { email, password });
      setUser(data.user);
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    }
  }, []);

  const register = useCallback(async (email: string, password: string, role: 'agency_admin' | 'subaccount_user') => {
    setError(null);
    try {
      const data = await api.post<{ user: AuthUser }>('/auth/register', { email, password, role });
      setUser(data.user);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => {});
    setUser(null);
  }, []);

  return {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
    error,
  };
}
