"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, FileText, RefreshCw, BarChart3 } from "lucide-react";
import { dashboardsApi, getErrorMessage } from "@/lib/api";
import type { Dashboard } from "@/types";
import { MetricsCard } from "@/components/charts/metrics-card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { ForecastChart } from "@/components/charts/forecast-chart";
import { downloadWithAuth } from "@/lib/download";
import { useToast } from "@/components/ui/toast";

export default function DashboardViewPage() {
  const { id } = useParams<{ id: string }>();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [dashboardData, setDashboardData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const { error: toastError, success: toastSuccess } = useToast();

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await dashboardsApi.getData(id);
        if (cancelled) return;
        setDashboard(res.data.dashboard);
        setDashboardData(res.data.widget_data);
      } catch (e) {
        if (cancelled) return;
        const msg = getErrorMessage(e);
        if (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("404")) {
          setNotFound(true);
        } else {
          setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleExportPdf = async () => {
    if (!dashboard) return;
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

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
    </div>
  );

  if (notFound) return (
    <div className="flex flex-col items-center justify-center h-96 text-center">
      <div className="w-16 h-16 bg-red-600/10 rounded-2xl flex items-center justify-center mb-4">
        <BarChart3 className="w-8 h-8 text-red-400" />
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">Dashboard not found</h2>
      <p className="text-slate-400 mb-6 max-w-md">This dashboard may have been deleted or you do not have access to it.</p>
      <Link href="/dashboard" className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors">
        Back to Dashboards
      </Link>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-96 text-center">
      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm mb-4">{error}</div>
      <Link href="/dashboard" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium">Back to Dashboards</Link>
    </div>
  );

  if (!dashboard) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">{dashboard.name}</h1>
            {dashboard.description && (
              <p className="text-slate-400 text-sm mt-0.5">{dashboard.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/edit/${dashboard.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-medium rounded-lg transition-colors"
          >
            <Pencil className="w-3 h-3" /> Edit
          </Link>
          <button
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-400 hover:text-white text-xs font-medium rounded-lg transition-colors"
          >
            {exportingPdf ? <RefreshCw className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />} Export PDF
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
        {dashboard.widgets
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
        {dashboard.widgets
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
      {dashboard.widgets
        .filter((w) => w.type === "forecast")
        .map((widget) => {
          const data = dashboardData[widget.id] as { data: { x: string; value: number; type: "actual" | "forecast" }[]; r2: number; periods: number } | undefined;
          return <ForecastChart key={widget.id} title={widget.title} data={data ?? { data: [], r2: 0, periods: 0 }} />;
        })}
    </div>
  );
}
