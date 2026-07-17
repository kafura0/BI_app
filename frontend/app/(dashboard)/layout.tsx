"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { ErrorBoundary } from "@/components/error-boundary";
import { isAuthenticated } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { datasetsApi, insightsApi } from "@/lib/api";
import Link from "next/link";

interface SearchResult {
  type: "dataset" | "insight" | "page";
  label: string;
  href: string;
  subtitle?: string;
}

const PAGE_LINKS: { label: string; href: string; icon: string }[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "Datasets", href: "/datasets", icon: "database" },
  { label: "Upload Dataset", href: "/datasets/upload", icon: "upload" },
  { label: "Insights", href: "/insights", icon: "insights" },
  { label: "Team", href: "/team", icon: "group" },
  { label: "Settings", href: "/admin", icon: "settings" },
  { label: "Billing", href: "/billing", icon: "credit_card" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    } else {
      setReady(true);
    }
  }, [router]);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim().toLowerCase();
    if (!trimmed) {
      const pageResults: SearchResult[] = PAGE_LINKS.filter((p) =>
        p.label.toLowerCase().includes(trimmed)
      ).map((p) => ({ type: "page" as const, label: p.label, href: p.href, subtitle: "Navigation" }));
      setSearchResults(pageResults);
      setSelectedIdx(0);
      return;
    }
    setSearching(true);
    try {
      const results: SearchResult[] = [];
      PAGE_LINKS.filter((p) => p.label.toLowerCase().includes(trimmed)).forEach((p) => {
        results.push({ type: "page", label: p.label, href: p.href, subtitle: "Navigation" });
      });
      const [dsRes, insRes] = await Promise.all([
        datasetsApi.list(1, 10, q).catch(() => ({ data: { items: [] as any[] } })),
        insightsApi.list(1, q).catch(() => ({ data: { items: [] as any[] } })),
      ]);
      dsRes.data.items.forEach((d: any) => {
        results.push({ type: "dataset", label: d.name, href: "/datasets", subtitle: `${d.row_count} rows · ${d.file_type}` });
      });
      insRes.data.items.forEach((i: any) => {
        results.push({ type: "insight", label: i.query, href: "/insights", subtitle: `Insight · ${i.model_used}` });
      });
      setSearchResults(results);
      setSelectedIdx(0);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    const timer = setTimeout(() => runSearch(searchQuery), 200);
    return () => clearTimeout(timer);
  }, [searchQuery, searchOpen, runSearch]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setSearchQuery("");
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  const handleSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, searchResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && searchResults[selectedIdx]) {
      router.push(searchResults[selectedIdx].href);
      setSearchOpen(false);
    }
  };

  const selectResult = (result: SearchResult) => {
    router.push(result.href);
    setSearchOpen(false);
  };

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
                className="pl-10 pr-16 py-1.5 bg-surface-container border border-outline-variant rounded-full text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 w-80 transition-all font-body-md text-body-md cursor-pointer"
                placeholder="Search..."
                type="text"
                onClick={() => { setSearchOpen(true); setSearchQuery(""); }}
                readOnly
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-on-surface-variant bg-surface-container-high border border-outline-variant rounded px-1.5 py-0.5 font-mono-sm pointer-events-none">⌘K</kbd>
            </div>
          </div>
          <div className="flex items-center gap-md">
            <button
              onClick={toggleTheme}
              className="hidden sm:flex items-center gap-sm px-4 py-1.5 rounded-full border border-outline-variant text-on-surface hover:bg-surface-container transition-colors text-label-sm font-label-sm active:scale-95 duration-150"
            >
              <span className="material-symbols-outlined text-[16px]">{theme === "dark" ? "light_mode" : "dark_mode"}</span>
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            <Link href="/datasets/upload"
              className="bg-primary text-on-primary px-4 py-1.5 rounded-full hover:bg-primary/90 transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] font-label-sm text-label-sm flex items-center gap-sm font-medium"
            >
              <span className="material-symbols-outlined text-[18px]" data-icon="add">add</span> New
            </Link>
            <div className="h-6 w-px bg-outline-variant/50 mx-sm hidden sm:block"></div>
            <button className="text-on-surface-variant hover:text-primary transition-colors relative active:scale-95 duration-150">
              <span className="material-symbols-outlined" data-icon="notifications">notifications</span>
            </button>
            {/* Mobile search button */}
            <button
              onClick={() => { setSearchOpen(true); setSearchQuery(""); }}
              className="text-on-surface-variant hover:text-primary transition-colors md:hidden active:scale-95 duration-150"
            >
              <span className="material-symbols-outlined" data-icon="search">search</span>
            </button>
            <Link href="/admin" className="text-on-surface-variant hover:text-primary transition-colors hidden sm:block active:scale-95 duration-150">
              <span className="material-symbols-outlined" data-icon="settings">settings</span>
            </Link>
            <div className="ml-sm w-8 h-8 rounded-full bg-surface-container border border-outline-variant overflow-hidden cursor-pointer flex items-center justify-center text-sm font-bold text-primary">
              {user?.full_name?.[0] ?? "U"}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-margin-mobile md:p-margin-desktop space-y-xl pb-32">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>

      {/* Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh] p-4" onClick={() => setSearchOpen(false)}>
          <div className="bg-surface-container border border-outline-variant rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 border-b border-outline-variant/50">
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">search</span>
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKey}
                placeholder="Search datasets, insights, or navigate..."
                className="flex-1 py-4 bg-transparent text-on-surface placeholder:text-on-surface-variant focus:outline-none font-body-md text-body-md"
              />
              {searching && <span className="material-symbols-outlined text-on-surface-variant animate-spin text-[18px]">refresh</span>}
              <kbd className="text-[10px] text-on-surface-variant bg-surface-container-high border border-outline-variant rounded px-1.5 py-0.5 font-mono-sm">ESC</kbd>
            </div>
            {searchResults.length > 0 ? (
              <div className="max-h-[40vh] overflow-y-auto p-2">
                {searchResults.map((r, i) => (
                  <button
                    key={`${r.type}-${r.label}-${i}`}
                    onClick={() => selectResult(r)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${
                      i === selectedIdx ? "bg-primary/10 text-on-surface" : "text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px] shrink-0">
                      {r.type === "dataset" ? "database" : r.type === "insight" ? "auto_awesome" : "arrow_forward"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{r.label}</p>
                      {r.subtitle && <p className="text-xs text-on-surface-variant truncate">{r.subtitle}</p>}
                    </div>
                    <span className="text-[10px] text-on-surface-variant bg-surface-container-high px-1.5 py-0.5 rounded shrink-0 capitalize">{r.type}</span>
                  </button>
                ))}
              </div>
            ) : searchQuery.trim() ? (
              <div className="p-8 text-center text-on-surface-variant text-sm">No results found for &ldquo;{searchQuery}&rdquo;</div>
            ) : (
              <div className="p-4">
                <p className="text-xs text-on-surface-variant mb-2 px-1">Quick Navigation</p>
                {PAGE_LINKS.map((p) => (
                  <button
                    key={p.href}
                    onClick={() => { router.push(p.href); setSearchOpen(false); }}
                    className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 text-on-surface-variant hover:bg-surface-container-high transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">{p.icon}</span>
                    <span className="text-sm">{p.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
