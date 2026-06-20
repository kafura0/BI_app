"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, RefreshCw } from "lucide-react";
import { dashboardsApi, datasetsApi, getErrorMessage } from "@/lib/api";
import type { WidgetConfig } from "@/types";
import { WidgetGrid } from "@/components/dashboard/widget-grid";

export default function DashboardEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await dashboardsApi.getData(id);
        if (cancelled) return;
        const d = res.data.dashboard;
        setWidgets(d.widgets as WidgetConfig[]);
        setName(d.name);

        const dsRes = await datasetsApi.get(d.dataset_id);
        if (cancelled) return;
        setColumns(dsRes.data.schema_definition.columns.map((c) => c.name));
      } catch (e) {
        if (!cancelled) setError(getErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await dashboardsApi.update(id, { name, widgets });
      router.push("/dashboard");
    } catch (e) {
      setError(getErrorMessage(e));
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-20"><RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" /></div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="text-2xl font-bold text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 focus:outline-none transition-colors flex-1"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-medium rounded-lg transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>
      )}

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <p className="text-slate-500 text-sm mb-4">Drag widgets to reorder · Resize by dragging the corner · Click ＋ to add widgets</p>
        <WidgetGrid
          widgets={widgets}
          columns={columns}
          onChange={setWidgets}
        />
      </div>
    </div>
  );
}
