import type { User, Organization } from "@/types";

const AUTH_KEY = "auth_state";

export interface StoredAuth {
  user: User;
  organization: Organization;
}

export function saveAuth(user: User, organization: Organization): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify({ user, organization }));
}

export function loadAuth(): StoredAuth | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  localStorage.removeItem(AUTH_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(loadAuth()?.user);
}

export function patchStoredUser(patch: Partial<User>): void {
  const auth = loadAuth();
  if (!auth) return;
  const updated = { ...auth, user: { ...auth.user, ...patch } };
  localStorage.setItem(AUTH_KEY, JSON.stringify(updated));
}

export async function serverIsAuthenticated(): Promise<boolean> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/auth/me`, {
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}
