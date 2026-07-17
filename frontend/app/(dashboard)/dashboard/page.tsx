"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Pencil, FileText, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { dashboardsApi, datasetsApi, getErrorMessage } from "@/lib/api";
import type { Dashboard, Dataset } from "@/types";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { ForecastChart } from "@/components/charts/forecast-chart";
import { MetricsCard } from "@/components/charts/metrics-card";
import { downloadWithAuth } from "@/lib/download";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/use-auth";

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
  const { user } = useAuth();

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
      await downloadWithAuth(BASE_URL + "/export/dashboards/" + dashboard.id + "/pdf", dashboard.name + ".pdf");
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

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  if (datasets.length === 0) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 bg-surface-container">
        <span className="material-symbols-outlined text-[40px] text-primary">bar_chart</span>
      </div>
      <h2 className="text-headline-md font-bold mb-2 text-on-surface">Welcome to BI Platform</h2>
      <p className="text-body-md mb-8 max-w-md text-on-surface-variant">Upload a CSV or Excel file to automatically generate your first dashboard and start exploring insights.</p>
      <Link href="/datasets" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all active:scale-95 shadow-lg bg-primary text-on-primary">
        <Plus className="w-5 h-5" /> Upload Your First Dataset
      </Link>
    </div>
  );

  const metricWidgets = currentDashboard?.widgets.filter((w) => w.type === "metric_card") ?? [];
  const chartWidgets = currentDashboard?.widgets.filter((w) => w.type === "line_chart" || w.type === "bar_chart") ?? [];
  const forecastWidgets = currentDashboard?.widgets.filter((w) => w.type === "forecast") ?? [];

  return (
    <div className="space-y-xl">
      {/* Welcome Header */}
      <section>
        <h2 className="font-display-lg text-headline-lg-mobile md:text-display-lg font-bold text-on-surface tracking-tight mb-sm">
          {greeting}, <span className="text-primary">{user?.full_name?.split(" ")[0] ?? "there"}</span>.
        </h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          {currentDashboard
            ? `Viewing "${currentDashboard.name}" — ${dashboards.length} dashboard${dashboards.length !== 1 ? "s" : ""} across ${datasets.length} dataset${datasets.length !== 1 ? "s" : ""}.`
            : "Select or create a dashboard to get started."}
        </p>
      </section>

      {error && (
        <div className="p-3 rounded-lg text-sm bg-error-container text-on-error-container">{error}</div>
      )}

      {/* Dashboard tabs + actions */}
      {dashboards.length > 0 && currentDashboard && (
        <div className="glass-card rounded-xl p-md">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-2 flex-wrap">
              {dashboards.map((d) => (
                <button key={d.id} onClick={() => switchDashboard(d.id)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                    activeDashboard === d.id
                      ? "bg-secondary-container text-on-secondary-container"
                      : "bg-surface-container-high text-on-surface-variant"
                  )}>
                  {d.name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Link href={"/dashboard/edit/" + currentDashboard.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-surface-container-high text-on-surface-variant">
                <Pencil className="w-3 h-3" /> Edit
              </Link>
              <button onClick={() => handleExportPdf(currentDashboard)} disabled={exportingPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 bg-surface-container-high text-on-surface-variant">
                {exportingPdf ? <RefreshCw className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />} Export PDF
              </button>
              <button onClick={() => handleDelete(currentDashboard.id)}
                className="p-1.5 rounded-lg transition-colors text-on-surface-variant">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {currentDashboard ? (
        <>
          {/* Metric Cards from real widget data */}
          {metricWidgets.length > 0 && (
            <section className={cn("grid gap-md", metricWidgets.length <= 3 ? `grid-cols-${metricWidgets.length}` : "grid-cols-2 lg:grid-cols-4")}>
              {metricWidgets.map((widget) => {
                const data = dashboardData[widget.id] as { value: number } | undefined;
                return (
                  <div key={widget.id} className="glass-card rounded-xl p-md flex flex-col justify-between hover:border-outline-variant transition-colors group">
                    <MetricsCard title={widget.title} value={data?.value ?? 0} color={widget.color} />
                  </div>
                );
              })}
            </section>
          )}

          {/* Charts */}
          {chartWidgets.length > 0 && (
            <section className="glass-card rounded-xl p-lg">
              <div className="flex justify-between items-center mb-lg">
                <div>
                  <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">Charts</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">{chartWidgets.length} visualization{chartWidgets.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
              <div className="space-y-lg">
                {chartWidgets.map((widget) => {
                  const data = dashboardData[widget.id] as { x: string; value: number }[] | undefined;
                  return (
                    <RevenueChart
                      key={widget.id}
                      title={widget.title}
                      data={data ?? []}
                      type={widget.type === "bar_chart" ? "bar" : "line"}
                      color={widget.color}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {/* Forecasts */}
          {forecastWidgets.map((widget) => {
            const data = dashboardData[widget.id] as { data: { x: string; value: number; type: "actual" | "forecast" }[]; r2: number; periods: number } | undefined;
            return (
              <ForecastChart key={widget.id} title={widget.title} data={data ?? { data: [], r2: 0, periods: 0 }} />
            );
          })}

          {/* Pagination */}
          {totalDashboards > pageSize && (
            <div className="flex items-center justify-between pt-4 border-t border-outline-variant">
              <p className="text-sm text-on-surface-variant">Page {page} of {Math.ceil(totalDashboards / pageSize)}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 bg-surface-container-high text-on-surface">Previous</button>
                <button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(totalDashboards / pageSize)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 bg-surface-container-high text-on-surface">Next</button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant">dashboard_customize</span>
          <p className="font-headline-md mt-4 mb-2 text-on-surface">No dashboards yet</p>
          <p className="font-body-md mb-6 text-on-surface-variant">Create one from an existing dataset.</p>
          <Link href="/datasets" className="font-body-md font-medium text-primary">View Datasets →</Link>
        </div>
      )}

      {/* FAB: Ask AI */}
      <Link href="/insights"
        className="fixed bottom-xl right-margin-desktop w-14 h-14 rounded-full bg-gradient-to-br from-primary to-tertiary text-[#0d0d15] shadow-[0_0_20px_rgba(160,120,255,0.4)] hover:shadow-[0_0_30px_rgba(160,120,255,0.6)] hover:scale-105 transition-all duration-300 flex items-center justify-center z-50 group">
        <span className="material-symbols-outlined text-[28px] group-hover:rotate-12 transition-transform">smart_toy</span>
      </Link>
    </div>
  );
}
