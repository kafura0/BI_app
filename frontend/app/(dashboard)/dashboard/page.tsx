"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw, BarChart3, Pencil, FileText, Trash2 } from "lucide-react";
import { dashboardsApi, datasetsApi, getErrorMessage } from "@/lib/api";
import type { Dashboard, Dataset } from "@/types";
import { MetricsCard } from "@/components/charts/metrics-card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { ForecastChart } from "@/components/charts/forecast-chart";
import { downloadWithAuth } from "@/lib/download";
import { useToast } from "@/components/ui/toast";

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
      <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
    </div>
  );

  if (datasets.length === 0) return (
    <div className="flex flex-col items-center justify-center h-96 text-center">
      <div className="w-16 h-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center mb-4">
        <BarChart3 className="w-8 h-8 text-indigo-400" />
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">No data yet</h2>
      <p className="text-slate-400 mb-6 max-w-md">Upload a CSV or Excel file to automatically generate your first dashboard.</p>
      <Link href="/datasets" className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors">
        <Plus className="w-4 h-4" /> Upload Dataset
      </Link>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">AI-generated insights from your data</p>
        </div>
        <Link href="/datasets" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> New Dataset
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>
      )}

      {/* Dashboard tabs + actions */}
      {dashboards.length > 0 && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <div className="flex gap-2 flex-1 flex-wrap">
            {dashboards.map((d) => (
              <button
                key={d.id}
                onClick={() => switchDashboard(d.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeDashboard === d.id ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                {d.name}
              </button>
            ))}
          </div>
          {currentDashboard && (
            <div className="flex items-center gap-2">
              <Link
                href={`/dashboard/edit/${currentDashboard.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-medium rounded-lg transition-colors"
              >
                <Pencil className="w-3 h-3" /> Edit
              </Link>
              <button
                onClick={() => handleExportPdf(currentDashboard)}
                disabled={exportingPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-400 hover:text-white text-xs font-medium rounded-lg transition-colors"
              >
                {exportingPdf ? <RefreshCw className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />} Export PDF
              </button>
              <button
                onClick={() => handleDelete(currentDashboard.id)}
                className="p-1.5 text-slate-600 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            {currentDashboard.widgets
              .filter((w) => w.type === "metric_card")
              .map((widget) => {
                const data = dashboardData[widget.id] as { value: number } | undefined;
                return (
                  <MetricsCard key={widget.id} title={widget.title} value={data?.value ?? 0} color={widget.color} />
                );
              })}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {currentDashboard.widgets
              .filter((w) => w.type === "line_chart" || w.type === "bar_chart")
              .map((widget) => {
                const data = dashboardData[widget.id] as { x: string; value: number }[] | undefined;
                return (
                  <div key={widget.id} className={widget.position.w >= 8 ? "lg:col-span-2" : "lg:col-span-1"}>
                    <RevenueChart title={widget.title} data={data ?? []} type={widget.type === "bar_chart" ? "bar" : "line"} color={widget.color} />
                  </div>
                );
              })}
          </div>

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
          <p className="text-slate-400 mb-4">No dashboards yet. Create one from a dataset.</p>
          <Link href="/datasets" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium">View Datasets →</Link>
        </div>
      )}

      {/* Pagination */}
      {totalDashboards > pageSize && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-800">
          <p className="text-sm text-slate-500">
            Page {page} of {Math.ceil(totalDashboards / pageSize)} ({totalDashboards} total)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 text-sm font-medium rounded-lg transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(totalDashboards / pageSize)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 text-sm font-medium rounded-lg transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
