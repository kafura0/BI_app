export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "pro" | "enterprise";
  created_at: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthState {
  user: User | null;
  organization: Organization | null;
  token: string | null;
}

export interface Dataset {
  id: string;
  organization_id: string;
  uploaded_by: string | null;
  name: string;
  description: string | null;
  file_type: string;
  file_size_bytes: number;
  row_count: number;
  column_count: number;
  schema_definition: {
    columns: ColumnDef[];
  };
  status: "pending" | "processing" | "ready" | "failed";
  statistics: Record<string, ColumnStats>;
  created_at: string;
  updated_at: string;
}

export interface ColumnDef {
  name: string;
  dtype: "numeric" | "string" | "datetime" | "boolean";
  nullable: boolean;
  sample_values: unknown[];
  is_numeric: boolean;
}

export interface ColumnStats {
  dtype: string;
  min?: number;
  max?: number;
  mean?: number;
  std?: number;
  null_count: number;
  unique_count?: number;
  top_values?: Record<string, number>;
}

export interface WidgetConfig {
  id: string;
  type: "line_chart" | "bar_chart" | "pie_chart" | "metric_card" | "table" | "forecast";
  title: string;
  x_column: string | null;
  y_column: string | null;
  group_by: string | null;
  aggregation: "sum" | "avg" | "count" | "max" | "min";
  filters: Record<string, unknown>;
  position: { x: number; y: number; w: number; h: number };
  color: string;
}

export interface Dashboard {
  id: string;
  organization_id: string;
  dataset_id: string;
  created_by: string | null;
  name: string;
  description: string | null;
  widgets: WidgetConfig[];
  is_default: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardData {
  dashboard: Dashboard;
  widget_data: Record<string, unknown>;
}

export interface KeyMetric {
  label: string;
  value: string | number;
  change: string | null;
  trend: "up" | "down" | "neutral" | null;
}

export interface InsightResponse {
  explanation: string;
  key_metrics: KeyMetric[];
  suggested_actions: string[];
}

export interface Insight {
  id: string;
  dataset_id: string | null;
  user_id: string;
  query: string;
  response: InsightResponse;
  model_used: string;
  tokens_used: number;
  created_at: string;
}

export interface DailyMetric {
  date: string;
  value: number;
}

export interface UsageStats {
  organization_id: string;
  period_days: number;
  total_queries: number;
  total_datasets: number;
  total_dashboard_views: number;
  active_users: number;
  queries_by_day: DailyMetric[];
  top_users: Record<string, unknown>[];
  plan: string;
  queries_remaining_today: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface ApiError {
  detail: string | { field: string; message: string }[];
}
