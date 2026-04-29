"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authApi, getErrorMessage } from "@/lib/api";
import { saveAuth, loadAuth, clearAuth, type StoredAuth } from "@/lib/auth";
import type { User, Organization } from "@/types";

interface UseAuthReturn {
  user: User | null;
  organization: Organization | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, redirectTo?: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    organization: { name: string; slug: string };
  }) => Promise<void>;
  logout: () => void;
  error: string | null;
}

export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [auth, setAuth] = useState<StoredAuth | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAuth(loadAuth());
  }, []);

  const login = useCallback(async (email: string, password: string, redirectTo = "/dashboard") => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await authApi.login(email, password);
      const stored: StoredAuth = {
        user: { ...data.user, role: data.role as User["role"] },
        organization: data.organization,
        token: data.token.access_token,
      };
      saveAuth(stored.user, stored.organization, stored.token);
      setAuth(stored);
      router.push(redirectTo);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const register = useCallback(async (data: Parameters<UseAuthReturn["register"]>[0]) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: resp } = await authApi.register(data);
      const stored: StoredAuth = {
        user: { ...resp.user, role: resp.role as User["role"] },
        organization: resp.organization,
        token: resp.token.access_token,
      };
      saveAuth(stored.user, stored.organization, stored.token);
      setAuth(stored);
      router.push("/dashboard");
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const logout = useCallback(() => {
    clearAuth();
    setAuth(null);
    router.push("/login");
  }, [router]);

  return {
    user: auth?.user ?? null,
    organization: auth?.organization ?? null,
    isLoading,
    isAuthenticated: Boolean(auth?.token),
    login,
    register,
    logout,
    error,
  };
}
