"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  Activity,
  LayoutDashboard,
  Search,
  Swords,
  Map,
  FileText,
  TrendingUp,
  Settings,
  X,
  Sparkles,
  Target,
  Handshake,
  Scale,
  Bell,
  FileSpreadsheet,
  ShieldCheck,
  Share2,
  FlaskConical,
  Compass,
  LineChart,
  Building2,
  CreditCard,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Executive",
    items: [
      { href: "/command-center", label: "Command Center", icon: LayoutDashboard },
      { href: "/dashboard", label: "Pipeline Overview", icon: Activity },
      { href: "/executive-report", label: "Executive Brief", icon: FileSpreadsheet },
      { href: "/market", label: "Market Explorer", icon: Search },
    ],
  },
  {
    title: "Market Intelligence",
    items: [
      { href: "/competitors", label: "Competitors & Pricing", icon: Swords },
      { href: "/partnerships", label: "Dispensary Partners", icon: Handshake },
      { href: "/geography", label: "Geospatial Density", icon: Map },
      { href: "/regulatory", label: "Regulatory Intel", icon: Scale },
    ],
  },
  {
    title: "Advanced Research & Optimization",
    items: [
      { href: "/research", label: "Research Workspace", icon: FlaskConical, badge: "P7" },
      { href: "/competitive-patterns", label: "Competitive Patterns", icon: Swords },
      { href: "/geo-opportunity-v2", label: "Geo Opportunity v2", icon: Compass },
      { href: "/pricing-research", label: "Pricing Research", icon: Target },
      { href: "/scenario-comparison", label: "Scenario Studio", icon: LineChart },
    ],
  },
  {
    title: "Analytics & AI",
    items: [
      { href: "/forecasting", label: "Market Forecasts", icon: TrendingUp },
      { href: "/scenarios", label: "Scenario Modeling", icon: Target },
      { href: "/ai-query", label: "AI Copilot", icon: Sparkles, badge: "AI" },
      { href: "/watchlists", label: "Market Watchlists", icon: Bell },
    ],
  },
  {
    title: "Organization & Enterprise",
    items: [
      { href: "/organization", label: "Organization & Team", icon: Building2, badge: "P9" },
      { href: "/organization/billing", label: "Plans & Billing", icon: CreditCard },
      { href: "/onboarding", label: "Setup Wizard", icon: Compass },
      { href: "/admin-platform", label: "Platform Admin", icon: ShieldAlert, badge: "Admin" },
    ],
  },
  {
    title: "Operations & Governance",
    items: [
      { href: "/admin-quality", label: "Quality Center", icon: ShieldCheck, badge: "P8" },
      { href: "/integrations-center", label: "Integrations Hub", icon: Share2 },
      { href: "/operations-center", label: "Operations Hub", icon: Activity },
      { href: "/data-quality", label: "Data Quality", icon: ShieldCheck },
      { href: "/workflows", label: "Workflow Reviews", icon: FileText },
      { href: "/settings", label: "System Settings", icon: Settings },
    ],
  },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const [activeOrg, setActiveOrg] = useState<{ name: string; plan_tier: string } | null>(null);

  useEffect(() => {
    api
      .get<{ name: string; plan_tier: string }>("/api/tenants/current")
      .then((data) => setActiveOrg(data))
      .catch(() => {});
  }, []);

  return (
    <>
      {/* Mobile Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 w-64 shrink-0 border-r border-slate-800 bg-[#0c1222] text-slate-300 shadow-2xl transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 flex flex-col",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-5 bg-[#0a0f1d]">
          <Link href="/command-center" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 text-white font-black text-xs shadow-md shadow-indigo-600/30 group-hover:scale-105 transition-transform">
              MI
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-white block group-hover:text-indigo-300 transition-colors">
                Market Intelligence
              </span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                Enterprise Platform
              </span>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden transition-colors"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Workspace Identity Badge */}
        {activeOrg && (
          <div className="px-3 pt-3">
            <Link
              href="/organization"
              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 p-2.5 transition-all hover:border-emerald-500/50 hover:bg-slate-900"
            >
              <div className="truncate">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Workspace
                </span>
                <span className="block truncate text-xs font-semibold text-white">
                  {activeOrg.name}
                </span>
              </div>
              <span className="rounded-md border border-emerald-500/30 bg-emerald-950/40 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                {activeOrg.plan_tier}
              </span>
            </Link>
          </div>
        )}

        {/* Navigation Sections */}
        <nav className="flex-1 space-y-6 overflow-y-auto p-3.5 custom-scrollbar">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1.5">
              <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group.title}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(item.href + "/"));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={clsx(
                        "group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all",
                        active
                          ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/25 font-bold"
                          : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                      )}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <Icon
                          className={clsx(
                            "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                            active ? "text-white" : "text-slate-400 group-hover:text-indigo-400"
                          )}
                          strokeWidth={2}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="ml-2 rounded-md bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-indigo-300 border border-indigo-500/30">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-slate-800/80 p-3 bg-[#080d19]">
          <div className="flex items-center justify-between rounded-xl bg-slate-900/90 border border-slate-800 px-3 py-2 text-xs shadow-inner">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-300 font-semibold text-[11px]">Sync Engine Live</span>
            </div>
            <span className="text-[10px] font-mono text-indigo-400 font-bold bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-800/60">
              v2.5 PROD
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
