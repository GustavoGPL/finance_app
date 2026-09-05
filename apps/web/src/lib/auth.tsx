'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, clearTokens, getTokens, storeTokens } from './api';
import type { AuthResponse, LoginDto, MeResult, RegisterDto } from './types';

interface AuthContextValue {
  user: MeResult['user'] | null;
  household: MeResult['household'] | null;
  loading: boolean;
  login: (dto: LoginDto) => Promise<void>;
  register: (dto: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<MeResult['user'] | null>(null);
  const [household, setHousehold] = useState<MeResult['household'] | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const me = await apiFetch<MeResult>('/users/me');
    setUser(me.user);
    setHousehold(me.household);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { access } = getTokens();
        if (!access) {
          if (!cancelled) setLoading(false);
          return;
        }
        await reload();
      } catch {
        // apiFetch já redireciona para /login em sessão inválida
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const login = useCallback(
    async (dto: LoginDto) => {
      const res = await apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: dto });
      storeTokens(res);
      await reload();
    },
    [reload],
  );

  const register = useCallback(
    async (dto: RegisterDto) => {
      const res = await apiFetch<AuthResponse>('/auth/register', { method: 'POST', body: dto });
      storeTokens(res);
      await reload();
    },
    [reload],
  );

  const logout = useCallback(async () => {
    try {
      const { refresh } = getTokens();
      if (refresh) {
        await apiFetch('/auth/logout', { method: 'POST', body: { refreshToken: refresh }, skipRefresh: true });
      }
    } catch {
      // ignora falha no logout remoto
    }
    clearTokens();
    setUser(null);
    setHousehold(null);
    router.replace('/login');
  }, [router]);

  const value = useMemo(
    () => ({ user, household, loading, login, register, logout, reload }),
    [user, household, loading, login, register, logout, reload],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  }
  return ctx;
}
