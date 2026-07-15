"use client";
import { useEffect, useState } from "react";
import { RefreshCw, Users, Database, MessageSquare, Eye, Zap } from "lucide-react";
import { analyticsApi, getErrorMessage } from "@/lib/api";
import type { UsageStats } from "@/types";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { formatNumber } from "@/lib/utils";

function StatCard({ label, value, icon: Icon, color, trend }: { label: string; value: number | string; icon: React.ElementType; color: string; trend?: { dir: "up" | "down"; pct: string } }) {
  return (
    <div className="glass-card rounded-xl p-lg">
      <div className="flex justify-between items-start mb-3">
        <p className="font-label-md text-label-md uppercase" style={{ color: "var(--on-surface-variant)" }}>{label}</p>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + "15" }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <p className="text-headline-md font-bold" style={{ color: "var(--on-surface)" }}>{typeof value === "number" ? formatNumber(value) : value}</p>
        {trend && (
          <span className="font-label-md mb-1 flex items-center" style={{ color: trend.dir === "up" ? "var(--tertiary)" : "var(--error)" }}>
            <span className="material-symbols-outlined text-[14px]">{trend.dir === "up" ? "trending_up" : "trending_down"}</span>
            {trend.pct}
          </span>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [period, setPeriod] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await analyticsApi.getUsage(period);
        if (cancelled) return;
        setStats(res.data);
      } catch (e) { if (!cancelled) setError(getErrorMessage(e)); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [period]);

  return (
    <div className="space-y-lg">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-headline-lg font-bold tracking-tight" style={{ color: "var(--on-surface)" }}>Performance Analytics</h2>
          <p className="text-body-md mt-1" style={{ color: "var(--on-surface-variant)" }}>Real-time enterprise core growth metrics and behavioral data.</p>
        </div>
        <select value={period} onChange={(e) => setPeriod(Number(e.target.value))}
          className="px-3 py-2 rounded-lg text-sm"
          style={{ backgroundColor: "var(--surface-container-high)", border: "1px solid var(--outline-variant)", color: "var(--on-surface)" }}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {error && (
        <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: "var(--error-container)", color: "var(--on-error-container)" }}>
          {error}
          {error.includes("Admin") && <span className="block mt-1 text-xs opacity-80">Admin role required to view analytics.</span>}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-24"><RefreshCw className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} /></div>
      ) : stats ? (
        <>
          {/* Queries remaining banner */}
          <div className="p-lg rounded-xl flex items-center justify-between" style={{ backgroundColor: "var(--surface-container)" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--primary-container)" }}>
                <Zap className="w-5 h-5" style={{ color: "var(--on-primary-container)" }} />
              </div>
              <div>
                <p className="font-title-md" style={{ color: "var(--on-surface)" }}>AI Queries Remaining Today</p>
                <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>Resets at midnight UTC</p>
              </div>
            </div>
            <span className="text-headline-lg font-bold" style={{ color: "var(--primary)" }}>{formatNumber(stats.queries_remaining_today)}</span>
          </div>

          {/* KPI grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
            <StatCard label="AI Queries" value={stats.total_queries} icon={MessageSquare} color="var(--primary)" />
            <StatCard label="Datasets" value={stats.total_datasets} icon={Database} color="var(--secondary)" />
            <StatCard label="Dashboard Views" value={stats.total_dashboard_views} icon={Eye} color="var(--tertiary)" />
            <StatCard label="Active Users" value={stats.active_users} icon={Users} color="var(--on-surface)" />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
            <div className="glass-card rounded-xl p-lg">
              <h3 className="font-title-md mb-6" style={{ color: "var(--on-surface)" }}>AI Queries Over Time</h3>
              <RevenueChart
                title=""
                data={stats.queries_by_day.map((d) => ({ x: d.date, value: d.value }))}
                type="bar"
                color="var(--primary)"
              />
            </div>
            <div className="glass-card rounded-xl p-lg">
              <h3 className="font-title-md mb-6" style={{ color: "var(--on-surface)" }}>Plan Usage</h3>
              <div className="space-y-5">
                {[
                  { label: "AI Queries (30d)", used: stats.total_queries, limit: stats.plan === "free" ? 600 : 15000, color: "var(--primary)" },
                  { label: "Datasets", used: stats.total_datasets, limit: stats.plan === "free" ? 5 : 50, color: "var(--secondary)" },
                ].map(({ label, used, limit, color }) => {
                  const pct = Math.min(100, (used / limit) * 100);
                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span style={{ color: "var(--on-surface-variant)" }}>{label}</span>
                        <span style={{ color: "var(--on-surface)" }}><strong>{formatNumber(used)}</strong> / {formatNumber(limit)}</span>
                      </div>
                      <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-container-high)" }}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 pt-4" style={{ borderTop: "1px solid var(--outline-variant)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: "var(--on-surface-variant)" }}>Plan</span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium capitalize" style={{ backgroundColor: "var(--primary-container)", color: "var(--on-primary-container)" }}>
                    {stats.plan}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="text-center pt-4">
            <p className="font-mono-sm text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--on-surface-variant)" }}>
              Enterprise BI Engine v4.2.0 • Last Sync: {new Date().toLocaleTimeString()} UTC • Session Secure
            </p>
          </footer>
        </>
      ) : null}
    </div>
  );
}
