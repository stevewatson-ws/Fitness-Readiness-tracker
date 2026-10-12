import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, profileApi } from '../services/api';

interface User {
  id: number;
  email: string;
  full_name?: string;
}

interface Profile {
  onboarding_complete: boolean;
  apple_health_connected: boolean;
  last_sync_at?: string;
  fitness_goal?: string;
  experience_level?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      const res = await profileApi.get();
      setProfile(res.data);
    } catch {}
  };

  useEffect(() => {
    const token = localStorage.getItem('fi_token');
    if (token) {
      authApi.me()
        .then(res => {
          setUser(res.data);
          return refreshProfile();
        })
        .catch(() => localStorage.removeItem('fi_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    localStorage.setItem('fi_token', res.data.access_token);
    const me = await authApi.me();
    setUser(me.data);
    await refreshProfile();
  };

  const register = async (email: string, password: string, name?: string) => {
    await authApi.register(email, password, name);
    await login(email, password);
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
    setProfile(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
