"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
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
      <div className="mb-xl">
        <div className="flex items-center gap-3 mb-sm">
          <Link href="/datasets" className="text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </Link>
          <h1 className="font-headline-lg text-headline-lg font-bold" style={{ color: "var(--on-surface)" }}>Upload Dataset</h1>
        </div>
        <p className="font-body-md" style={{ color: "var(--on-surface-variant)" }}>CSV and Excel files up to 50MB</p>
      </div>

      {success ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle className="w-12 h-12 mb-4" style={{ color: "var(--tertiary)" }} />
          <h3 className="font-headline-md font-semibold mb-1" style={{ color: "var(--on-surface)" }}>Upload successful!</h3>
          <p className="font-body-md" style={{ color: "var(--on-surface-variant)" }}>Redirecting to datasets...</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl p-lg space-y-lg">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-xl text-center cursor-pointer transition-colors ${
              isDragActive ? "border-primary bg-primary/5" : "border-outline-variant hover:border-outline"
            }`}
            style={{ backgroundColor: "var(--surface-container-lowest)" }}
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="w-10 h-10" style={{ color: "var(--primary)" }} />
                <p className="font-body-md font-medium" style={{ color: "var(--on-surface)" }}>{file.name}</p>
                <p className="font-mono-sm text-mono-sm" style={{ color: "var(--on-surface-variant)" }}>{formatBytes(file.size)}</p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); setName(""); }}
                  className="font-label-sm text-label-sm mt-1 hover:text-error transition-colors"
                  style={{ color: "var(--on-surface-variant)" }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--surface-container-high)" }}>
                  <Upload className="w-6 h-6" style={{ color: "var(--on-surface-variant)" }} />
                </div>
                <div>
                  <p className="font-body-md font-medium" style={{ color: "var(--on-surface)" }}>Drop your file here</p>
                  <p className="font-body-md" style={{ color: "var(--on-surface-variant)" }}>or click to browse</p>
                </div>
                <p className="font-mono-sm text-mono-sm" style={{ color: "var(--outline)" }}>CSV, XLSX, XLS — max 50MB</p>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div>
            <label className="font-label-sm text-label-sm block mb-1.5" style={{ color: "var(--on-surface-variant)" }}>Dataset Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q3 Sales Report"
              className="w-full input-glass rounded-lg px-4 py-3 font-body-md text-body-md"
              style={{ color: "var(--on-surface)" }}
            />
          </div>

          <div>
            <label className="font-label-sm text-label-sm block mb-1.5" style={{ color: "var(--on-surface-variant)" }}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this dataset contain?"
              rows={3}
              className="w-full input-glass rounded-lg px-4 py-3 font-body-md text-body-md resize-none"
              style={{ color: "var(--on-surface)" }}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg text-sm" style={{ backgroundColor: "var(--error-container)", color: "var(--on-error-container)" }}>
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Link href="/datasets"
              className="px-5 py-2.5 rounded-lg font-label-sm text-label-sm font-medium transition-colors"
              style={{ backgroundColor: "var(--surface-container-high)", color: "var(--on-surface)" }}>
              Cancel
            </Link>
            <button
              onClick={handleUpload}
              disabled={!file || !name.trim() || uploading}
              className="btn-primary flex-1 rounded-lg py-2.5 font-label-sm text-label-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : "Upload & Process"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
