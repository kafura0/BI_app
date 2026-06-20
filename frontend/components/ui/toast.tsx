"use client";
import { createContext, useContext, useCallback, useState } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (_message: string, _type?: ToastType) => void;
  success: (_message: string) => void;
  error: (_message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS = { success: CheckCircle, error: AlertCircle, info: Info };
const STYLES: Record<ToastType, string> = {
  success: "bg-emerald-950 border-emerald-800 text-emerald-100",
  error: "bg-red-950 border-red-800 text-red-100",
  info: "bg-slate-800 border-slate-700 text-slate-100",
};

function ToastEntry({ item, onDismiss }: { item: ToastItem; onDismiss: (_id: string) => void }) {
  const Icon = ICONS[item.type];
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl w-full ${STYLES[item.type]}`}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <p className="text-sm flex-1 leading-snug">{item.message}</p>
      <button
        onClick={() => onDismiss(item.id)}
        className="opacity-50 hover:opacity-100 transition-opacity ml-1 shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss]
  );

  const success = useCallback((msg: string) => toast(msg, "success"), [toast]);
  const error = useCallback((msg: string) => toast(msg, "error"), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 w-80 pointer-events-none">
        {toasts.map((item) => (
          <div key={item.id} className="pointer-events-auto">
            <ToastEntry item={item} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
