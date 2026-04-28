"use client";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

interface ForecastDataPoint {
  x: string;
  value: number;
  type: "actual" | "forecast";
}

export function ForecastChart({ title, data }: { title: string; data: ForecastDataPoint[] }) {
  const actual = data.filter((d) => d.type === "actual").map((d) => ({ x: d.x, actual: d.value }));
  const forecast = data.filter((d) => d.type === "forecast").map((d) => ({ x: d.x, forecast: d.value }));
  const combined = [...actual, ...forecast];
  const splitDate = actual[actual.length - 1]?.x;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">{title}</h3>
        <span className="text-xs px-2 py-1 bg-emerald-600/20 text-emerald-400 rounded-full border border-emerald-600/20 font-medium">
          AI Forecast
        </span>
      </div>
      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-slate-500 text-sm">Insufficient data for forecasting</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={combined}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="x" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px", color: "#f1f5f9" }}
              labelStyle={{ color: "#94a3b8" }}
            />
            <Legend wrapperStyle={{ color: "#64748b", fontSize: "12px" }} />
            {splitDate && <ReferenceLine x={splitDate} stroke="#475569" strokeDasharray="3 3" label={{ value: "Today", fill: "#64748b", fontSize: 10 }} />}
            <Line type="monotone" dataKey="actual" stroke="#6366f1" strokeWidth={2} dot={false} name="Actual" />
            <Area type="monotone" dataKey="forecast" stroke="#10b981" fill="#10b98120" strokeWidth={2} strokeDasharray="5 5" name="Forecast" />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
