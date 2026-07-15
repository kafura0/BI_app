"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw, BarChart2 } from "lucide-react";
import { datasetsApi, dashboardsApi, getErrorMessage } from "@/lib/api";
import type { Dataset } from "@/types";
import { formatBytes, formatDate, formatNumber } from "@/lib/utils";
import { downloadWithAuth } from "@/lib/download";
import { useToast } from "@/components/ui/toast";

const statusConfig: Record<string, { color: string; label: string }> = {
  ready: { color: "var(--tertiary)", label: "Connected" },
  processing: { color: "var(--secondary)", label: "Processing" },
  pending: { color: "var(--on-surface-variant)", label: "Pending" },
  failed: { color: "var(--error)", label: "Failed" },
};

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function ExportMenu({ datasetId, datasetName }: { datasetId: string; datasetName: string }) {
  const { error: toastError } = useToast();
  const [downloading, setDownloading] = useState<"csv" | "pdf" | null>(null);

  const handleDownload = async (type: "csv" | "pdf") => {
    setDownloading(type);
    try { await downloadWithAuth(`${BASE_URL}/export/datasets/${datasetId}/${type}`, `${datasetName}.${type}`); }
    catch { toastError(`Failed to download ${type.toUpperCase()}`); }
    finally { setDownloading(null); }
  };

  return (
    <div className="flex gap-1">
      <button onClick={() => handleDownload("csv")} disabled={downloading !== null}
        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
        style={{ backgroundColor: "var(--surface-variant)", color: "var(--on-surface)" }}>
        {downloading === "csv" ? <RefreshCw className="w-3 h-3 animate-spin inline mr-1" /> : null}CSV
      </button>
      <button onClick={() => handleDownload("pdf")} disabled={downloading !== null}
        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
        style={{ backgroundColor: "var(--surface-variant)", color: "var(--on-surface)" }}>
        {downloading === "pdf" ? <RefreshCw className="w-3 h-3 animate-spin inline mr-1" /> : null}PDF
      </button>
    </div>
  );
}

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadData = async (q: string) => {
    setLoading(true); setError(null);
    try { const res = await datasetsApi.list(1, 20, q || undefined); setDatasets(res.data.items); }
    catch (e) { setError(getErrorMessage(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(""); }, []);
  useEffect(() => { const timer = setTimeout(() => { loadData(search); }, 300); return () => clearTimeout(timer); }, [search]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this dataset and all associated dashboards?")) return;
    setError(null);
    try { await datasetsApi.delete(id); setDatasets((prev) => prev.filter((d) => d.id !== id)); }
    catch (e) { setError(getErrorMessage(e)); }
  };

  const handleGenerateDashboard = async (datasetId: string, name: string) => {
    setGenerating(datasetId); setError(null);
    try { await dashboardsApi.create({ name: `${name} — Dashboard`, dataset_id: datasetId }); window.location.href = "/dashboard"; }
    catch (e) { setError(getErrorMessage(e)); setGenerating(null); }
  };

  return (
    <div className="space-y-lg">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-headline-lg font-bold tracking-tight" style={{ color: "var(--on-surface)" }}>Data Sources</h2>
          <p className="text-body-md mt-1" style={{ color: "var(--on-surface-variant)" }}>Centralize all your metrics by connecting data sources.</p>
        </div>
        <Link href="/datasets/upload"
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all active:scale-95"
          style={{ backgroundColor: "var(--primary)", color: "var(--on-primary)" }}>
          <Plus className="w-4 h-4" /> Upload CSV
        </Link>
      </div>

      {error && (
        <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: "var(--error-container)", color: "var(--on-error-container)" }}>{error}</div>
      )}

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px]" style={{ color: "var(--on-surface-variant)" }}>search</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search data sources..."
            className="w-full rounded-lg pl-9 pr-4 py-2 text-sm"
            style={{ backgroundColor: "var(--surface-container-high)", border: "none", color: "var(--on-surface)" }} />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-24"><RefreshCw className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} /></div>
      ) : datasets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: "var(--surface-container)" }}>
            <span className="material-symbols-outlined text-[40px]" style={{ color: "var(--on-surface-variant)" }}>database</span>
          </div>
          <h3 className="font-title-md mb-2" style={{ color: "var(--on-surface)" }}>No data sources yet</h3>
          <p className="text-sm mb-6" style={{ color: "var(--on-surface-variant)" }}>Upload a CSV or Excel file to get started.</p>
          <Link href="/datasets/upload" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all active:scale-95 shadow-lg"
            style={{ backgroundColor: "var(--primary)", color: "var(--on-primary)" }}>
            <Plus className="w-5 h-5" /> Upload your first dataset
          </Link>
          {/* Custom integration CTA */}
          <div className="mt-12 px-lg py-lg rounded-xl border-2 border-dashed" style={{ borderColor: "var(--outline-variant)" }}>
            <span className="material-symbols-outlined text-[36px]" style={{ color: "var(--on-surface-variant)" }}>hub</span>
            <h4 className="font-title-md mt-2" style={{ color: "var(--on-surface)" }}>Need a custom integration?</h4>
            <p className="text-sm mt-1 mb-4" style={{ color: "var(--on-surface-variant)" }}>Our engineering team can build custom connectors for your proprietary APIs.</p>
            <button className="px-lg py-2 rounded-full font-label-md uppercase tracking-widest text-sm transition-all active:scale-95"
              style={{ border: "1px solid var(--primary)", color: "var(--primary)" }}>
              Request Integration
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {datasets.map((dataset) => {
            const status = statusConfig[dataset.status] ?? statusConfig.pending;
            return (
              <div key={dataset.id} className="glass-card rounded-xl p-lg flex flex-col justify-between transition-all hover:translate-y-[-2px]">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--surface-container)" }}>
                      <span className="material-symbols-outlined text-[24px]" style={{ color: "var(--primary)" }}>database</span>
                    </div>
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                      style={{ backgroundColor: `${status.color}15`, color: status.color }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.color }}></span>
                      {status.label}
                    </span>
                  </div>
                  <h3 className="font-title-md mb-1" style={{ color: "var(--on-surface)" }}>{dataset.name}</h3>
                  {dataset.description && <p className="text-sm mb-3 line-clamp-2" style={{ color: "var(--on-surface-variant)" }}>{dataset.description}</p>}
                  <div className="flex items-center gap-3 text-xs mb-4" style={{ color: "var(--on-surface-variant)" }}>
                    <span>{formatNumber(dataset.row_count)} rows</span>
                    <span>·</span>
                    <span>{dataset.column_count} cols</span>
                    <span>·</span>
                    <span>{formatBytes(dataset.file_size_bytes)}</span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>Synced {formatDate(dataset.created_at)}</p>
                </div>
                <div className="flex gap-2 mt-5 pt-4" style={{ borderTop: "1px solid var(--outline-variant)" }}>
                  {dataset.status === "ready" && (
                    <>
                      <button onClick={() => handleGenerateDashboard(dataset.id, dataset.name)} disabled={generating === dataset.id}
                        className="flex-1 py-2 rounded-lg text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
                        style={{ backgroundColor: "var(--primary)", color: "var(--on-primary)" }}>
                        {generating === dataset.id ? <RefreshCw className="w-3 h-3 animate-spin inline mr-1" /> : <BarChart2 className="w-3 h-3 inline mr-1" />}
                        Auto Dashboard
                      </button>
                      <ExportMenu datasetId={dataset.id} datasetName={dataset.name} />
                    </>
                  )}
                  {dataset.status !== "ready" && (
                    <span className="flex-1 py-2 rounded-lg text-xs text-center font-medium" style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface-variant)" }}>
                      Processing...
                    </span>
                  )}
                  <button onClick={() => handleDelete(dataset.id)} className="p-2 rounded-lg transition-colors" style={{ color: "var(--on-surface-variant)" }}>
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
