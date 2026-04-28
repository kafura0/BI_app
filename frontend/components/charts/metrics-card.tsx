"use client";
import { TrendingUp } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface MetricsCardProps {
  title: string;
  value: number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  color?: string;
}

export function MetricsCard({ title, value, change, trend, color = "#6366f1" }: MetricsCardProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <p className="text-slate-400 text-sm font-medium">{title}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
          <TrendingUp className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{formatNumber(Math.round(value))}</p>
      {change && (
        <p className={`text-xs mt-1 font-medium ${trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-slate-500"}`}>
          {change}
        </p>
      )}
    </div>
  );
}
