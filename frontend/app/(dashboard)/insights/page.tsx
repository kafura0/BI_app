"use client";
import { useEffect, useState, useRef } from "react";
import { Send, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { insightsApi, datasetsApi, getErrorMessage } from "@/lib/api";
import type { Insight, Dataset, KeyMetric } from "@/types";
import { formatDate } from "@/lib/utils";

function TrendIcon({ trend }: { trend: KeyMetric["trend"] }) {
  if (trend === "up") return <TrendingUp className="w-3.5 h-3.5" style={{ color: "var(--tertiary)" }} />;
  if (trend === "down") return <TrendingDown className="w-3.5 h-3.5" style={{ color: "var(--error)" }} />;
  return <Minus className="w-3.5 h-3.5" style={{ color: "var(--on-surface-variant)" }} />;
}

function InsightCard({ insight }: { insight: Insight }) {
  const res = insight.response;
  return (
    <div className="glass-card rounded-xl p-lg">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--primary-container)" }}>
          <span className="material-symbols-outlined text-[18px]" style={{ color: "var(--on-primary-container)" }}>auto_awesome</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium" style={{ color: "var(--on-surface-variant)" }}>{formatDate(insight.created_at)}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}>
              {insight.model_used}
            </span>
          </div>
          <p className="text-sm italic mt-1" style={{ color: "var(--on-surface-variant)" }}>&ldquo;{insight.query}&rdquo;</p>
        </div>
      </div>
      <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--on-surface)" }}>{res.explanation}</p>
      {res.key_metrics?.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {res.key_metrics.map((metric, i) => (
            <div key={i} className="p-3 rounded-lg" style={{ backgroundColor: "var(--surface-container-high)" }}>
              <div className="flex items-center gap-1.5 mb-1">
                <TrendIcon trend={metric.trend} />
                <span className="text-xs" style={{ color: "var(--on-surface-variant)" }}>{metric.label}</span>
              </div>
              <p className="font-semibold text-sm" style={{ color: "var(--on-surface)" }}>{String(metric.value)}</p>
              {metric.change && <p className={`text-xs mt-0.5 ${metric.trend === "up" ? "text-tertiary" : metric.trend === "down" ? "text-error" : ""}`}>{metric.change}</p>}
            </div>
          ))}
        </div>
      )}
      {res.suggested_actions?.length > 0 && (
        <div className="pt-3" style={{ borderTop: "1px solid var(--outline-variant)" }}>
          <p className="text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: "var(--on-surface-variant)" }}>Suggested Actions</p>
          <ul className="space-y-1.5">
            {res.suggested_actions.map((action, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--on-surface-variant)" }}>
                <span className="text-xs mt-0.5" style={{ color: "var(--primary)" }}>→</span>
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [querying, setQuerying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadData = async () => {
    setLoading(true); setError(null);
    try {
      const [insRes, dsRes] = await Promise.all([insightsApi.list(1), datasetsApi.list()]);
      setInsights(insRes.data.items);
      setDatasets(dsRes.data.items.filter((d) => d.status === "ready"));
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async () => {
    const q = query.trim();
    if (!q || querying) return;
    setQuerying(true); setError(null);
    try {
      const res = await insightsApi.create(q, selectedDataset || undefined);
      setInsights((prev) => [res.data, ...prev]);
      setQuery("");
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setQuerying(false); }
  };

  const exampleQuestions = [
    "Why did sales drop last month?",
    "Which products are underperforming?",
    "What is the revenue trend over time?",
    "Which customer segment has the highest value?",
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-lg">
      {/* Header */}
      <div>
        <h2 className="text-headline-lg font-bold tracking-tight" style={{ color: "var(--on-surface)" }}>AI Copilot</h2>
        <p className="text-body-md mt-1" style={{ color: "var(--on-surface-variant)" }}>Ask questions about your data in plain English</p>
      </div>

      {/* Query input */}
      <div className="glass-card rounded-xl p-lg">
        {datasets.length > 0 && (
          <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: "1px solid var(--outline-variant)" }}>
            <span className="material-symbols-outlined text-[18px]" style={{ color: "var(--on-surface-variant)" }}>database</span>
            <select value={selectedDataset} onChange={(e) => setSelectedDataset(e.target.value)}
              className="flex-1 rounded-lg px-3 py-1.5 text-sm"
              style={{ backgroundColor: "var(--surface-container-high)", border: "none", color: "var(--on-surface)" }}>
              <option value="">All datasets (general query)</option>
              {datasets.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        )}
        <textarea ref={textareaRef} value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(); }}
          placeholder="Ask a business question..." rows={3}
          className="w-full bg-transparent resize-none focus:outline-none text-sm"
          style={{ color: "var(--on-surface)" }} />
        <div className="flex items-center justify-between mt-3">
          <div className="flex flex-wrap gap-2">
            {insights.length === 0 && exampleQuestions.map((q) => (
              <button key={q} onClick={() => setQuery(q)} className="text-xs px-2.5 py-1 rounded-full transition-colors hover:opacity-80"
                style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}>
                {q}
              </button>
            ))}
          </div>
          <button onClick={handleSubmit} disabled={!query.trim() || querying}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg font-medium text-sm transition-all active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: "var(--primary)", color: "var(--on-primary)" }}>
            {querying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Analyze
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: "var(--error-container)", color: "var(--on-error-container)" }}>{error}</div>
      )}

      {/* Insights list */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} /></div>
      ) : insights.length === 0 ? (
        <div className="text-center py-16">
          <span className="material-symbols-outlined text-[48px]" style={{ color: "var(--on-surface-variant)" }}>auto_awesome</span>
          <p className="font-title-md mt-4" style={{ color: "var(--on-surface)" }}>Ask your first question above</p>
          <p className="text-sm mt-1" style={{ color: "var(--on-surface-variant)" }}>The AI will analyze your data and provide actionable insights.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {insights.map((insight) => <InsightCard key={insight.id} insight={insight} />)}
        </div>
      )}
    </div>
  );
}
