'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setToken, ApiClientError } from '../lib/api';
import type { AuthResponse } from '../types';

interface User {
  id: string;
  email: string;
  name: string | null;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('auth_token');
    if (stored) {
      setToken(stored);
      setTokenState(stored);
      // Verify token is still valid
      api.get<User>('/auth/me')
        .then((u) => setUser(u))
        .catch(() => {
          localStorage.removeItem('auth_token');
          setToken(null);
          setTokenState(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const handleAuth = useCallback((result: AuthResponse) => {
    setUser(result.user);
    setTokenState(result.token);
    setToken(result.token);
    localStorage.setItem('auth_token', result.token);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.post<AuthResponse>('/auth/login', { email, password });
    handleAuth(result);
  }, [handleAuth]);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const result = await api.post<AuthResponse>('/auth/register', { email, password, name });
    handleAuth(result);
  }, [handleAuth]);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    setUser(null);
    setTokenState(null);
    setToken(null);
    localStorage.removeItem('auth_token');
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
