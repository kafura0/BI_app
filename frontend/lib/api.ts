import axios, { AxiosError, AxiosInstance, AxiosResponse } from "axios";
import type {
  Dataset,
  Dashboard,
  DashboardData,
  Insight,
  UsageStats,
  PaginatedResponse,
} from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: BASE_URL,
    headers: { "Content-Type": "application/json" },
    timeout: 30_000,
  });

  client.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (res: AxiosResponse) => res,
    (error: AxiosError) => {
      if (error.response?.status === 401 && typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("auth_state");
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }
  );

  return client;
}

export const apiClient = createApiClient();

// --- Auth ---
export const authApi = {
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    organization: { name: string; slug: string };
  }) => apiClient.post("/auth/register", data),

  login: (email: string, password: string) =>
    apiClient.post("/auth/login", { email, password }),

  me: () => apiClient.get("/auth/me"),

  verifyEmail: (token: string) =>
    apiClient.get(`/auth/verify-email?token=${token}`),

  resendVerification: () => apiClient.post("/auth/resend-verification"),
};

// --- Datasets ---
export const datasetsApi = {
  list: (page = 1, pageSize = 20) =>
    apiClient.get<PaginatedResponse<Dataset>>(`/datasets?page=${page}&page_size=${pageSize}`),

  get: (id: string) => apiClient.get<Dataset>(`/datasets/${id}`),

  upload: (formData: FormData) =>
    apiClient.post<Dataset>("/datasets", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  delete: (id: string) => apiClient.delete(`/datasets/${id}`),

  exportCsv: (id: string) => `${BASE_URL}/export/datasets/${id}/csv`,
  exportPdf: (id: string) => `${BASE_URL}/export/datasets/${id}/pdf`,
};

// --- Dashboards ---
export const dashboardsApi = {
  list: () => apiClient.get<Dashboard[]>("/dashboards"),

  create: (data: { name: string; dataset_id: string; description?: string }) =>
    apiClient.post<Dashboard>("/dashboards", data),

  getData: (id: string) => apiClient.get<DashboardData>(`/dashboards/${id}/data`),

  update: (id: string, data: Partial<Dashboard>) =>
    apiClient.patch<Dashboard>(`/dashboards/${id}`, data),

  delete: (id: string) => apiClient.delete(`/dashboards/${id}`),

  exportPdf: (id: string) => `${BASE_URL}/export/dashboards/${id}/pdf`,
};

// --- Insights ---
export const insightsApi = {
  list: (page = 1) => apiClient.get<{ items: Insight[]; total: number }>(`/insights?page=${page}`),

  create: (query: string, datasetId?: string) =>
    apiClient.post<Insight>("/insights", { query, dataset_id: datasetId }),

  get: (id: string) => apiClient.get<Insight>(`/insights/${id}`),
};

// --- Analytics ---
export const analyticsApi = {
  getUsage: (periodDays = 30) =>
    apiClient.get<UsageStats>(`/analytics/usage?period_days=${periodDays}`),
};

// --- Team / Invites ---
export const teamApi = {
  listMembers: () => apiClient.get<TeamMember[]>("/invites/members"),

  invite: (email: string, role: string) =>
    apiClient.post("/invites", { email, role }),

  listInvites: () => apiClient.get<PendingInvite[]>("/invites"),

  revokeInvite: (id: string) => apiClient.delete(`/invites/${id}`),

  updateMemberRole: (userId: string, role: string) =>
    apiClient.patch(`/invites/members/${userId}?role=${role}`),

  removeMember: (userId: string) =>
    apiClient.delete(`/invites/members/${userId}`),

  acceptInvite: (token: string) =>
    apiClient.post(`/invites/accept?token=${token}`),
};

// --- Billing ---
export const billingApi = {
  createCheckout: (plan: string) =>
    apiClient.post<{ checkout_url: string }>("/billing/checkout", { plan }),

  createPortalSession: () =>
    apiClient.post<{ portal_url: string }>("/billing/portal"),
};

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return detail.map((e: { message: string }) => e.message).join(", ");
  }
  return "An unexpected error occurred";
}

// Types used only in this file
export interface TeamMember {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  joined_at: string;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}
