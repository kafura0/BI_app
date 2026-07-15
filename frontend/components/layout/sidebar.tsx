"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";

const navItems = [
  { href: "/dashboard", icon: "dashboard", label: "Dashboard", adminOnly: false },
  { href: "/datasets", icon: "database", label: "Data Sources", adminOnly: false },
  { href: "/insights", icon: "smart_toy", label: "AI Insights", adminOnly: false },
  { href: "/team", icon: "group", label: "Team", adminOnly: false },
  { href: "/admin", icon: "monitoring", label: "Analytics", adminOnly: true },
  { href: "/billing", icon: "credit_card", label: "Billing", adminOnly: false },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, organization, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-surface-container-low border-r border-outline-variant flex flex-col z-50">
      {/* Logo */}
      <div className="px-6 py-md mb-6 mt-4">
        <h1 className="text-headline-md font-bold" style={{ color: "var(--primary)" }}>BI Platform</h1>
        <p className="text-label-md uppercase tracking-widest mt-1" style={{ color: "var(--on-surface-variant)" }}>Enterprise Analytics</p>
      </div>

      {/* Org pill */}
      <div className="px-4 mb-4">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-variant transition-colors group">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--secondary-container)", color: "var(--on-secondary-container)" }}>
            <span className="text-sm font-bold uppercase">{organization?.name?.[0] ?? "O"}</span>
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "var(--on-surface)" }}>{organization?.name ?? "Organization"}</p>
            <p className="text-xs capitalize" style={{ color: "var(--on-surface-variant)" }}>{organization?.plan ?? "free"} plan</p>
          </div>
          <span className="material-symbols-outlined text-[20px]" style={{ color: "var(--on-surface-variant)" }}>expand_more</span>
        </button>
      </div>

      {/* Email verification banner */}
      {user && !user.email_verified && (
        <div className="mx-3 mb-3 px-3 py-2 rounded-lg" style={{ backgroundColor: "var(--error-container)", color: "var(--on-error-container)" }}>
          <p className="text-xs font-medium">Verify your email</p>
          <p className="text-xs mt-0.5 opacity-80">Check your inbox to confirm your account.</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3">
        {navItems.filter(({ adminOnly }) => !adminOnly || user?.role === "admin").map(({ href, icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg mx-1 transition-all duration-200",
                active
                  ? "sidebar-item-active"
                  : "hover:bg-surface-variant transition-colors duration-200"
              )}
              style={active ? { backgroundColor: "var(--secondary-container)", color: "var(--on-secondary-container)" } : { color: "var(--on-surface-variant)" }}
            >
              <span className="material-symbols-outlined text-[20px]">{icon}</span>
              <span className="text-body-md">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-4 mt-6 space-y-2">
        <Link
          href="/insights"
          className="w-full py-2.5 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
          style={{ backgroundColor: "var(--primary)", color: "var(--on-primary)" }}
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          New Analysis
        </Link>

        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors"
          style={{ color: "var(--on-surface-variant)" }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--surface-variant)"}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
        >
          <span className="material-symbols-outlined text-[20px]">{theme === "dark" ? "light_mode" : "dark_mode"}</span>
          <span className="text-body-md">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
        </button>
      </div>

      {/* User */}
      <div className="px-4 pb-4 pt-3" style={{ borderTop: "1px solid var(--outline-variant)" }}>
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--surface-variant)", color: "var(--on-surface-variant)" }}>
            <span className="text-sm font-medium uppercase">{user?.full_name?.[0] ?? "U"}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "var(--on-surface)" }}>{user?.full_name}</p>
            <p className="text-xs truncate" style={{ color: "var(--on-surface-variant)" }}>{user?.email}</p>
          </div>
          <button onClick={logout} className="transition-colors" style={{ color: "var(--on-surface-variant)" }} title="Sign out">
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
