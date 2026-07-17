"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, RefreshCw } from "lucide-react";
import { dashboardsApi, datasetsApi, getErrorMessage } from "@/lib/api";
import type { WidgetConfig } from "@/types";
import { WidgetGrid } from "@/components/dashboard/widget-grid";
import { useToast } from "@/components/ui/toast";

export default function DashboardEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { success: toastSuccess } = useToast();

  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [widgetData, setWidgetData] = useState<Record<string, unknown>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await dashboardsApi.getData(id);
        if (cancelled) return;
        const d = res.data.dashboard;
        setWidgetData(res.data.widget_data);
        setWidgets(d.widgets as WidgetConfig[]);
        setName(d.name);
        setDescription(d.description ?? "");

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
      await dashboardsApi.update(id, { name, description: description || undefined, widgets });
      toastSuccess("Dashboard saved");
      router.push("/dashboard");
    } catch (e) {
      setError(getErrorMessage(e));
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <RefreshCw className="w-6 h-6 text-primary animate-spin" />
    </div>
  );

  return (
    <div className="space-y-xl">
      {/* Header */}
      <div className="glass-card rounded-xl p-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <Link href="/dashboard" className="text-on-surface-variant hover:text-on-surface transition-colors shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex-1 min-w-0">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-headline-md font-bold text-on-surface bg-transparent border-b border-transparent hover:border-outline-variant focus:border-primary focus:outline-none transition-colors"
                placeholder="Dashboard name"
              />
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-body-md text-on-surface-variant bg-transparent border-b border-transparent hover:border-outline-variant focus:border-primary focus:outline-none transition-colors mt-1"
                placeholder="Add a description (optional)"
              />
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-60 font-medium rounded-lg transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg text-sm bg-error-container text-on-error-container">{error}</div>
      )}

      {/* Widget Grid */}
      <div className="glass-card rounded-xl p-lg">
        <p className="text-on-surface-variant text-body-md mb-md">Drag widgets to reorder, resize by dragging the corner, or click the ＋ button to add widgets.</p>
        <WidgetGrid
          widgets={widgets}
          columns={columns}
          onChange={setWidgets}
          widgetData={widgetData}
        />
      </div>
    </div>
  );
}
