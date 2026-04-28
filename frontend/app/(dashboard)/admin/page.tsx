"use client";
import { useEffect, useState } from "react";
import { RefreshCw, Users, Database, MessageSquare, Eye, Zap } from "lucide-react";
import { analyticsApi, getErrorMessage } from "@/lib/api";
import type { UsageStats } from "@/types";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { formatNumber } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-slate-400 text-sm">{label}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{typeof value === "number" ? formatNumber(value) : value}</p>
    </div>
  );
}

export default function AdminPage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [period, setPeriod] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (days: number) => {
    setLoading(true);
    try {
      const res = await analyticsApi.getUsage(days);
      setStats(res.data);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(period); }, [period]);

  const planBadge: Record<string, string> = {
    free: "bg-slate-700 text-slate-300",
    pro: "bg-indigo-600/20 text-indigo-400 border border-indigo-600/30",
    enterprise: "bg-amber-600/20 text-amber-400 border border-amber-600/30",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-slate-400 text-sm mt-0.5">Platform usage for your organization</p>
        </div>
        <div className="flex items-center gap-2">
          {stats && (
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${planBadge[stats.plan] ?? planBadge.free}`}>
              {stats.plan} plan
            </span>
          )}
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
          {error.includes("Admin") && <span className="block mt-1 text-xs text-slate-500">Admin role required to view analytics.</span>}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" /></div>
      ) : stats ? (
        <>
          {/* AI queries remaining */}
          <div className="mb-5 p-4 bg-indigo-600/5 border border-indigo-600/20 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              <span className="text-slate-300 text-sm font-medium">AI Queries Remaining Today</span>
            </div>
            <span className="text-indigo-400 font-bold text-lg">{formatNumber(stats.queries_remaining_today)}</span>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="AI Queries" value={stats.total_queries} icon={MessageSquare} color="#6366f1" />
            <StatCard label="Datasets" value={stats.total_datasets} icon={Database} color="#8b5cf6" />
            <StatCard label="Dashboard Views" value={stats.total_dashboard_views} icon={Eye} color="#10b981" />
            <StatCard label="Active Users" value={stats.active_users} icon={Users} color="#f59e0b" />
          </div>

          {/* Queries over time */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RevenueChart
              title="AI Queries Over Time"
              data={stats.queries_by_day.map((d) => ({ x: d.date, value: d.value }))}
              type="bar"
              color="#6366f1"
            />
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-4">Plan Usage</h3>
              <div className="space-y-3">
                {[
                  { label: "AI Queries (30d)", used: stats.total_queries, limit: stats.plan === "free" ? 600 : 15000, color: "#6366f1" },
                  { label: "Datasets", used: stats.total_datasets, limit: stats.plan === "free" ? 5 : 50, color: "#8b5cf6" },
                ].map(({ label, used, limit, color }) => {
                  const pct = Math.min(100, (used / limit) * 100);
                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-400">{label}</span>
                        <span className="text-slate-300">{formatNumber(used)} / {formatNumber(limit)}</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
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
