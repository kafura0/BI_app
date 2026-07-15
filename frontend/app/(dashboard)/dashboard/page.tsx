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
    <div className="flex flex-col items-center justify-center h-96 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: "var(--primary-container)" }}>
        <span className="material-symbols-outlined text-[32px]" style={{ color: "var(--on-primary-container)" }}>bar_chart</span>
      </div>
      <h2 className="text-headline-md font-bold mb-2" style={{ color: "var(--on-surface)" }}>No data yet</h2>
      <p className="text-body-md mb-6 max-w-md" style={{ color: "var(--on-surface-variant)" }}>Upload a CSV or Excel file to automatically generate your first dashboard.</p>
      <Link href="/datasets" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all active:scale-95" style={{ backgroundColor: "var(--primary)", color: "var(--on-primary)" }}>
        <Plus className="w-4 h-4" /> Upload Dataset
      </Link>
    </div>
  );

  return (
    <div className="space-y-lg">
      {/* Header Section */}
      <section className="space-y-sm">
        <h2 className="font-display-lg text-display-lg tracking-tight" style={{ color: "var(--on-surface)" }}>Dashboard</h2>
        <p className="font-body-lg text-body-lg" style={{ color: "var(--on-surface-variant)" }}>AI-generated insights from your data</p>
      </section>

      {error && (
        <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: "var(--error-container)", color: "var(--on-error-container)" }}>{error}</div>
      )}

      {/* Dashboard tabs + actions */}
      {dashboards.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="flex gap-2 flex-1 flex-wrap">
            {dashboards.map((d) => (
              <button
                key={d.id}
                onClick={() => switchDashboard(d.id)}
                className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
                style={activeDashboard === d.id ? { backgroundColor: "var(--secondary-container)", color: "var(--on-secondary-container)" } : { backgroundColor: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}
              >
                {d.name}
              </button>
            ))}
          </div>
          {currentDashboard && (
            <div className="flex items-center gap-2">
              <Link
                href={`/dashboard/edit/${currentDashboard.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}
              >
                <Pencil className="w-3 h-3" /> Edit
              </Link>
              <button
                onClick={() => handleExportPdf(currentDashboard)}
                disabled={exportingPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}
              >
                {exportingPdf ? <RefreshCw className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />} Export PDF
              </button>
              <button
                onClick={() => handleDelete(currentDashboard.id)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: "var(--on-surface-variant)" }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {currentDashboard && (
        <>
          {/* Metric cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
            {currentDashboard.widgets
              .filter((w) => w.type === "metric_card")
              .map((widget) => {
                const data = dashboardData[widget.id] as { value: number } | undefined;
                return (
                  <div key={widget.id} className="glass-card glass-card-hover rounded-xl p-md space-y-sm transition-all">
                    <p className="font-label-md text-label-md uppercase" style={{ color: "var(--on-surface-variant)" }}>{widget.title}</p>
                    <h3 className="font-headline-md text-headline-md font-bold" style={{ color: "var(--on-surface)" }}>${formatNumber(data?.value ?? 0)}</h3>
                  </div>
                );
              })}
          </section>

          {/* Charts */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
            {currentDashboard.widgets
              .filter((w) => w.type === "line_chart" || w.type === "bar_chart")
              .map((widget) => {
                const data = dashboardData[widget.id] as { x: string; value: number }[] | undefined;
                return (
                  <div key={widget.id} className={widget.position.w >= 8 ? "lg:col-span-2 glass-card rounded-xl p-lg" : "glass-card rounded-xl p-lg lg:col-span-1"}>
                    <RevenueChart title={widget.title} data={data ?? []} type={widget.type === "bar_chart" ? "bar" : "line"} color={widget.color} />
                  </div>
                );
              })}
          </section>

          {/* Forecast */}
          {currentDashboard.widgets
            .filter((w) => w.type === "forecast")
            .map((widget) => {
              const data = dashboardData[widget.id] as { data: { x: string; value: number; type: "actual" | "forecast" }[]; r2: number; periods: number } | undefined;
              return <ForecastChart key={widget.id} title={widget.title} data={data ?? { data: [], r2: 0, periods: 0 }} />;
            })}
        </>
      )}

      {dashboards.length === 0 && datasets.length > 0 && (
        <div className="text-center py-12">
          <p className="mb-4" style={{ color: "var(--on-surface-variant)" }}>No dashboards yet. Create one from a dataset.</p>
          <Link href="/datasets" className="text-sm font-medium" style={{ color: "var(--primary)" }}>View Datasets →</Link>
        </div>
      )}

      {totalDashboards > pageSize && (
        <div className="flex items-center justify-between pt-4" style={{ borderTop: "1px solid var(--outline-variant)" }}>
          <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
            Page {page} of {Math.ceil(totalDashboards / pageSize)} ({totalDashboards} total)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
              style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface)" }}
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(totalDashboards / pageSize)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
              style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface)" }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
