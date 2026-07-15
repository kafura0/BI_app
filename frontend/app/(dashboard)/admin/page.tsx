"use client";
import { useEffect, useState } from "react";
import { RefreshCw, Users, Database, MessageSquare, Eye, Zap } from "lucide-react";
import { analyticsApi, getErrorMessage } from "@/lib/api";
import type { UsageStats } from "@/types";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { formatNumber } from "@/lib/utils";

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ElementType; color: string }) {
  return (
    <div className="glass-card rounded-xl p-lg">
      <p className="font-label-md text-label-md uppercase mb-3" style={{ color: "var(--on-surface-variant)" }}>{label}</p>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color }} />
        <p className="text-headline-md font-bold" style={{ color: "var(--on-surface)" }}>{typeof value === "number" ? formatNumber(value) : value}</p>
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
      } catch (e) {
        if (!cancelled) setError(getErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [period]);

  return (
    <div className="space-y-lg">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline-lg text-headline-lg" style={{ color: "var(--on-surface)" }}>Performance Analytics</h2>
          <p className="font-body-lg text-body-lg" style={{ color: "var(--on-surface-variant)" }}>Platform usage for your organization</p>
        </div>
        <div className="flex items-center gap-2">
          {stats && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium capitalize" style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}>
              {stats.plan} plan
            </span>
          )}
          <select value={period} onChange={(e) => setPeriod(Number(e.target.value))}
            className="px-3 py-1.5 rounded-lg text-sm"
            style={{ backgroundColor: "var(--surface-container-high)", border: "1px solid var(--outline-variant)", color: "var(--on-surface)" }}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: "var(--error-container)", color: "var(--on-error-container)" }}>
          {error}
          {error.includes("Admin") && <span className="block mt-1 text-xs opacity-80">Admin role required to view analytics.</span>}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} /></div>
      ) : stats ? (
        <>
          <div className="p-md rounded-xl flex items-center justify-between" style={{ backgroundColor: "var(--primary-container)" }}>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" style={{ color: "var(--on-primary-container)" }} />
              <span className="text-sm font-medium" style={{ color: "var(--on-primary-container)" }}>AI Queries Remaining Today</span>
            </div>
            <span className="font-bold text-lg" style={{ color: "var(--on-primary-container)" }}>{formatNumber(stats.queries_remaining_today)}</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-gutter">
            <StatCard label="AI Queries" value={stats.total_queries} icon={MessageSquare} color="var(--primary)" />
            <StatCard label="Datasets" value={stats.total_datasets} icon={Database} color="var(--secondary)" />
            <StatCard label="Dashboard Views" value={stats.total_dashboard_views} icon={Eye} color="var(--tertiary)" />
            <StatCard label="Active Users" value={stats.active_users} icon={Users} color="var(--on-surface)" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
            <div className="glass-card rounded-xl p-lg">
              <RevenueChart
                title="AI Queries Over Time"
                data={stats.queries_by_day.map((d) => ({ x: d.date, value: d.value }))}
                type="bar"
                color="var(--primary)"
              />
            </div>
            <div className="glass-card rounded-xl p-lg">
              <h3 className="font-title-md mb-4" style={{ color: "var(--on-surface)" }}>Plan Usage</h3>
              <div className="space-y-3">
                {[
                  { label: "AI Queries (30d)", used: stats.total_queries, limit: stats.plan === "free" ? 600 : 15000, color: "var(--primary)" },
                  { label: "Datasets", used: stats.total_datasets, limit: stats.plan === "free" ? 5 : 50, color: "var(--secondary)" },
                ].map(({ label, used, limit, color }) => {
                  const pct = Math.min(100, (used / limit) * 100);
                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span style={{ color: "var(--on-surface-variant)" }}>{label}</span>
                        <span style={{ color: "var(--on-surface)" }}>{formatNumber(used)} / {formatNumber(limit)}</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-container-high)" }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
