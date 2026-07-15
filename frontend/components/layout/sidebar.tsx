"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";

const navItems = [
  { href: "/dashboard", icon: "dashboard", label: "Dashboard", adminOnly: false },
  { href: "/insights", icon: "smart_toy", label: "AI Copilot", adminOnly: false },
  { href: "/admin", icon: "monitoring", label: "Analytics", adminOnly: true },
  { href: "/datasets", icon: "database", label: "Data Sources", adminOnly: false },
  { href: "/team", icon: "group", label: "Team", adminOnly: false },
  { href: "/billing", icon: "credit_card", label: "Billing", adminOnly: false },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-surface-container-low border-r border-outline-variant flex flex-col z-50">
      {/* Logo */}
      <div className="px-6 py-md mb-6 mt-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--primary-container)" }}>
            <span className="material-symbols-outlined text-[20px]" style={{ color: "var(--on-primary-container)" }}>bar_chart</span>
          </div>
          <div>
            <h1 className="text-title-md font-bold" style={{ color: "var(--on-surface)" }}>BI Platform</h1>
            <p className="text-[10px] font-label-md uppercase tracking-widest" style={{ color: "var(--on-surface-variant)" }}>Enterprise Analytics</p>
          </div>
        </div>
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
                "flex items-center gap-3 px-4 py-2.5 rounded-lg mx-1 transition-all duration-200",
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
      <div className="px-4 py-3 space-y-2" style={{ borderTop: "1px solid var(--outline-variant)" }}>
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors hover:bg-surface-variant"
          style={{ color: "var(--on-surface-variant)" }}
        >
          <span className="material-symbols-outlined text-[20px]">{theme === "dark" ? "light_mode" : "dark_mode"}</span>
          <span className="text-body-md">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
        </button>
      </div>

      {/* User */}
      <div className="px-4 pb-4 pt-3">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-variant transition-colors group cursor-pointer">
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--primary)", color: "var(--on-primary)" }}>
            <span className="text-sm font-medium uppercase">{user?.full_name?.[0] ?? "U"}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "var(--on-surface)" }}>{user?.full_name ?? "User"}</p>
            <p className="text-xs truncate" style={{ color: "var(--on-surface-variant)" }}>{user?.email}</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); logout(); }} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--on-surface-variant)" }} title="Sign out">
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
