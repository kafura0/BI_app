"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Database, Trash2, BarChart2, RefreshCw, CheckCircle, Clock, XCircle, Download, FileText, Search, X } from "lucide-react";
import { datasetsApi, dashboardsApi, getErrorMessage } from "@/lib/api";
import type { Dataset } from "@/types";
import { formatBytes, formatDate, formatNumber } from "@/lib/utils";
import { downloadWithAuth } from "@/lib/download";
import { useToast } from "@/components/ui/toast";

const statusConfig = {
  ready: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-400/10", label: "Ready" },
  processing: { icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10", label: "Processing" },
  pending: { icon: Clock, color: "text-slate-400", bg: "bg-slate-400/10", label: "Pending" },
  failed: { icon: XCircle, color: "text-red-400", bg: "bg-red-400/10", label: "Failed" },
};

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function ExportMenu({ datasetId, datasetName }: { datasetId: string; datasetName: string }) {
  const { error: toastError } = useToast();
  const [downloading, setDownloading] = useState<"csv" | "pdf" | null>(null);

  const handleDownload = async (type: "csv" | "pdf") => {
    setDownloading(type);
    try {
      const url = `${BASE_URL}/export/datasets/${datasetId}/${type}`;
      await downloadWithAuth(url, `${datasetName}.${type}`);
    } catch {
      toastError(`Failed to download ${type.toUpperCase()}`);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="flex gap-1">
      <button
        onClick={() => handleDownload("csv")}
        disabled={downloading !== null}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-400 hover:text-white text-xs font-medium rounded-lg transition-colors"
        title="Export CSV"
      >
        {downloading === "csv" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />} CSV
      </button>
      <button
        onClick={() => handleDownload("pdf")}
        disabled={downloading !== null}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-400 hover:text-white text-xs font-medium rounded-lg transition-colors"
        title="Export PDF report"
      >
        {downloading === "pdf" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />} PDF
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

  useEffect(() => {
    loadData("");
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData(search);
    }, 300);
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Datasets</h1>
          <p className="text-slate-400 text-sm mt-0.5">Upload and manage your data sources</p>
        </div>
        <Link href="/datasets/upload" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Upload Dataset
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" /></div>
      ) : datasets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
            <Database className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-white font-medium mb-2">No datasets yet</h3>
          <p className="text-slate-500 text-sm mb-6">Upload a CSV or Excel file to get started</p>
          <Link href="/datasets/upload" className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors text-sm">
            <Plus className="w-4 h-4" /> Upload your first dataset
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {datasets.map((dataset) => {
            const status = statusConfig[dataset.status] ?? statusConfig.pending;
            const StatusIcon = status.icon;
            return (
              <div key={dataset.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-indigo-600/10 rounded-lg flex items-center justify-center mt-0.5 shrink-0">
                      <Database className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-white font-semibold">{dataset.name}</h3>
                      {dataset.description && <p className="text-slate-500 text-sm mt-0.5 truncate">{dataset.description}</p>}
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                        <span className="text-slate-500 text-xs">{formatNumber(dataset.row_count)} rows</span>
                        <span className="text-slate-500 text-xs">{dataset.column_count} columns</span>
                        <span className="text-slate-500 text-xs">{formatBytes(dataset.file_size_bytes)}</span>
                        <span className="text-slate-500 text-xs">{formatDate(dataset.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {dataset.status === "ready" && <ExportMenu datasetId={dataset.id} datasetName={dataset.name} />}
                    {dataset.status === "ready" && (
                      <button
                        onClick={() => handleGenerateDashboard(dataset.id, dataset.name)}
                        disabled={generating === dataset.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        {generating === dataset.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <BarChart2 className="w-3 h-3" />}
                        Auto Dashboard
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(dataset.id)}
                      className="p-1.5 text-slate-600 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
