"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { ErrorBoundary } from "@/components/error-boundary";
import { isAuthenticated } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const { organization } = useAuth();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) {
    return <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }} />;
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--surface-dim)" }}>
      <Sidebar />
      <div className="flex-1 ml-64">
        {/* Top App Bar */}
        <header
          className="fixed top-0 right-0 left-64 h-16 z-40 flex justify-between items-center px-lg"
          style={{ backgroundColor: "var(--surface)", borderBottom: "1px solid var(--outline-variant)", backdropFilter: "blur(12px)" }}
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[20px]" style={{ color: "var(--on-surface-variant)" }}>dashboard</span>
            <span className="text-sm font-medium capitalize" style={{ color: "var(--on-surface)" }}>
              {organization?.name ?? "Workspace"}
            </span>
            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full uppercase tracking-wider" style={{ backgroundColor: "var(--primary-container)", color: "var(--on-primary-container)" }}>
              {organization?.plan ?? "free"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-lg transition-colors hover:bg-surface-variant" style={{ color: "var(--on-surface-variant)" }}>
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: "var(--error)" }}></span>
            </button>
            <button className="p-2 rounded-lg transition-colors hover:bg-surface-variant" style={{ color: "var(--on-surface-variant)" }}>
              <span className="material-symbols-outlined text-[20px]">help</span>
            </button>
          </div>
        </header>
        <main className="pt-16 min-h-screen">
          <div className="px-lg py-lg max-w-7xl mx-auto">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
