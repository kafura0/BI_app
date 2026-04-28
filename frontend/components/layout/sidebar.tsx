"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3, Database, MessageSquare, LayoutDashboard,
  ShieldCheck, LogOut, ChevronsUpDown, Zap, Users, CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/datasets", icon: Database, label: "Datasets" },
  { href: "/insights", icon: MessageSquare, label: "AI Insights" },
  { href: "/team", icon: Users, label: "Team" },
  { href: "/admin", icon: ShieldCheck, label: "Analytics" },
  { href: "/billing", icon: CreditCard, label: "Billing" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, organization, logout } = useAuth();

  return (
    <aside className="w-64 min-h-screen bg-slate-900 border-r border-slate-800 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg">BI Platform</span>
        </div>
      </div>

      {/* Org pill */}
      <div className="px-4 py-3 border-b border-slate-800">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors group">
          <div className="w-8 h-8 bg-indigo-600/20 border border-indigo-600/30 rounded-lg flex items-center justify-center">
            <span className="text-indigo-400 text-sm font-bold uppercase">
              {organization?.name?.[0] ?? "O"}
            </span>
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-white text-sm font-medium truncate">{organization?.name ?? "Organization"}</p>
            <p className="text-slate-500 text-xs capitalize">{organization?.plan ?? "free"} plan</p>
          </div>
          <ChevronsUpDown className="w-4 h-4 text-slate-500 group-hover:text-slate-400" />
        </button>
      </div>

      {/* Email verification banner */}
      {user && !(user as { email_verified?: boolean }).email_verified && (
        <div className="mx-3 mt-3 px-3 py-2 bg-amber-600/10 border border-amber-600/20 rounded-lg">
          <p className="text-amber-400 text-xs font-medium">Verify your email</p>
          <p className="text-slate-500 text-xs mt-0.5">Check your inbox to confirm your account.</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-indigo-600/15 text-indigo-400 border border-indigo-600/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Upgrade CTA */}
      {organization?.plan === "free" && (
        <div className="px-4 pb-3">
          <div className="bg-indigo-600/10 border border-indigo-600/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-indigo-400" />
              <span className="text-indigo-400 text-xs font-semibold">Upgrade to Pro</span>
            </div>
            <p className="text-slate-500 text-xs">50 datasets · 500 AI queries/day</p>
            <Link
              href="/billing"
              className="mt-2 block text-center text-xs bg-indigo-600 hover:bg-indigo-500 text-white py-1.5 rounded-md transition-colors font-medium"
            >
              View Plans
            </Link>
          </div>
        </div>
      )}

      {/* User */}
      <div className="px-4 pb-4 border-t border-slate-800 pt-3">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
            <span className="text-slate-300 text-sm font-medium uppercase">
              {user?.full_name?.[0] ?? "U"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.full_name}</p>
            <p className="text-slate-500 text-xs truncate">{user?.email}</p>
          </div>
          <button onClick={logout} className="text-slate-500 hover:text-red-400 transition-colors" title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
