import type { User, Organization } from "@/types";

const AUTH_KEY = "auth_state";
const TOKEN_KEY = "access_token";

export interface StoredAuth {
  user: User;
  organization: Organization;
  token: string;
}

export function saveAuth(user: User, organization: Organization, token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(AUTH_KEY, JSON.stringify({ user, organization, token }));
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
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(AUTH_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(loadAuth()?.token);
}

export function patchStoredUser(patch: Partial<User>): void {
  const auth = loadAuth();
  if (!auth) return;
  const updated = { ...auth, user: { ...auth.user, ...patch } };
  localStorage.setItem(AUTH_KEY, JSON.stringify(updated));
}
