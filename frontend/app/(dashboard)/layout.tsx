"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { ErrorBoundary } from "@/components/error-boundary";
import { isAuthenticated } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 md:ml-64 flex flex-col h-screen overflow-hidden">
        {/* TopNavBar */}
        <header className="flex justify-between items-center px-margin-desktop h-16 w-full sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-outline-variant shadow-sm font-body-md text-body-md text-primary">
          <div className="flex items-center gap-lg">
            {/* Mobile Menu Trigger */}
            <button className="md:hidden text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined" data-icon="menu">menu</span>
            </button>
            <span className="font-headline-md text-headline-md font-bold text-on-surface md:hidden tracking-tight">JOAT</span>
            {/* Search Bar (desktop) */}
            <div className="hidden md:flex relative group">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none group-focus-within:text-primary transition-colors" data-icon="search">search</span>
              <input
                className="pl-10 pr-4 py-1.5 bg-surface-container border border-outline-variant rounded-full text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 w-80 transition-all font-body-md text-body-md"
                placeholder="Search datasets, insights, commands..."
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-md">
            <button className="hidden sm:block px-4 py-1.5 rounded-full border border-outline-variant text-on-surface hover:bg-surface-container transition-colors text-label-sm font-label-sm">
              Theme
            </button>
            <Link href="/datasets/upload"
              className="bg-primary text-on-primary px-4 py-1.5 rounded-full hover:bg-primary/90 transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] font-label-sm text-label-sm flex items-center gap-sm font-medium"
            >
              <span className="material-symbols-outlined text-[18px]" data-icon="add">add</span> New
            </Link>
            <div className="h-6 w-px bg-outline-variant/50 mx-sm hidden sm:block"></div>
            <button className="text-on-surface-variant hover:text-primary transition-colors relative active:scale-95 duration-150">
              <span className="material-symbols-outlined" data-icon="notifications">notifications</span>
              <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full ring-2 ring-background"></span>
            </button>
            {/* Mobile search button */}
            <button className="text-on-surface-variant hover:text-primary transition-colors md:hidden active:scale-95 duration-150">
              <span className="material-symbols-outlined" data-icon="search">search</span>
            </button>
            <button className="text-on-surface-variant hover:text-primary transition-colors hidden sm:block active:scale-95 duration-150">
              <span className="material-symbols-outlined" data-icon="settings">settings</span>
            </button>
            <div className="ml-sm w-8 h-8 rounded-full bg-surface-container border border-outline-variant overflow-hidden cursor-pointer flex items-center justify-center text-sm font-bold" style={{ color: "var(--primary)" }}>
              {user?.full_name?.[0] ?? "U"}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-margin-mobile md:p-margin-desktop space-y-xl pb-32">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
