"use client";
import { useEffect, useState, useRef } from "react";
import { Send, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { insightsApi, datasetsApi, getErrorMessage } from "@/lib/api";
import type { Insight, Dataset, KeyMetric } from "@/types";
import { formatDate } from "@/lib/utils";

function TrendIcon({ trend }: { trend: KeyMetric["trend"] }) {
  if (trend === "up") return <TrendingUp className="w-3.5 h-3.5 text-tertiary" />;
  if (trend === "down") return <TrendingDown className="w-3.5 h-3.5 text-error" />;
  return <Minus className="w-3.5 h-3.5 text-on-surface-variant" />;
}

function InsightCard({ insight, index }: { insight: Insight; index: number }) {
  const res = insight.response;
  const isFirst = index === 0;
  const hasActions = res.suggested_actions?.length > 0;

  return (
    <article
      className={`relative bg-surface-container-lowest border border-surface-variant rounded-xl p-lg overflow-hidden flex flex-col group hover:border-primary/30 transition-colors ai-glow ${
        isFirst
          ? "col-span-1 md:col-span-2"
          : "col-span-1"
      }`}
    >
      <div className="flex justify-between items-start mb-md relative z-10">
        <div className="flex items-center gap-sm">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
          </div>
          <h2 className="font-headline-md text-[18px] text-on-surface font-semibold">Insight</h2>
        </div>
        <div className="flex items-center gap-xs bg-tertiary/10 text-tertiary px-sm py-[2px] rounded-full border border-tertiary/20">
          <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
          <span className="font-mono-sm text-mono-sm font-medium">{insight.model_used}</span>
        </div>
      </div>

      <p className="font-label-sm text-label-sm text-on-surface-variant mb-sm relative z-10">{formatDate(insight.created_at)}</p>
      <p className="font-body-md text-body-md text-on-surface-variant mb-md relative z-10 italic leading-relaxed">
        &ldquo;{insight.query}&rdquo;
      </p>
      <p className="font-body-lg text-body-lg text-on-surface-variant mb-xl relative z-10 leading-relaxed">
        {res.explanation}
      </p>

      {res.key_metrics?.length > 0 && (
        <div className={`grid ${isFirst ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2"} gap-2 mb-xl relative z-10`}>
          {res.key_metrics.map((metric, i) => (
            <div key={i} className="p-3 rounded-lg bg-surface-container-high border border-surface-variant">
              <div className="flex items-center gap-xs mb-xs">
                <TrendIcon trend={metric.trend} />
                <span className="font-label-sm text-label-sm text-on-surface-variant">{metric.label}</span>
              </div>
              <p className="font-semibold text-sm text-on-surface">{String(metric.value)}</p>
              {metric.change && (
                <p className={`font-mono-sm text-mono-sm mt-xs ${metric.trend === "up" ? "text-tertiary" : metric.trend === "down" ? "text-error" : "text-on-surface-variant"}`}>
                  {metric.change}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {isFirst && (
        <div className="mt-auto relative z-10 pt-lg border-t border-surface-variant flex flex-col sm:flex-row justify-between items-center gap-md">
          <div className="h-12 w-full sm:w-1/2 rounded bg-surface-container flex items-end gap-[2px] p-1 opacity-70">
            <div className="w-full bg-on-surface-variant/30 h-[80%] rounded-t-sm" />
            <div className="w-full bg-on-surface-variant/30 h-[90%] rounded-t-sm" />
            <div className="w-full bg-on-surface-variant/30 h-[70%] rounded-t-sm" />
            <div className="w-full bg-error/50 h-[30%] rounded-t-sm" />
            <div className="w-full bg-error/80 h-[20%] rounded-t-sm" />
          </div>
          <button className="w-full sm:w-auto px-lg py-sm rounded-lg bg-gradient-to-r from-primary to-tertiary-container text-on-primary font-label-sm text-label-sm font-medium hover:opacity-90 transition-opacity shadow-[0_0_15px_rgba(99,102,241,0.2)] whitespace-nowrap flex justify-center items-center gap-2">
            Investigate
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      )}

      {hasActions && (
        <div className="relative z-10 pt-lg border-t border-surface-variant">
          <p className="font-label-sm text-label-sm text-on-surface-variant mb-sm uppercase tracking-wide font-medium">Suggested Actions</p>
          <ul className="space-y-xs">
            {res.suggested_actions.map((action, i) => (
              <li key={i} className="flex items-start gap-xs font-body-md text-body-md text-on-surface-variant">
                <span className="text-xs mt-0.5 text-primary">→</span>
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
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
    <div className="flex-1 p-margin-mobile md:p-margin-desktop max-w-[1600px] w-full mx-auto pb-2xl">
      {/* Page Header & NLP Search */}
      <div className="mb-xl">
        <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface mb-lg tracking-tight">
          AI Business Insights
        </h1>
        <div className="relative max-w-3xl">
          <div className="absolute inset-y-0 left-0 pl-md flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-primary/70">auto_awesome</span>
          </div>
          <input
            ref={textareaRef as any}
            className="w-full bg-surface-container-low border border-surface-variant rounded-xl py-md pl-[48px] pr-[120px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-body-lg text-body-lg shadow-sm"
            placeholder="e.g., 'Why did revenue dip on Tuesday?'"
            style={{ boxShadow: "0 4px 20px rgba(99, 102, 241, 0.05)" }}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(); }}
          />
          <button
            onClick={handleSubmit}
            disabled={!query.trim() || querying}
            className="absolute inset-y-0 right-sm my-sm px-md bg-primary text-on-primary rounded-lg font-label-sm text-label-sm hover:bg-primary-fixed transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {querying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Query
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-xl gap-md">
        <div className="flex gap-sm">
          <button className="flex items-center gap-xs px-md py-xs rounded-full border border-surface-variant bg-surface-container-low text-on-surface font-label-sm text-label-sm hover:border-primary/50 transition-colors">
            <span className="material-symbols-outlined text-[16px]">calendar_today</span>
            Last 30 Days
            <span className="material-symbols-outlined text-[16px]">arrow_drop_down</span>
          </button>
          <button className="flex items-center gap-xs px-md py-xs rounded-full border border-surface-variant bg-surface-container-low text-on-surface font-label-sm text-label-sm hover:border-primary/50 transition-colors">
            <span className="material-symbols-outlined text-[16px]">database</span>
            All Sources
            <span className="material-symbols-outlined text-[16px]">arrow_drop_down</span>
          </button>
        </div>
        <div className="text-on-surface-variant font-mono-sm text-mono-sm flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Models Synced: 2m ago
        </div>
      </div>

      {/* Dataset selector */}
      {datasets.length > 0 && (
        <div className="flex items-center gap-sm mb-xl px-md py-sm rounded-xl border border-surface-variant bg-surface-container-low">
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant">database</span>
          <select
            value={selectedDataset}
            onChange={(e) => setSelectedDataset(e.target.value)}
            className="flex-1 bg-transparent rounded-lg px-sm py-xs text-body-md focus:outline-none text-on-surface font-body-md"
          >
            <option value="">All datasets (general query)</option>
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <div className="p-md rounded-xl text-body-md font-body-md mb-xl bg-error-container text-on-error-container">
          {error}
        </div>
      )}

      {/* Insights Gallery (Bento Grid) */}
      {loading ? (
        <div className="flex justify-center py-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : insights.length === 0 ? (
        <div className="text-center py-2xl">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 mx-auto mb-lg">
            <span className="material-symbols-outlined text-[32px]">auto_awesome</span>
          </div>
          <p className="font-headline-md text-headline-md text-on-surface mb-sm">Ask your first question above</p>
          <p className="font-body-md text-body-md text-on-surface-variant">The AI will analyze your data and provide actionable insights.</p>
          <div className="flex flex-wrap justify-center gap-sm mt-xl">
            {exampleQuestions.map((q) => (
              <button
                key={q}
                onClick={() => setQuery(q)}
                className="px-md py-xs rounded-full border border-surface-variant bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm hover:border-primary/50 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-lg auto-rows-min">
          {insights.map((insight, index) => (
            <InsightCard key={insight.id} insight={insight} index={index} />
          ))}
        </div>
      )}

      {/* Footer */}
      <footer className="mt-2xl py-xl border-t border-outline-variant flex flex-col md:flex-row justify-between items-center gap-md opacity-80 hover:opacity-100 transition-opacity">
        <div className="font-headline-md text-headline-md text-on-surface mb-md md:mb-0">
          JOAT Intelligence
        </div>
        <div className="text-on-surface-variant font-body-md text-body-md">
          © 2024 JOAT Intelligence. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
