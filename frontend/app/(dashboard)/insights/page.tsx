"use client";
import { useEffect, useState, useRef } from "react";
import { Send, Loader2, Sparkles, TrendingUp, TrendingDown, Minus, Database, Search, X } from "lucide-react";
import { insightsApi, datasetsApi, getErrorMessage } from "@/lib/api";
import type { Insight, Dataset, KeyMetric } from "@/types";
import { formatDate, getTrendColor } from "@/lib/utils";

function TrendIcon({ trend }: { trend: KeyMetric["trend"] }) {
  if (trend === "up") return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (trend === "down") return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-slate-500" />;
}

function InsightCard({ insight }: { insight: Insight }) {
  const res = insight.response;
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-7 h-7 bg-indigo-600/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
        </div>
        <div>
          <p className="text-slate-400 text-xs mb-1">{formatDate(insight.created_at)} · {insight.model_used} · {insight.tokens_used} tokens</p>
          <p className="text-slate-300 text-sm italic">&ldquo;{insight.query}&rdquo;</p>
        </div>
      </div>

      <p className="text-white text-sm leading-relaxed mb-4">{res.explanation}</p>

      {res.key_metrics?.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {res.key_metrics.map((metric, i) => (
            <div key={i} className="bg-slate-800/50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendIcon trend={metric.trend} />
                <span className="text-slate-400 text-xs">{metric.label}</span>
              </div>
              <p className="text-white font-semibold text-sm">{String(metric.value)}</p>
              {metric.change && <p className={`text-xs mt-0.5 ${getTrendColor(metric.trend)}`}>{metric.change}</p>}
            </div>
          ))}
        </div>
      )}

      {res.suggested_actions?.length > 0 && (
        <div>
          <p className="text-slate-500 text-xs font-medium mb-2 uppercase tracking-wide">Suggested Actions</p>
          <ul className="space-y-1">
            {res.suggested_actions.map((action, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-indigo-400 mt-0.5 shrink-0">•</span>
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
  const [search, setSearch] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadData = async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const [insRes, dsRes] = await Promise.all([insightsApi.list(1, q || undefined), datasetsApi.list()]);
      setInsights(insRes.data.items);
      setDatasets(dsRes.data.items.filter((d) => d.status === "ready"));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData("");
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSubmit = async () => {
    const q = query.trim();
    if (!q || querying) return;
    setQuerying(true);
    setError(null);
    try {
      const res = await insightsApi.create(q, selectedDataset || undefined);
      setInsights((prev) => [res.data, ...prev]);
      setQuery("");
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setQuerying(false);
    }
  };

  const exampleQuestions = [
    "Why did sales drop last month?",
    "Which products are underperforming?",
    "What is the revenue trend over time?",
    "Which customer segment has the highest value?",
  ];

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">AI Insights</h1>
        <p className="text-slate-400 text-sm mt-0.5">Ask questions about your data in plain English</p>
      </div>

      {/* Query input */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-4">
        {datasets.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-4 h-4 text-slate-500" />
            <select
              value={selectedDataset}
              onChange={(e) => setSelectedDataset(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">No dataset (general query)</option>
              {datasets.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(); }}
          placeholder="Ask a business question... (⌘/Ctrl+Enter to submit)"
          rows={3}
          className="w-full bg-transparent text-white placeholder-slate-500 resize-none focus:outline-none text-sm"
        />

        <div className="flex items-center justify-between mt-3">
          <div className="flex flex-wrap gap-2">
            {insights.length === 0 && exampleQuestions.map((q) => (
              <button key={q} onClick={() => setQuery(q)} className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-colors">
                {q}
              </button>
            ))}
          </div>
          <button
            onClick={handleSubmit}
            disabled={!query.trim() || querying}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {querying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Analyze
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search insights..."
          className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>
      ) : insights.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Sparkles className="w-10 h-10 mx-auto mb-3 text-slate-700" />
          <p className="font-medium text-slate-400">Ask your first question above</p>
          <p className="text-sm mt-1">AI will analyze your data and provide actionable insights</p>
        </div>
      ) : (
        <div className="space-y-4">
          {insights.map((insight) => <InsightCard key={insight.id} insight={insight} />)}
        </div>
      )}
    </div>
  );
}
