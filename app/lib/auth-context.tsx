"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { UserProfile } from "./types";
import * as api from "./api";

interface AuthContextValue {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  handleOAuthCode: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshTokenPair: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = user !== null;

  const fetchUser = useCallback(async () => {
    try {
      const res = await api.getMe();
      setUser(res.data);
    } catch {
      api.clearTokens();
      setUser(null);
    }
  }, []);

  // Restore session on mount
  useEffect(() => {
    const tokens = api.getTokens();
    if (tokens.accessToken) {
      fetchUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [fetchUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.login({ email, password });
      api.setTokens(res.data.accessToken, res.data.refreshToken);
      await fetchUser();
    },
    [fetchUser],
  );

  const register = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const res = await api.register({ email, password, displayName });
      api.setTokens(res.data.accessToken, res.data.refreshToken);
      await fetchUser();
    },
    [fetchUser],
  );

  const handleOAuthCode = useCallback(
    async (code: string) => {
      const res = await api.exchangeSocialCode(code);
      api.setTokens(res.data.accessToken, res.data.refreshToken);
      await fetchUser();
    },
    [fetchUser],
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // ignore errors on logout
    }
    api.clearTokens();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  const refreshTokenPair = useCallback(async () => {
    const tokens = api.getTokens();
    if (!tokens.refreshToken) throw new Error("No refresh token");
    const res = await api.refreshTokens(tokens.refreshToken);
    api.setTokens(res.data.accessToken, res.data.refreshToken);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        handleOAuthCode,
        logout,
        refreshUser,
        refreshTokenPair,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
