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
    <div className="space-y-xl">
      {/* Welcome Header */}
      <section>
        <h2 className="font-display-lg text-headline-lg-mobile md:text-display-lg font-bold text-on-surface tracking-tight mb-sm">
          Good morning, <span className="text-primary">there.</span>
        </h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant flex items-center gap-sm">
          Revenue is up <span className="text-[#34d399] font-mono-sm text-mono-sm bg-[rgba(52,211,153,0.1)] px-2 py-0.5 rounded border border-[rgba(52,211,153,0.2)]">18%</span> this month.
        </p>
      </section>

      {/* AI Summary Card */}
      <section className="ai-gradient-card rounded-xl p-lg ai-shimmer relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-tertiary-container/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-sm mb-md">
            <span className="material-symbols-outlined text-tertiary">auto_awesome</span>
            <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">Critical Insights</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div className="glass-card rounded-lg p-md flex items-start gap-md" style={{ border: "1px solid rgba(255,180,171,0.2)" }}>
              <div className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "var(--error)", boxShadow: "0 0 8px rgba(255,180,171,0.5)" }}></div>
              <div>
                <p className="font-body-md text-body-md text-on-surface">Inventory risk detected in UK region.</p>
                <span className="font-mono-sm text-mono-sm block mt-xs" style={{ color: "var(--error)" }}>Action required within 48h</span>
              </div>
            </div>
            <div className="glass-card rounded-lg p-md flex items-start gap-md" style={{ border: "1px solid rgba(52,211,153,0.2)" }}>
              <div className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "#34d399", boxShadow: "0 0 8px rgba(52,211,153,0.5)" }}></div>
              <div>
                <p className="font-body-md text-body-md text-on-surface">Customer churn improving in SaaS segment.</p>
                <span className="font-mono-sm text-mono-sm block mt-xs" style={{ color: "#34d399" }}>Predictive retention up 4.2%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metric Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-md">
        <div className="glass-card rounded-xl p-md flex flex-col justify-between hover:border-outline-variant transition-colors group">
          <div>
            <p className="font-label-sm text-label-sm text-on-surface-variant mb-xs">Revenue</p>
            <div className="flex items-end gap-sm">
              <h4 className="font-headline-md text-headline-md text-on-surface">$2.4M</h4>
              <span className="font-mono-sm text-mono-sm text-[#34d399] pb-1 flex items-center"><span className="material-symbols-outlined text-[14px]">arrow_upward</span>12%</span>
            </div>
          </div>
          <div className="mt-md text-primary opacity-60 group-hover:opacity-100 transition-opacity">
            <svg className="w-full h-[40px]" viewBox="0 0 100 40"><path d="M0,30 L20,25 L40,35 L60,15 L80,20 L100,5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </div>
        <div className="glass-card rounded-xl p-md flex flex-col justify-between hover:border-outline-variant transition-colors group">
          <div>
            <p className="font-label-sm text-label-sm text-on-surface-variant mb-xs">MRR</p>
            <div className="flex items-end gap-sm">
              <h4 className="font-headline-md text-headline-md text-on-surface">$850K</h4>
              <span className="font-mono-sm text-mono-sm text-[#34d399] pb-1 flex items-center"><span className="material-symbols-outlined text-[14px]">arrow_upward</span>5%</span>
            </div>
          </div>
          <div className="mt-md text-secondary opacity-60 group-hover:opacity-100 transition-opacity">
            <svg className="w-full h-[40px]" viewBox="0 0 100 40"><path d="M0,35 L20,30 L40,20 L60,25 L80,10 L100,15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </div>
        <div className="glass-card rounded-xl p-md flex flex-col justify-between hover:border-outline-variant transition-colors group">
          <div>
            <p className="font-label-sm text-label-sm text-on-surface-variant mb-xs">ARR</p>
            <div className="flex items-end gap-sm">
              <h4 className="font-headline-md text-headline-md text-on-surface">$10.2M</h4>
              <span className="font-mono-sm text-mono-sm pb-1 flex items-center" style={{ color: "var(--on-surface-variant)" }}>Stable</span>
            </div>
          </div>
          <div className="mt-md opacity-60 group-hover:opacity-100 transition-opacity" style={{ color: "var(--outline)" }}>
            <svg className="w-full h-[40px]" viewBox="0 0 100 40"><path d="M0,20 L20,22 L40,18 L60,20 L80,19 L100,20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </div>
        <div className="glass-card rounded-xl p-md flex flex-col justify-between hover:border-outline-variant transition-colors group">
          <div>
            <p className="font-label-sm text-label-sm text-on-surface-variant mb-xs">Conversion Rate</p>
            <div className="flex items-end gap-sm">
              <h4 className="font-headline-md text-headline-md text-on-surface">4.8%</h4>
              <span className="font-mono-sm text-mono-sm pb-1 flex items-center" style={{ color: "var(--error)" }}><span className="material-symbols-outlined text-[14px]">arrow_downward</span>1.2%</span>
            </div>
          </div>
          <div className="mt-md opacity-60 group-hover:opacity-100 transition-opacity" style={{ color: "var(--error)" }}>
            <svg className="w-full h-[40px]" viewBox="0 0 100 40"><path d="M0,10 L20,15 L40,5 L60,25 L80,20 L100,35" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </div>
        <div className="glass-card rounded-xl p-md flex flex-col justify-between hover:border-outline-variant transition-colors group col-span-2 lg:col-span-1">
          <div>
            <p className="font-label-sm text-label-sm text-on-surface-variant mb-xs">Customer Growth</p>
            <div className="flex items-end gap-sm">
              <h4 className="font-headline-md text-headline-md text-on-surface">+1,204</h4>
              <span className="font-mono-sm text-mono-sm text-[#34d399] pb-1 flex items-center"><span className="material-symbols-outlined text-[14px]">arrow_upward</span>24%</span>
            </div>
          </div>
          <div className="mt-md opacity-60 group-hover:opacity-100 transition-opacity" style={{ color: "var(--tertiary)" }}>
            <svg className="w-full h-[40px]" viewBox="0 0 100 40"><path d="M0,35 L20,38 L40,25 L60,15 L80,20 L100,5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </div>
      </section>

      {error && (
        <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: "var(--error-container)", color: "var(--on-error-container)" }}>{error}</div>
      )}

      {/* Dashboard tabs + actions */}
      {dashboards.length > 0 && currentDashboard && (
        <div className="glass-card rounded-xl p-md">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-2 flex-wrap">
              {dashboards.map((d) => (
                <button key={d.id} onClick={() => switchDashboard(d.id)}
                  className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={activeDashboard === d.id ? { backgroundColor: "var(--secondary-container)", color: "var(--on-secondary-container)" } : { backgroundColor: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}>
                  {d.name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Link href={"/dashboard/edit/" + currentDashboard.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}>
                <Pencil className="w-3 h-3" /> Edit
              </Link>
              <button onClick={() => handleExportPdf(currentDashboard)} disabled={exportingPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50" style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}>
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
          {/* Main Chart Area */}
          <section className="glass-card rounded-xl p-lg border-t border-primary/20">
            <div className="flex justify-between items-center mb-lg">
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">Revenue vs. Forecast</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">Q3 Fiscal Year Projection</p>
              </div>
              <div className="flex gap-sm">
                <button className="px-3 py-1 rounded bg-surface-container text-on-surface font-label-sm text-label-sm border border-outline-variant">1M</button>
                <button className="px-3 py-1 rounded bg-primary/20 text-primary font-label-sm text-label-sm border border-primary/30">3M</button>
                <button className="px-3 py-1 rounded bg-surface-container text-on-surface font-label-sm text-label-sm border border-outline-variant">YTD</button>
              </div>
            </div>
            {currentDashboard.widgets.filter((w) => w.type === "line_chart" || w.type === "bar_chart").map((widget) => {
              const data = dashboardData[widget.id] as { x: string; value: number }[] | undefined;
              return <RevenueChart key={widget.id} title={widget.title} data={data ?? []} type={widget.type === "bar_chart" ? "bar" : "line"} color={widget.color} />;
            })}
          </section>

          {/* Forecast */}
          {currentDashboard.widgets.filter((w) => w.type === "forecast").map((widget) => {
            const data = dashboardData[widget.id] as { data: { x: string; value: number; type: "actual" | "forecast" }[]; r2: number; periods: number } | undefined;
            return <ForecastChart key={widget.id} title={widget.title} data={data ?? { data: [], r2: 0, periods: 0 }} />;
          })}

          {/* Secondary Grid */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
            <div className="glass-card rounded-xl p-lg flex flex-col">
              <h3 className="font-headline-md text-headline-md text-on-surface font-semibold mb-md">Sales Funnel</h3>
              <div className="flex-1 flex flex-col justify-center gap-md">
                <div className="relative w-full h-8 rounded-sm overflow-hidden" style={{ backgroundColor: "var(--surface-container)" }}>
                  <div className="absolute top-0 left-0 h-full" style={{ width: "100%", backgroundColor: "var(--primary)" }}></div>
                  <span className="absolute left-sm top-1/2 -translate-y-1/2 font-mono-sm text-mono-sm z-10 font-bold mix-blend-luminosity" style={{ color: "var(--on-primary-container)" }}>Leads: 12,400</span>
                </div>
                <div className="relative w-[80%] mx-auto h-8 rounded-sm overflow-hidden" style={{ backgroundColor: "var(--surface-container)" }}>
                  <div className="absolute top-0 left-0 h-full" style={{ width: "100%", backgroundColor: "var(--secondary)" }}></div>
                  <span className="absolute left-sm top-1/2 -translate-y-1/2 font-mono-sm text-mono-sm z-10 font-bold mix-blend-luminosity" style={{ color: "var(--on-secondary-container)" }}>Qualified: 8,200</span>
                </div>
                <div className="relative w-[60%] mx-auto h-8 rounded-sm overflow-hidden" style={{ backgroundColor: "var(--surface-container)" }}>
                  <div className="absolute top-0 left-0 h-full" style={{ width: "100%", backgroundColor: "var(--tertiary)" }}></div>
                  <span className="absolute left-sm top-1/2 -translate-y-1/2 font-mono-sm text-mono-sm z-10 font-bold mix-blend-luminosity" style={{ color: "var(--on-tertiary-container)" }}>Proposals: 4,100</span>
                </div>
                <div className="relative w-[30%] mx-auto h-8 rounded-sm overflow-hidden" style={{ backgroundColor: "var(--surface-container)" }}>
                  <div className="absolute top-0 left-0 h-full" style={{ width: "100%", backgroundColor: "#10b981" }}></div>
                  <span className="absolute left-sm top-1/2 -translate-y-1/2 font-mono-sm text-mono-sm z-10 font-bold mix-blend-luminosity" style={{ color: "#022c22" }}>Closed: 1,200</span>
                </div>
              </div>
            </div>
            <div className="glass-card rounded-xl p-lg lg:col-span-1 flex flex-col">
              <h3 className="font-headline-md text-headline-md text-on-surface font-semibold mb-md">Recent Activity</h3>
              <div className="space-y-md flex-1 overflow-y-auto pr-2">
                <div className="flex gap-md">
                  <div className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "var(--primary)" }}></div>
                  <div>
                    <p className="font-body-md text-body-md text-on-surface">Data model &apos;Q3_Forecast&apos; updated by System.</p>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">10 mins ago</span>
                  </div>
                </div>
                <div className="flex gap-md">
                  <div className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "var(--tertiary)" }}></div>
                  <div>
                    <p className="font-body-md text-body-md text-on-surface">New API integration established (Stripe).</p>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">1 hour ago</span>
                  </div>
                </div>
                <div className="flex gap-md">
                  <div className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "var(--error)" }}></div>
                  <div>
                    <p className="font-body-md text-body-md text-on-surface">Failed sync task in European cluster.</p>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">3 hours ago</span>
                  </div>
                </div>
                <div className="flex gap-md">
                  <div className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "var(--secondary)" }}></div>
                  <div>
                    <p className="font-body-md text-body-md text-on-surface">Weekly executive report generated.</p>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Yesterday</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="ai-gradient-card rounded-xl p-lg flex flex-col relative overflow-hidden group">
              <div className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity" style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDIiLz4KPC9zdmc+')" }}></div>
              <div className="flex items-center gap-sm mb-md relative z-10">
                <span className="material-symbols-outlined text-tertiary">lightbulb</span>
                <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">Suggested Actions</h3>
              </div>
              <div className="space-y-sm flex-1 relative z-10">
                <button className="w-full text-left p-sm rounded-lg bg-surface-container/50 border border-outline-variant/50 hover:bg-surface-container hover:border-tertiary/50 transition-all group/btn">
                  <p className="font-body-md text-body-md text-on-surface group-hover/btn:text-tertiary transition-colors">Review UK supply chain logistics</p>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">High Impact</span>
                </button>
                <button className="w-full text-left p-sm rounded-lg bg-surface-container/50 border border-outline-variant/50 hover:bg-surface-container hover:border-tertiary/50 transition-all group/btn">
                  <p className="font-body-md text-body-md text-on-surface group-hover/btn:text-tertiary transition-colors">Adjust ad spend in SaaS sector</p>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Medium Impact</span>
                </button>
                <button className="w-full text-left p-sm rounded-lg bg-surface-container/50 border border-outline-variant/50 hover:bg-surface-container hover:border-tertiary/50 transition-all group/btn">
                  <p className="font-body-md text-body-md text-on-surface group-hover/btn:text-tertiary transition-colors">Run Q4 scenario analysis</p>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Strategic</span>
                </button>
              </div>
            </div>
          </section>

          {/* Pagination */}
          {totalDashboards > pageSize && (
            <div className="flex items-center justify-between pt-4" style={{ borderTop: "1px solid var(--outline-variant)" }}>
              <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>Page {page} of {Math.ceil(totalDashboards / pageSize)}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40" style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface)" }}>Previous</button>
                <button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(totalDashboards / pageSize)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40" style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface)" }}>Next</button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <span className="material-symbols-outlined text-[48px]" style={{ color: "var(--on-surface-variant)" }}>dashboard_customize</span>
          <p className="font-headline-md mt-4 mb-2" style={{ color: "var(--on-surface)" }}>No dashboards yet</p>
          <p className="font-body-md mb-6" style={{ color: "var(--on-surface-variant)" }}>Create one from an existing dataset.</p>
          <Link href="/datasets" className="font-body-md font-medium" style={{ color: "var(--primary)" }}>View Datasets →</Link>
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
