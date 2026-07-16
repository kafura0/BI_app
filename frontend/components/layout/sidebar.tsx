"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const navItems = [
  { href: "/dashboard", icon: "dashboard", label: "Dashboard" },
  { href: "/datasets", icon: "database", label: "Datasets" },
  { href: "/insights", icon: "insights", label: "Insights" },
  { href: "/team", icon: "group", label: "Team" },
  { href: "/admin", icon: "settings", label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, organization, logout } = useAuth();

  return (
    <nav className="hidden md:flex flex-col py-lg bg-background font-body-md text-body-md border-r border-outline-variant fixed h-full w-64 left-0 top-0 z-50">
      {/* Logo + Org */}
      <div className="px-gutter mb-xl flex items-center gap-md">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
          <span className="material-symbols-outlined text-primary" data-icon="hub">hub</span>
        </div>
        <div>
          <h1 className="font-headline-md text-headline-md font-bold text-primary truncate tracking-tight">
            {organization?.name ?? "JOAT Intelligence"}
          </h1>
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            {organization?.plan === "enterprise" ? "Enterprise Tier" : organization?.plan === "pro" ? "Pro Plan" : "Free Plan"}
          </p>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-md space-y-sm">
        {navItems.map(({ href, icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center px-md py-sm rounded-lg transition-all duration-200 ease-in-out",
                active
                  ? "text-primary font-bold border-l-2 border-primary bg-primary/10"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
              )}
            >
              <span className={cn("material-symbols-outlined mr-md", active ? "" : "opacity-70")} style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {icon}
              </span>
              {label}
            </Link>
          );
        })}
      </div>

      {/* Bottom */}
      <div className="px-gutter mt-auto pt-lg border-t border-outline-variant/30 space-y-sm">
        <button
          className="w-full flex justify-center items-center py-sm rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface transition-colors font-label-sm text-label-sm gap-sm"
        >
          <span className="material-symbols-outlined text-[16px]" data-icon="bolt">bolt</span>
          Upgrade Plan
        </button>
        <div className="flex flex-col gap-xs mt-md">
          <Link href="#"
            className="flex items-center gap-md px-sm py-xs rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors font-label-sm text-label-sm"
          >
            <span className="material-symbols-outlined text-[18px]" data-icon="account_circle">account_circle</span>
            Profile
          </Link>
          <Link href="#"
            className="flex items-center gap-md px-sm py-xs rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors font-label-sm text-label-sm"
          >
            <span className="material-symbols-outlined text-[18px]" data-icon="help">help</span>
            Help
          </Link>
          <div
            className="flex items-center gap-md px-sm py-xs rounded text-on-surface-variant font-label-sm text-label-sm cursor-pointer hover:text-on-surface hover:bg-surface-container-high transition-colors"
            onClick={logout}
          >
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-on-primary shrink-0">
              {user?.full_name?.[0] ?? "U"}
            </div>
            <span className="flex-1 truncate">{user?.full_name ?? "User"}</span>
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
