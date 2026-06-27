"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import GridLayout, { Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { Plus, Trash2, GripVertical } from "lucide-react";
import type { WidgetConfig } from "@/types";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { MetricsCard } from "@/components/charts/metrics-card";
import { ForecastChart } from "@/components/charts/forecast-chart";

const WIDGET_TYPE_LABELS: Record<WidgetConfig["type"], string> = {
  line_chart: "Line Chart",
  bar_chart: "Bar Chart",
  pie_chart: "Pie Chart",
  metric_card: "Metric Card",
  table: "Table",
  forecast: "Forecast",
};

const WIDGET_COLORS = ["#6366f1", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

interface WidgetGridProps {
  widgets: WidgetConfig[];
  columns: string[];
  onChange: (_widgets: WidgetConfig[]) => void;
  readOnly?: boolean;
  widgetData?: Record<string, unknown>;
}

interface AddWidgetModalProps {
  columns: string[];
  onAdd: (_widget: Partial<WidgetConfig>) => void;
  onClose: () => void;
}

function AddWidgetModal({ columns, onAdd, onClose }: AddWidgetModalProps) {
  const [type, setType] = useState<WidgetConfig["type"]>("line_chart");
  const [title, setTitle] = useState("");
  const [xCol, setXCol] = useState(columns[0] ?? "");
  const [yCol, setYCol] = useState(columns[1] ?? columns[0] ?? "");
  const [agg, setAgg] = useState<WidgetConfig["aggregation"]>("sum");

  const handleAdd = () => {
    onAdd({ type, title: title || WIDGET_TYPE_LABELS[type], x_column: xCol || null, y_column: yCol || null, aggregation: agg });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
        <h3 className="text-white font-semibold text-lg mb-4">Add Widget</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-slate-400 text-sm mb-1.5">Widget Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as WidgetConfig["type"])}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {Object.entries(WIDGET_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-1.5">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={WIDGET_TYPE_LABELS[type]}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {type !== "metric_card" && type !== "table" && (
            <div>
              <label className="block text-slate-400 text-sm mb-1.5">X Axis / Category</label>
              <select value={xCol} onChange={(e) => setXCol(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {columns.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-slate-400 text-sm mb-1.5">Y Axis / Value Column</label>
            <select value={yCol} onChange={(e) => setYCol(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {columns.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-1.5">Aggregation</label>
            <select value={agg} onChange={(e) => setAgg(e.target.value as WidgetConfig["aggregation"])} className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {["sum", "avg", "count", "max", "min"].map((a) => (
                <option key={a} value={a}>{a.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors">
            Cancel
          </button>
          <button onClick={handleAdd} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
            Add Widget
          </button>
        </div>
      </div>
    </div>
  );
}

export function WidgetGrid({ widgets, columns, onChange, readOnly = false, widgetData }: WidgetGridProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    setContainerWidth(el.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  const layout: Layout[] = widgets.map((w) => ({
    i: w.id,
    x: w.position.x,
    y: w.position.y,
    w: w.position.w,
    h: w.position.h,
    minW: 2,
    minH: 2,
  }));

  const handleLayoutChange = useCallback(
    (newLayout: Layout[]) => {
      const updated = widgets.map((w) => {
        const pos = newLayout.find((l) => l.i === w.id);
        if (!pos) return w;
        return { ...w, position: { x: pos.x, y: pos.y, w: pos.w, h: pos.h } };
      });
      onChange(updated);
    },
    [widgets, onChange]
  );

  const handleAddWidget = (partial: Partial<WidgetConfig>) => {
    const id = crypto.randomUUID().slice(0, 8);
    const color = WIDGET_COLORS[widgets.length % WIDGET_COLORS.length];
    const newWidget: WidgetConfig = {
      id,
      type: partial.type ?? "metric_card",
      title: partial.title ?? "New Widget",
      x_column: partial.x_column ?? null,
      y_column: partial.y_column ?? null,
      group_by: null,
      aggregation: partial.aggregation ?? "sum",
      filters: {},
      position: { x: 0, y: Infinity, w: 6, h: 4 },
      color,
    };
    onChange([...widgets, newWidget]);
  };

  const handleRemove = (id: string) => {
    onChange(widgets.filter((w) => w.id !== id));
  };

  return (
    <div ref={containerRef}>
      {!readOnly && (
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Widget
          </button>
        </div>
      )}

      {widgets.length === 0 ? (
        <div className="border-2 border-dashed border-slate-700 rounded-xl p-16 text-center">
          <p className="text-slate-500 mb-4">No widgets yet</p>
          {!readOnly && (
            <button onClick={() => setShowAddModal(true)} className="text-indigo-400 hover:text-indigo-300 text-sm font-medium">
              + Add your first widget
            </button>
          )}
        </div>
      ) : (
        <GridLayout
          className="layout"
          layout={layout}
          cols={12}
          rowHeight={60}
          width={containerWidth}
          isDraggable={!readOnly}
          isResizable={!readOnly}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".drag-handle"
        >
          {widgets.map((widget) => (
            <div key={widget.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800">
                {!readOnly && (
                  <div className="drag-handle cursor-move text-slate-600 hover:text-slate-400">
                    <GripVertical className="w-4 h-4" />
                  </div>
                )}
                <span className="text-white text-sm font-medium flex-1 truncate">{widget.title}</span>
                <span className="text-xs text-slate-500 px-1.5 py-0.5 bg-slate-800 rounded">
                  {WIDGET_TYPE_LABELS[widget.type]}
                </span>
                {!readOnly && (
                  <button onClick={() => handleRemove(widget.id)} className="text-slate-600 hover:text-red-400 transition-colors ml-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex-1 min-h-0 p-2">
                {widget.type === "metric_card" ? (
                  <MetricsCard
                    title={widget.title}
                    value={(widgetData?.[widget.id] as { value: number } | undefined)?.value ?? 0}
                    color={widget.color}
                  />
                ) : widget.type === "line_chart" ? (
                  <RevenueChart
                    title={widget.title}
                    data={(widgetData?.[widget.id] as Array<{ x: string; value: number }> | undefined) ?? []}
                    type="line"
                    color={widget.color}
                  />
                ) : widget.type === "bar_chart" ? (
                  <RevenueChart
                    title={widget.title}
                    data={(widgetData?.[widget.id] as Array<{ x: string; value: number }> | undefined) ?? []}
                    type="bar"
                    color={widget.color}
                  />
                ) : widget.type === "forecast" ? (
                  <ForecastChart
                    title={widget.title}
                    data={(widgetData?.[widget.id] as { data: Array<{ x: string; value: number; type: string }>; r2: number; periods: number } | undefined) ?? { data: [], r2: 0, periods: 0 }}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-600 text-xs p-4">
                    <div className="text-center">
                      <div className="w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: `${widget.color}20` }}>
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: widget.color }} />
                      </div>
                      <p className="text-slate-500">{widget.y_column ?? "—"}</p>
                      {widget.x_column && <p className="text-slate-700 text-xs mt-0.5">by {widget.x_column}</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </GridLayout>
      )}

      {showAddModal && (
        <AddWidgetModal columns={columns} onAdd={handleAddWidget} onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}
