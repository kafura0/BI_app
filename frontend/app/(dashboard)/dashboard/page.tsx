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
    <div className="p-lg" />
  );

  if (datasets.length === 0) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: "var(--surface-container)" }}>
        <span className="material-symbols-outlined text-[40px]" style={{ color: "var(--primary)" }}>bar_chart</span>
      </div>
      <h2 className="font-headline-md text-headline-md font-semibold mb-2" style={{ color: "var(--on-surface)" }}>Welcome to BI Platform</h2>
      <p className="font-body-md text-body-md mb-8 max-w-md" style={{ color: "var(--on-surface-variant)" }}>Upload a CSV or Excel file to automatically generate your first dashboard and start exploring insights.</p>
      <Link href="/datasets" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all active:scale-95 shadow-lg" style={{ backgroundColor: "var(--primary)", color: "var(--on-primary)" }}>
        <Plus className="w-5 h-5" /> Upload Your First Dataset
      </Link>
    </div>
  );

  return (
    <div className="space-y-xl">
      {/* Welcome Header */}
      <section>
        <h2 className="font-headline-lg text-headline-lg font-bold tracking-tight" style={{ color: "var(--on-surface)" }}>
          Good morning, <span style={{ color: "var(--primary)" }}>there.</span>
        </h2>
        <p className="font-body-lg text-body-lg mt-1 flex items-center gap-sm" style={{ color: "var(--on-surface-variant)" }}>
          AI-generated insights from your data
        </p>
      </section>

      {error && (
        <div className="p-3 rounded-lg text-sm font-body-md" style={{ backgroundColor: "var(--error-container)", color: "var(--on-error-container)" }}>{error}</div>
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
                  className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all font-label-sm"
                  style={activeDashboard === d.id ? { backgroundColor: "var(--primary)", color: "var(--on-primary)" } : { backgroundColor: "var(--surface-container)", color: "var(--on-surface-variant)", border: "1px solid var(--outline-variant)" }}
                >
                  {d.name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/dashboard/edit/${currentDashboard.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors font-label-sm"
                style={{ backgroundColor: "var(--surface-container)", color: "var(--on-surface-variant)", border: "1px solid var(--outline-variant)" }}>
                <Pencil className="w-3 h-3" /> Edit
              </Link>
              <button onClick={() => handleExportPdf(currentDashboard)} disabled={exportingPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 font-label-sm"
                style={{ backgroundColor: "var(--surface-container)", color: "var(--on-surface-variant)", border: "1px solid var(--outline-variant)" }}>
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
          <section className="ai-gradient-card rounded-xl p-lg ai-shimmer relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" style={{ backgroundColor: "var(--tertiary)", opacity: 0.1 }}></div>
            <div className="relative z-10">
              <div className="flex items-center gap-sm mb-md" style={{ color: "var(--tertiary)" }}>
                <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                <h3 className="font-headline-md text-headline-md font-semibold" style={{ color: "var(--on-surface)" }}>Critical Insights</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <div className="glass-card rounded-lg p-md flex items-start gap-md" style={{ border: "1px solid var(--error-container)" }}>
                  <div className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "var(--error)", boxShadow: "0 0 8px var(--error)" }}></div>
                  <div>
                    <p className="font-body-md text-body-md" style={{ color: "var(--on-surface)" }}>Inventory risk detected in Electronics.</p>
                    <span className="font-mono-sm text-mono-sm block mt-xs" style={{ color: "var(--error)" }}>Action required within 48h</span>
                  </div>
                </div>
                <div className="glass-card rounded-lg p-md flex items-start gap-md" style={{ border: "1px solid var(--tertiary)" }}>
                  <div className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "var(--tertiary)", boxShadow: "0 0 8px var(--tertiary)" }}></div>
                  <div>
                    <p className="font-body-md text-body-md" style={{ color: "var(--on-surface)" }}>Customer churn improving in SaaS segment.</p>
                    <span className="font-mono-sm text-mono-sm block mt-xs" style={{ color: "var(--tertiary)" }}>Predictive retention up 4.2%</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Metric Grid */}
          {currentDashboard.widgets.filter((w) => w.type === "metric_card").length > 0 && (
            <section className="grid grid-cols-2 lg:grid-cols-5 gap-md">
              {currentDashboard.widgets.filter((w) => w.type === "metric_card").map((widget) => {
                const data = dashboardData[widget.id] as { value: number } | undefined;
                return (
                  <div key={widget.id} className="glass-card rounded-xl p-md flex flex-col justify-between transition-colors group">
                    <div>
                      <p className="font-label-sm text-label-sm mb-xs" style={{ color: "var(--on-surface-variant)" }}>{widget.title}</p>
                      <div className="flex items-end gap-sm">
                        <h4 className="font-headline-md text-headline-md" style={{ color: "var(--on-surface)" }}>${formatNumber(data?.value ?? 0)}</h4>
                        <span className="font-mono-sm text-mono-sm pb-1 flex items-center" style={{ color: "var(--tertiary)" }}>
                          <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                        </span>
                      </div>
                    </div>
                    <div className="mt-md opacity-60 group-hover:opacity-100 transition-opacity" style={{ color: "var(--primary)" }}>
                      <svg className="sparkline" viewBox="0 0 100 40">
                        <path d="M0,30 L20,25 L40,35 L60,15 L80,20 L100,5" style={{ stroke: "var(--primary)" }} />
                      </svg>
                    </div>
                  </div>
                );
              })}
              {Array.from({ length: Math.max(0, 5 - currentDashboard.widgets.filter((w) => w.type === "metric_card").length) }).map((_, i) => (
                <div key={`placeholder-${i}`} className="glass-card rounded-xl p-md flex flex-col justify-between transition-colors group" style={{ opacity: 0.5 }}>
                  <div>
                    <p className="font-label-sm text-label-sm mb-xs" style={{ color: "var(--on-surface-variant)" }}>—</p>
                    <div className="flex items-end gap-sm">
                      <h4 className="font-headline-md text-headline-md" style={{ color: "var(--on-surface)" }}>—</h4>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Main Chart Area */}
          {currentDashboard.widgets.filter((w) => w.type === "line_chart" || w.type === "bar_chart").length > 0 && (
            <section className="glass-card rounded-xl p-lg" style={{ borderTop: "2px solid var(--primary)" }}>
              <div className="flex justify-between items-center mb-lg">
                <div>
                  <h3 className="font-headline-md text-headline-md font-semibold" style={{ color: "var(--on-surface)" }}>
                    {currentDashboard.widgets.filter((w) => w.type === "line_chart" || w.type === "bar_chart")[0]?.title ?? "Revenue vs. Forecast"}
                  </h3>
                  <p className="font-body-md text-body-md" style={{ color: "var(--on-surface-variant)" }}>Q3 Fiscal Year Projection</p>
                </div>
                <div className="flex gap-sm">
                  <button className="px-3 py-1 rounded font-label-sm text-label-sm" style={{ backgroundColor: "var(--surface-container)", color: "var(--on-surface)", border: "1px solid var(--outline-variant)" }}>1M</button>
                  <button className="px-3 py-1 rounded font-label-sm text-label-sm" style={{ backgroundColor: "var(--primary-container)", color: "var(--on-primary-container)", border: "1px solid var(--primary)" }}>3M</button>
                  <button className="px-3 py-1 rounded font-label-sm text-label-sm" style={{ backgroundColor: "var(--surface-container)", color: "var(--on-surface)", border: "1px solid var(--outline-variant)" }}>YTD</button>
                </div>
              </div>
              <div className="w-full h-64 relative">
                <div className="w-full h-full">
                  {currentDashboard.widgets.filter((w) => w.type === "line_chart" || w.type === "bar_chart").map((widget) => {
                    const data = dashboardData[widget.id] as { x: string; value: number }[] | undefined;
                    return (
                      <RevenueChart key={widget.id} title={widget.title} data={data ?? []} type={widget.type === "bar_chart" ? "bar" : "line"} color={widget.color} />
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Forecast charts */}
          {currentDashboard.widgets.filter((w) => w.type === "forecast").map((widget) => {
            const data = dashboardData[widget.id] as { data: { x: string; value: number; type: "actual" | "forecast" }[]; r2: number; periods: number } | undefined;
            return <ForecastChart key={widget.id} title={widget.title} data={data ?? { data: [], r2: 0, periods: 0 }} />;
          })}

          {/* Secondary Grid */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
            {/* Sales Funnel */}
            <div className="glass-card rounded-xl p-lg flex flex-col">
              <h3 className="font-headline-md text-headline-md font-semibold mb-md" style={{ color: "var(--on-surface)" }}>Sales Funnel</h3>
              <div className="flex-1 flex flex-col justify-center gap-md">
                <div className="relative w-full h-8 rounded-sm overflow-hidden" style={{ backgroundColor: "var(--surface-container)" }}>
                  <div className="absolute top-0 left-0 h-full" style={{ backgroundColor: "var(--primary)", width: "100%" }}></div>
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 font-mono-sm text-mono-sm z-10 font-bold" style={{ color: "var(--on-primary-container)" }}>Leads: 12,400</span>
                </div>
                <div className="relative w-4/5 mx-auto h-8 rounded-sm overflow-hidden" style={{ backgroundColor: "var(--surface-container)" }}>
                  <div className="absolute top-0 left-0 h-full" style={{ backgroundColor: "var(--tertiary)", width: "100%" }}></div>
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 font-mono-sm text-mono-sm z-10 font-bold" style={{ color: "var(--on-primary-container)" }}>Qualified: 8,200</span>
                </div>
                <div className="relative w-3/5 mx-auto h-8 rounded-sm overflow-hidden" style={{ backgroundColor: "var(--surface-container)" }}>
                  <div className="absolute top-0 left-0 h-full" style={{ backgroundColor: "var(--primary-container)", width: "100%" }}></div>
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 font-mono-sm text-mono-sm z-10 font-bold" style={{ color: "var(--on-primary-container)" }}>Proposals: 4,100</span>
                </div>
                <div className="relative w-[30%] mx-auto h-8 rounded-sm overflow-hidden" style={{ backgroundColor: "var(--surface-container)" }}>
                  <div className="absolute top-0 left-0 h-full" style={{ backgroundColor: "var(--tertiary)", width: "100%" }}></div>
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 font-mono-sm text-mono-sm z-10 font-bold" style={{ color: "var(--on-primary-container)" }}>Closed: 1,200</span>
                </div>
              </div>
            </div>

            {/* Recent Activity Feed */}
            <div className="glass-card rounded-xl p-lg flex flex-col">
              <h3 className="font-headline-md text-headline-md font-semibold mb-md" style={{ color: "var(--on-surface)" }}>Recent Activity</h3>
              <div className="space-y-md flex-1 overflow-y-auto pr-2">
                <div className="flex gap-md">
                  <div className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "var(--primary)" }}></div>
                  <div>
                    <p className="font-body-md text-body-md" style={{ color: "var(--on-surface)" }}>Dashboard data model updated by System.</p>
                    <span className="font-label-sm text-label-sm" style={{ color: "var(--on-surface-variant)" }}>10 mins ago</span>
                  </div>
                </div>
                <div className="flex gap-md">
                  <div className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "var(--tertiary)" }}></div>
                  <div>
                    <p className="font-body-md text-body-md" style={{ color: "var(--on-surface)" }}>New dataset integration established.</p>
                    <span className="font-label-sm text-label-sm" style={{ color: "var(--on-surface-variant)" }}>1 hour ago</span>
                  </div>
                </div>
                <div className="flex gap-md">
                  <div className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "var(--error)" }}></div>
                  <div>
                    <p className="font-body-md text-body-md" style={{ color: "var(--on-surface)" }}>Failed sync task in European cluster.</p>
                    <span className="font-label-sm text-label-sm" style={{ color: "var(--on-surface-variant)" }}>3 hours ago</span>
                  </div>
                </div>
                <div className="flex gap-md">
                  <div className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "var(--primary-container)" }}></div>
                  <div>
                    <p className="font-body-md text-body-md" style={{ color: "var(--on-surface)" }}>Weekly executive report generated.</p>
                    <span className="font-label-sm text-label-sm" style={{ color: "var(--on-surface-variant)" }}>Yesterday</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Suggested Actions */}
            <div className="ai-gradient-card rounded-xl p-lg flex flex-col relative overflow-hidden group">
              <div className="flex items-center gap-sm mb-md relative z-10">
                <span className="material-symbols-outlined" style={{ color: "var(--tertiary)" }}>lightbulb</span>
                <h3 className="font-headline-md text-headline-md font-semibold" style={{ color: "var(--on-surface)" }}>Suggested Actions</h3>
              </div>
              <div className="space-y-sm flex-1 relative z-10">
                <button className="w-full text-left p-sm rounded-lg transition-all group/btn" style={{ backgroundColor: "var(--surface-container)", border: "1px solid var(--outline-variant)" }}>
                  <p className="font-body-md text-body-md transition-colors group-hover/btn:text-tertiary" style={{ color: "var(--on-surface)" }}>Review supply chain logistics</p>
                  <span className="font-label-sm text-label-sm" style={{ color: "var(--on-surface-variant)" }}>High Impact</span>
                </button>
                <button className="w-full text-left p-sm rounded-lg transition-all group/btn" style={{ backgroundColor: "var(--surface-container)", border: "1px solid var(--outline-variant)" }}>
                  <p className="font-body-md text-body-md transition-colors group-hover/btn:text-tertiary" style={{ color: "var(--on-surface)" }}>Adjust ad spend in SaaS sector</p>
                  <span className="font-label-sm text-label-sm" style={{ color: "var(--on-surface-variant)" }}>Medium Impact</span>
                </button>
                <button className="w-full text-left p-sm rounded-lg transition-all group/btn" style={{ backgroundColor: "var(--surface-container)", border: "1px solid var(--outline-variant)" }}>
                  <p className="font-body-md text-body-md transition-colors group-hover/btn:text-tertiary" style={{ color: "var(--on-surface)" }}>Run Q4 scenario analysis</p>
                  <span className="font-label-sm text-label-sm" style={{ color: "var(--on-surface-variant)" }}>Strategic</span>
                </button>
              </div>
            </div>
          </section>

          {/* Pagination */}
          {totalDashboards > pageSize && (
            <div className="flex items-center justify-between pt-4" style={{ borderTop: "1px solid var(--outline-variant)" }}>
              <p className="font-body-md text-body-md" style={{ color: "var(--on-surface-variant)" }}>
                Page {page} of {Math.ceil(totalDashboards / pageSize)}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium font-label-sm transition-colors disabled:opacity-40"
                  style={{ backgroundColor: "var(--surface-container)", color: "var(--on-surface)", border: "1px solid var(--outline-variant)" }}>
                  Previous
                </button>
                <button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(totalDashboards / pageSize)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium font-label-sm transition-colors disabled:opacity-40"
                  style={{ backgroundColor: "var(--surface-container)", color: "var(--on-surface)", border: "1px solid var(--outline-variant)" }}>
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <span className="material-symbols-outlined text-[48px]" style={{ color: "var(--on-surface-variant)" }}>dashboard_customize</span>
          <p className="font-headline-md mt-4 mb-2" style={{ color: "var(--on-surface)" }}>No dashboards yet</p>
          <p className="font-body-md mb-6" style={{ color: "var(--on-surface-variant)" }}>Create one from an existing dataset.</p>
          <Link href="/datasets" className="font-label-sm font-medium" style={{ color: "var(--primary)" }}>View Datasets →</Link>
        </div>
      )}
    </div>
  );
}
