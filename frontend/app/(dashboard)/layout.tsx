"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { ErrorBoundary } from "@/components/error-boundary";
import { isAuthenticated } from "@/lib/auth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

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
      {/* Top App Bar */}
      <div className="flex-1 ml-64">
        <header
          className="fixed top-0 right-0 left-64 h-16 z-40 flex justify-between items-center px-lg"
          style={{ backgroundColor: "var(--surface)", borderBottom: "1px solid var(--outline-variant)", backdropFilter: "blur(12px)" }}
        >
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px]" style={{ color: "var(--on-surface-variant)" }}>search</span>
              <input
                className="w-full rounded-lg pl-10 pr-4 py-2"
                style={{ backgroundColor: "var(--surface-container-highest)", border: "none", color: "var(--on-surface)" }}
                placeholder="Search data, reports, or commands..."
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 transition-colors" style={{ color: "var(--on-surface-variant)" }}>
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="p-2 transition-colors" style={{ color: "var(--on-surface-variant)" }}>
              <span className="material-symbols-outlined">help</span>
            </button>
          </div>
        </header>
        <main className="pt-16 min-h-screen">
          <div className="px-lg py-md max-w-7xl mx-auto">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
