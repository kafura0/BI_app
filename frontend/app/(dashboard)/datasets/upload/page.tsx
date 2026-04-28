"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { datasetsApi, getErrorMessage } from "@/lib/api";
import { formatBytes } from "@/lib/utils";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setFile(accepted[0]);
      setName(accepted[0].name.replace(/\.(csv|xlsx|xls)$/i, "").replace(/[-_]/g, " "));
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"], "application/vnd.ms-excel": [".xls"] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
    onDropRejected: (rejections) => setError(rejections[0]?.errors[0]?.message ?? "Invalid file"),
  });

  const handleUpload = async () => {
    if (!file || !name.trim()) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", name.trim());
      if (description) formData.append("description", description);
      await datasetsApi.upload(formData);
      setSuccess(true);
      setTimeout(() => router.push("/datasets"), 1500);
    } catch (e) {
      setError(getErrorMessage(e));
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/datasets" className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Upload Dataset</h1>
          <p className="text-slate-400 text-sm">CSV and Excel files up to 50MB</p>
        </div>
      </div>

      {success ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle className="w-12 h-12 text-emerald-400 mb-4" />
          <h3 className="text-white font-semibold text-lg">Upload successful!</h3>
          <p className="text-slate-400 text-sm mt-1">Redirecting to datasets...</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-indigo-500 bg-indigo-500/5" : "border-slate-700 hover:border-slate-600"
            }`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="w-10 h-10 text-indigo-400" />
                <p className="text-white font-medium">{file.name}</p>
                <p className="text-slate-500 text-sm">{formatBytes(file.size)}</p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); setName(""); }}
                  className="text-xs text-slate-500 hover:text-red-400 mt-1"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center">
                  <Upload className="w-6 h-6 text-slate-400" />
                </div>
                <div>
                  <p className="text-white font-medium">Drop your file here</p>
                  <p className="text-slate-500 text-sm">or click to browse</p>
                </div>
                <p className="text-slate-600 text-xs">CSV, XLSX, XLS — max 50MB</p>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Dataset Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q3 Sales Report"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this dataset contain?"
              rows={3}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Link href="/datasets" className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors">
              Cancel
            </Link>
            <button
              onClick={handleUpload}
              disabled={!file || !name.trim() || uploading}
              className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : "Upload & Process"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
