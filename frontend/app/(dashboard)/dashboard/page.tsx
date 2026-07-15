"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Pencil, FileText, Trash2 } from "lucide-react";
import { dashboardsApi, datasetsApi, getErrorMessage } from "@/lib/api";
import type { Dashboard, Dataset } from "@/types";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { ForecastChart } from "@/components/charts/forecast-chart";
import { downloadWithAuth } from "@/lib/download";
import { useToast } from "@/components/ui/toast";
import { formatNumber } from "@/lib/utils";

export default function DashboardPage() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [activeDashboard, setActiveDashboard] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [page, setPage] = useState(1);
  const [totalDashboards, setTotalDashboards] = useState(0);
  const pageSize = 20;
  const { error: toastError, success: toastSuccess } = useToast();

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [dashRes, dsRes] = await Promise.all([dashboardsApi.list(page, pageSize), datasetsApi.list()]);
        if (cancelled) return;
        setDashboards(dashRes.data.items);
        setTotalDashboards(dashRes.data.total);
        setDatasets(dsRes.data.items);
        if (dashRes.data.items.length > 0) {
          if (!dashRes.data.items.some((d) => d.id === activeDashboard)) {
            setActiveDashboard(dashRes.data.items[0].id);
            const dataRes = await dashboardsApi.getData(dashRes.data.items[0].id);
            if (cancelled) return;
            setDashboardData(dataRes.data.widget_data);
          }
        }
      } catch (e) {
        if (!cancelled) setError(getErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const switchDashboard = async (id: string) => {
    setActiveDashboard(id);
    setError(null);
    try {
      const res = await dashboardsApi.getData(id);
      setDashboardData(res.data.widget_data);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const handleExportPdf = async (dashboard: Dashboard) => {
    setExportingPdf(true);
    try {
      await downloadWithAuth(`${BASE_URL}/export/dashboards/${dashboard.id}/pdf`, `${dashboard.name}.pdf`);
      toastSuccess("PDF exported");
    } catch {
      toastError("Failed to export PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this dashboard?")) return;
    try {
      await dashboardsApi.delete(id);
      const remaining = dashboards.filter((d) => d.id !== id);
      setDashboards(remaining);
      if (activeDashboard === id) {
        setActiveDashboard(remaining[0]?.id ?? null);
        if (remaining[0]) {
          const res = await dashboardsApi.getData(remaining[0].id);
          setDashboardData(res.data.widget_data);
        }
      }
    } catch {
      toastError("Failed to delete dashboard");
    }
  };

  const currentDashboard = dashboards.find((d) => d.id === activeDashboard);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} />
    </div>
  );

  if (datasets.length === 0) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: "var(--surface-container)" }}>
        <span className="material-symbols-outlined text-[40px]" style={{ color: "var(--primary)" }}>bar_chart</span>
      </div>
      <h2 className="text-headline-md font-bold mb-2" style={{ color: "var(--on-surface)" }}>Welcome to BI Platform</h2>
      <p className="text-body-md mb-8 max-w-md" style={{ color: "var(--on-surface-variant)" }}>Upload a CSV or Excel file to automatically generate your first dashboard and start exploring insights.</p>
      <Link href="/datasets" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all active:scale-95 shadow-lg" style={{ backgroundColor: "var(--primary)", color: "var(--on-primary)" }}>
        <Plus className="w-5 h-5" /> Upload Your First Dataset
      </Link>
    </div>
  );

  return (
    <div className="space-y-lg">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-headline-lg font-bold tracking-tight" style={{ color: "var(--on-surface)" }}>Dashboard</h2>
          <p className="text-body-md mt-1" style={{ color: "var(--on-surface-variant)" }}>AI-generated insights from your data</p>
        </div>
        <Link href="/datasets"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all active:scale-95"
          style={{ backgroundColor: "var(--surface-container-high)", border: "1px solid var(--outline-variant)", color: "var(--on-surface)" }}>
          <Plus className="w-4 h-4" /> New Dataset
        </Link>
      </div>

      {error && (
        <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: "var(--error-container)", color: "var(--on-error-container)" }}>{error}</div>
      )}

      {/* Dashboard tabs + actions */}
      {dashboards.length > 0 && currentDashboard && (
        <div className="glass-card rounded-xl p-md">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-2 flex-wrap">
              {dashboards.map((d) => (
                <button
                  key={d.id}
                  onClick={() => switchDashboard(d.id)}
                  className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={activeDashboard === d.id ? { backgroundColor: "var(--secondary-container)", color: "var(--on-secondary-container)" } : { backgroundColor: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}
                >
                  {d.name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/dashboard/edit/${currentDashboard.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}>
                <Pencil className="w-3 h-3" /> Edit
              </Link>
              <button onClick={() => handleExportPdf(currentDashboard)} disabled={exportingPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}>
                {exportingPdf ? <RefreshCw className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />} Export PDF
              </button>
              <button onClick={() => handleDelete(currentDashboard.id)}
                className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--on-surface-variant)" }}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {currentDashboard ? (
        <>
          {/* AI Summary Card */}
          <div className="glass-card rounded-xl p-lg flex flex-col md:flex-row gap-lg items-center relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full" style={{ backgroundColor: "var(--primary)", opacity: 0.05 }}></div>
            <div className="flex-1 space-y-md">
              <div className="flex items-center gap-2" style={{ color: "var(--primary)" }}>
                <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                <span className="font-label-md text-label-md uppercase tracking-widest">AI Intelligence Brief</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>Revenue Trend</p>
                  <p className="font-title-md" style={{ color: "var(--tertiary)" }}>Up 18% <span className="text-body-md" style={{ color: "var(--on-surface-variant)" }}>vs last month</span></p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>Retention</p>
                  <p className="font-title-md" style={{ color: "var(--primary)" }}>Churn decreased by 6%</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>Alert</p>
                  <p className="font-title-md" style={{ color: "var(--error)" }}>Inventory risk — Electronics</p>
                </div>
              </div>
            </div>
            <Link href="/insights"
              className="shrink-0 px-lg py-3 rounded-lg font-title-md flex items-center gap-2 transition-all active:scale-95 shadow-lg"
              style={{ backgroundColor: "var(--primary)", color: "var(--on-primary)" }}>
              <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
              Ask AI
            </Link>
          </div>

          {/* Metric cards */}
          {currentDashboard.widgets.filter((w) => w.type === "metric_card").length > 0 && (
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
              {currentDashboard.widgets.filter((w) => w.type === "metric_card").map((widget) => {
                const data = dashboardData[widget.id] as { value: number } | undefined;
                return (
                  <div key={widget.id} className="glass-card glass-card-hover rounded-xl p-md space-y-sm transition-all">
                    <p className="font-label-md text-label-md uppercase" style={{ color: "var(--on-surface-variant)" }}>{widget.title}</p>
                    <h3 className="text-headline-md font-bold" style={{ color: "var(--on-surface)" }}>${formatNumber(data?.value ?? 0)}</h3>
                  </div>
                );
              })}
            </section>
          )}

          {/* Charts grid */}
          {currentDashboard.widgets.filter((w) => w.type === "line_chart" || w.type === "bar_chart").length > 0 && (
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
              {currentDashboard.widgets.filter((w) => w.type === "line_chart" || w.type === "bar_chart").map((widget) => {
                const data = dashboardData[widget.id] as { x: string; value: number }[] | undefined;
                return (
                  <div key={widget.id} className="glass-card rounded-xl p-lg">
                    <RevenueChart title={widget.title} data={data ?? []} type={widget.type === "bar_chart" ? "bar" : "line"} color={widget.color} />
                  </div>
                );
              })}
            </section>
          )}

          {/* Forecast */}
          {currentDashboard.widgets.filter((w) => w.type === "forecast").map((widget) => {
            const data = dashboardData[widget.id] as { data: { x: string; value: number; type: "actual" | "forecast" }[]; r2: number; periods: number } | undefined;
            return <ForecastChart key={widget.id} title={widget.title} data={data ?? { data: [], r2: 0, periods: 0 }} />;
          })}

          {/* Pagination */}
          {totalDashboards > pageSize && (
            <div className="flex items-center justify-between pt-4" style={{ borderTop: "1px solid var(--outline-variant)" }}>
              <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
                Page {page} of {Math.ceil(totalDashboards / pageSize)}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
                  style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface)" }}>
                  Previous
                </button>
                <button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(totalDashboards / pageSize)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
                  style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface)" }}>
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <span className="material-symbols-outlined text-[48px]" style={{ color: "var(--on-surface-variant)" }}>dashboard_customize</span>
          <p className="font-title-md mt-4 mb-2" style={{ color: "var(--on-surface)" }}>No dashboards yet</p>
          <p className="text-sm mb-6" style={{ color: "var(--on-surface-variant)" }}>Create one from an existing dataset.</p>
          <Link href="/datasets" className="text-sm font-medium" style={{ color: "var(--primary)" }}>View Datasets →</Link>
        </div>
      )}
    </div>
  );
}
