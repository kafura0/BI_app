"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw, BarChart2 } from "lucide-react";
import { datasetsApi, dashboardsApi, getErrorMessage } from "@/lib/api";
import type { Dataset } from "@/types";
import { formatBytes, formatDate, formatNumber } from "@/lib/utils";
import { downloadWithAuth } from "@/lib/download";
import { useToast } from "@/components/ui/toast";

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  ready: { color: "var(--tertiary)", bg: "var(--tertiary)", label: "Connected" },
  processing: { color: "var(--secondary)", bg: "var(--secondary)", label: "Processing" },
  pending: { color: "var(--on-surface-variant)", bg: "var(--on-surface-variant)", label: "Pending" },
  failed: { color: "var(--error)", bg: "var(--error)", label: "Failed" },
};

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function ExportMenu({ datasetId, datasetName }: { datasetId: string; datasetName: string }) {
  const { error: toastError } = useToast();
  const [downloading, setDownloading] = useState<"csv" | "pdf" | null>(null);

  const handleDownload = async (type: "csv" | "pdf") => {
    setDownloading(type);
    try {
      await downloadWithAuth(`${BASE_URL}/export/datasets/${datasetId}/${type}`, `${datasetName}.${type}`);
    } catch {
      toastError(`Failed to download ${type.toUpperCase()}`);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="flex gap-1">
      <button onClick={() => handleDownload("csv")} disabled={downloading !== null}
        className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
        style={{ backgroundColor: "var(--surface-variant)", color: "var(--on-surface-variant)" }}>
        {downloading === "csv" ? <RefreshCw className="w-3 h-3 animate-spin inline" /> : null} CSV
      </button>
      <button onClick={() => handleDownload("pdf")} disabled={downloading !== null}
        className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
        style={{ backgroundColor: "var(--surface-variant)", color: "var(--on-surface-variant)" }}>
        {downloading === "pdf" ? <RefreshCw className="w-3 h-3 animate-spin inline" /> : null} PDF
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
    setLoading(true);
    setError(null);
    try {
      const res = await datasetsApi.list(1, 20, q || undefined);
      setDatasets(res.data.items);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(""); }, []);

  useEffect(() => {
    const timer = setTimeout(() => { loadData(search); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this dataset and all associated dashboards?")) return;
    setError(null);
    try {
      await datasetsApi.delete(id);
      setDatasets((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const handleGenerateDashboard = async (datasetId: string, name: string) => {
    setGenerating(datasetId);
    setError(null);
    try {
      await dashboardsApi.create({ name: `${name} — Dashboard`, dataset_id: datasetId });
      window.location.href = "/dashboard";
    } catch (e) {
      setError(getErrorMessage(e));
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-lg">
      {/* Page Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-headline-lg text-headline-lg" style={{ color: "var(--on-surface)" }}>Connect your business data</h2>
          <p className="font-body-lg text-body-lg" style={{ color: "var(--on-surface-variant)" }}>Centralize all your metrics by uploading files or connecting integrations.</p>
        </div>
        <Link href="/datasets/upload"
          className="flex items-center gap-2 px-md py-2 rounded-lg font-title-md transition-all active:scale-95"
          style={{ backgroundColor: "var(--surface-container-high)", border: "1px solid var(--outline-variant)", color: "var(--on-surface)" }}>
          <span className="material-symbols-outlined text-[18px]">upload_file</span>
          <span>Upload CSV</span>
        </Link>
      </div>

      {error && (
        <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: "var(--error-container)", color: "var(--on-error-container)" }}>{error}</div>
      )}

      {/* Search */}
      <div className="relative w-full max-w-md">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px]" style={{ color: "var(--on-surface-variant)" }}>search</span>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search data sources..."
          className="w-full rounded-lg pl-10 pr-4 py-2"
          style={{ backgroundColor: "var(--surface-container-high)", border: "none", color: "var(--on-surface)" }} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} /></div>
      ) : datasets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: "var(--surface-container)" }}>
            <span className="material-symbols-outlined text-[32px]" style={{ color: "var(--on-surface-variant)" }}>database</span>
          </div>
          <h3 className="font-title-md mb-2" style={{ color: "var(--on-surface)" }}>No datasets yet</h3>
          <p className="text-sm mb-6" style={{ color: "var(--on-surface-variant)" }}>Upload a CSV or Excel file to get started</p>
          <Link href="/datasets/upload"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all active:scale-95"
            style={{ backgroundColor: "var(--primary)", color: "var(--on-primary)" }}>
            <Plus className="w-4 h-4" /> Upload your first dataset
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-gutter">
          {datasets.map((dataset) => {
            const status = statusConfig[dataset.status] ?? statusConfig.pending;
            return (
              <div key={dataset.id} className="glass-card p-md rounded-xl flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-md">
                    <div className="h-12 w-12 rounded-lg flex items-center justify-center p-2" style={{ backgroundColor: "var(--surface-container)" }}>
                      <span className="material-symbols-outlined text-[24px]" style={{ color: "var(--primary)" }}>database</span>
                    </div>
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider"
                      style={dataset.status === "ready" ? { color: "var(--tertiary)" } : { color: "var(--on-surface-variant)" }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.color }}></span>
                      {status.label}
                    </span>
                  </div>
                  <h3 className="font-title-md mb-1" style={{ color: "var(--on-surface)" }}>{dataset.name}</h3>
                  {dataset.description && <p className="text-sm mb-md truncate" style={{ color: "var(--on-surface-variant)" }}>{dataset.description}</p>}
                  <p className="text-xs mb-md" style={{ color: "var(--on-surface-variant)" }}>
                    {formatNumber(dataset.row_count)} rows · {dataset.column_count} cols · {formatBytes(dataset.file_size_bytes)}
                  </p>
                  <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>Last sync: {formatDate(dataset.created_at)}</p>
                </div>
                <div className="mt-md space-y-2">
                  {dataset.status === "ready" && (
                    <div className="flex gap-2">
                      <button onClick={() => handleGenerateDashboard(dataset.id, dataset.name)} disabled={generating === dataset.id}
                        className="flex-1 py-2 rounded-lg font-label-md text-xs transition-colors disabled:opacity-50"
                        style={{ backgroundColor: "var(--primary)", color: "var(--on-primary)" }}>
                        {generating === dataset.id ? <RefreshCw className="w-3 h-3 animate-spin inline" /> : <BarChart2 className="w-3 h-3 inline" />} Dashboard
                      </button>
                      <ExportMenu datasetId={dataset.id} datasetName={dataset.name} />
                    </div>
                  )}
                  <button onClick={() => handleDelete(dataset.id)}
                    className="w-full py-2 rounded-lg font-label-md text-xs transition-colors"
                    style={{ backgroundColor: "var(--surface-variant)", color: "var(--on-surface-variant)" }}>
                    Delete
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
