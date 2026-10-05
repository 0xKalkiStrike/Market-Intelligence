"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  Search,
  Building2,
  Swords,
  Map,
  Stethoscope,
  Link2,
  Rocket,
  ShieldCheck,
  FileText,
  TrendingUp,
  Globe,
  Folder,
  Settings2,
  ScrollText,
  KeyRound,
  Settings,
  X,
  Sparkles,
  Target,
  Handshake,
  UserCheck,
  BarChart3,
  MessageSquare,
  Scale,
  Bell,
  FileSpreadsheet,
  type LucideIcon,
} from "lucide-react";

const NAV_GROUPS: { title: string; items: { href: string; label: string; icon: LucideIcon }[] }[] = [
  {
    title: "Phase 4 Continuous Intelligence",
    items: [
      { href: "/command-center", label: "Executive Command Center", icon: LayoutDashboard },
      { href: "/forecasting", label: "Multi-Horizon Forecasting", icon: TrendingUp },
      { href: "/watchlists", label: "Continuous Watchlists", icon: Sparkles },
      { href: "/workflows", label: "Workflows & Approvals", icon: FileText },
      { href: "/geo-optimization", label: "Geo Spatial Grid", icon: Map },
      { href: "/management-queue", label: "Management Review Queue", icon: ShieldCheck },
      { href: "/ai-costs", label: "AI Costs & Router", icon: Settings2 },
    ],
  },
  {
    title: "Market Intelligence Engine",
    items: [
      { href: "/dashboard", label: "Executive Dashboard", icon: LayoutDashboard },
      { href: "/executive-report", label: "Executive Weekly Report", icon: FileSpreadsheet },
      { href: "/ai-query", label: "AI Market Assistant", icon: Sparkles },
      { href: "/what-changed", label: "What Changed Engine", icon: TrendingUp },
      { href: "/scenarios", label: "Scenario Analysis", icon: Target },
      { href: "/opportunity-scoring", label: "Opportunity Scoring", icon: Target },
      { href: "/geography", label: "Geographic Intelligence", icon: Map },
      { href: "/competitors", label: "Competitor Pricing", icon: Swords },
      { href: "/partnerships", label: "Dispensary Partnerships", icon: Handshake },
      { href: "/physicians", label: "Physician Coverage", icon: UserCheck },
      { href: "/seo", label: "SEO Intelligence", icon: BarChart3 },
      { href: "/reviews", label: "Review Intelligence", icon: MessageSquare },
      { href: "/regulatory", label: "Regulatory Intelligence", icon: Scale },
      { href: "/events", label: "Intelligence Events", icon: Bell },
      { href: "/ai-admin", label: "AI Admin & Observability", icon: Settings2 },
    ],
  },
  {
    title: "Core Data & Directory",
    items: [
      { href: "/market", label: "Market Explorer", icon: Search },
      { href: "/entities", label: "Entity Intelligence", icon: Building2 },
      { href: "/services", label: "Service Intelligence", icon: Stethoscope },
      { href: "/relationships", label: "Entity Relationships", icon: Link2 },
    ],
  },
  {
    title: "Collection & Verification",
    items: [
      { href: "/collection", label: "Data Collection", icon: Rocket },
      { href: "/verification", label: "Verification", icon: ShieldCheck },
      { href: "/evidence", label: "Source Evidence", icon: FileText },
      { href: "/data-quality", label: "Data Quality & Freshness", icon: TrendingUp },
      { href: "/sources", label: "Data Sources", icon: Globe },
    ],
  },
  {
    title: "System & Infrastructure",
    items: [
      { href: "/projects", label: "Projects", icon: Folder },
      { href: "/jobs", label: "Executions & Jobs", icon: Settings2 },
      { href: "/audit", label: "Audit Logs", icon: ScrollText },
      { href: "/credentials", label: "API Credentials", icon: KeyRound },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 w-64 shrink-0 border-r border-slate-800 bg-[#0f172a] text-slate-300 shadow-xl transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 flex flex-col",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5 bg-[#0f172a]">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs">
              MI
            </div>
            <div>
              <span className="text-sm font-semibold tracking-tight text-white block">Market-Intelligence</span>
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider block">Enterprise Platform</span>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 space-y-5 overflow-y-auto p-3.5 custom-scrollbar">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1">
              <h3 className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {group.title}
              </h3>
              <div className="mt-1 space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={clsx(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                        active
                          ? "bg-indigo-600 text-white font-semibold"
                          : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200"
                      )}
                    >
                      <Icon className={clsx("h-4 w-4 shrink-0", active ? "opacity-100" : "opacity-70")} strokeWidth={2} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-slate-800 p-3 bg-[#0b1120]">
          <div className="flex items-center justify-between rounded-lg bg-slate-900 border border-slate-800 p-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-slate-300 font-medium text-[11px]">Sync Engine Live</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 font-medium bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
              v2.4
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
