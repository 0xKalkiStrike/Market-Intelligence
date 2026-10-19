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
  Handshake,
  Scale,
  Bell,
  FileSpreadsheet,
  ShieldCheck,
  Share2,
  FlaskConical,
  LineChart,
  Building2,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Filter,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  keywords?: string[];
}

interface NavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: "executive",
    title: "Executive Overview",
    items: [
      { href: "/command-center", label: "Command Center", icon: LayoutDashboard, badge: "CORE", keywords: ["executive", "kpi", "home"] },
      { href: "/dashboard", label: "Pipeline Overview", icon: Activity, keywords: ["status", "sync", "data"] },
      { href: "/executive-report", label: "Executive Brief", icon: FileSpreadsheet, keywords: ["brief", "pdf", "report"] },
      { href: "/market", label: "Market Explorer", icon: Search, keywords: ["entities", "directory", "search"] },
    ],
  },
  {
    id: "intel",
    title: "Market Intelligence",
    items: [
      { href: "/competitors", label: "Competitors & Pricing", icon: Swords, keywords: ["prices", "catalog", "competitors"] },
      { href: "/partnerships", label: "Dispensary Partners", icon: Handshake, keywords: ["dispensaries", "b2b", "channels"] },
      { href: "/geography", label: "Geospatial Intelligence", icon: Map, keywords: ["maps", "density", "geo"] },
      { href: "/regulatory", label: "Regulatory Intel", icon: Scale, keywords: ["statutes", "compliance", "laws"] },
      { href: "/competitive-patterns", label: "Competitive Patterns", icon: Swords, keywords: ["patterns", "movements"] },
    ],
  },
  {
    id: "research",
    title: "Research & AI Studio",
    items: [
      { href: "/research", label: "Research Workspace", icon: FlaskConical, badge: "PRO", keywords: ["deep dive", "citations", "citations"] },
      { href: "/ai-query", label: "AI Copilot", icon: Sparkles, badge: "AI", keywords: ["chat", "gpt", "rag", "assistant"] },
      { href: "/forecasting", label: "Market Forecasts", icon: TrendingUp, keywords: ["predictions", "trends", "projections"] },
      { href: "/scenario-comparison", label: "Scenario Studio", icon: LineChart, keywords: ["scenarios", "simulations", "what if"] },
      { href: "/watchlists", label: "Market Watchlists", icon: Bell, keywords: ["alerts", "tracking", "triggers"] },
    ],
  },
  {
    id: "operations",
    title: "Operations & Governance",
    items: [
      { href: "/admin-quality", label: "Quality Center", icon: ShieldCheck, badge: "LIVE", keywords: ["regression", "drift", "audit"] },
      { href: "/organization", label: "Organization & Team", icon: Building2, keywords: ["members", "rbac", "tenants"] },
      { href: "/integrations-center", label: "Integrations Hub", icon: Share2, keywords: ["api", "webhooks", "supabase"] },
      { href: "/operations-center", label: "Operations Hub", icon: Activity, keywords: ["jobs", "queues", "workers"] },
      { href: "/workflows", label: "Workflow Reviews", icon: FileText, keywords: ["reviews", "approvals"] },
      { href: "/settings", label: "System Settings", icon: Settings, keywords: ["config", "api keys", "account"] },
    ],
  },
];

export function Sidebar({
  open,
  onClose,
  collapsed = false,
  onToggleCollapse,
}: {
  open: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname();
  const [activeOrg, setActiveOrg] = useState<{ name: string; plan_tier: string } | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api
      .get<{ name: string; plan_tier: string }>("/api/tenants/current")
      .then((data) => setActiveOrg(data))
      .catch(() => {});
  }, []);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const hasFilter = searchFilter.trim().length > 0;
  const filterLower = searchFilter.toLowerCase();

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
          "fixed inset-y-0 left-0 z-50 shrink-0 border-r border-[#29354b] bg-[#10172a] text-slate-300 shadow-2xl transition-all duration-300 ease-in-out lg:static flex flex-col select-none",
          collapsed ? "lg:w-20" : "lg:w-64",
          open ? "w-64 translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-[#29354b] px-4 bg-[#0d1424]">
          <Link href="/command-center" className="flex items-center gap-3 group min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 text-white font-black text-xs shadow-md shadow-indigo-600/30 group-hover:scale-105 transition-transform shrink-0">
              MI
            </div>
            {!collapsed && (
              <div className="truncate">
                <span className="text-sm font-bold tracking-tight text-white block group-hover:text-indigo-300 transition-colors truncate">
                  Market Intel
                </span>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                  Enterprise Platform
                </span>
              </div>
            )}
          </Link>

          <div className="flex items-center gap-1">
            {/* Desktop collapse toggle */}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="hidden lg:flex rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {collapsed ? (
                  <PanelLeftOpen className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </button>
            )}

            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden transition-colors cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Workspace Identity Badge (expanded only) */}
        {!collapsed && activeOrg && (
          <div className="px-3 pt-3">
            <Link
              href="/organization"
              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 p-2.5 transition-all hover:border-indigo-500/50 hover:bg-slate-900"
            >
              <div className="truncate">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Workspace
                </span>
                <span className="block truncate text-xs font-semibold text-white">
                  {activeOrg.name}
                </span>
              </div>
              <span className="rounded-md border border-indigo-500/30 bg-indigo-950/60 px-1.5 py-0.5 text-[9px] font-bold text-indigo-400">
                {activeOrg.plan_tier}
              </span>
            </Link>
          </div>
        )}

        {/* Instant Filter Input (expanded only) */}
        {!collapsed && (
          <div className="px-3 pt-3">
            <div className="relative">
              <Filter className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter tools & pages..."
                className="w-full rounded-xl bg-slate-900/90 border border-slate-800/80 pl-8 pr-7 py-1.5 text-[11px] text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-500/60 transition-colors"
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter("")}
                  className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300 text-xs"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Navigation Sections */}
        <nav className="flex-1 space-y-4 overflow-y-auto p-3 custom-scrollbar">
          {NAV_GROUPS.map((group) => {
            const matchingItems = group.items.filter((item) => {
              if (!hasFilter) return true;
              return (
                item.label.toLowerCase().includes(filterLower) ||
                (item.keywords && item.keywords.some((k) => k.toLowerCase().includes(filterLower)))
              );
            });

            if (hasFilter && matchingItems.length === 0) return null;

            const isGroupCollapsed = !hasFilter && collapsedGroups[group.id];

            return (
              <div key={group.id} className="space-y-1">
                {/* Section Header */}
                {!collapsed ? (
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors cursor-pointer group"
                  >
                    <span>{group.title}</span>
                    <span className="opacity-60 group-hover:opacity-100">
                      {isGroupCollapsed ? (
                        <ChevronRight className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </span>
                  </button>
                ) : (
                  <div className="h-px bg-slate-800/60 my-2 mx-1" />
                )}

                {/* Items */}
                {!isGroupCollapsed && (
                  <div className="space-y-0.5">
                    {matchingItems.map((item) => {
                      const active =
                        pathname === item.href ||
                        (item.href !== "/" && pathname.startsWith(item.href + "/"));
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onClose}
                          title={collapsed ? item.label : undefined}
                          className={clsx(
                            "group flex items-center rounded-xl transition-all cursor-pointer",
                            collapsed
                              ? "justify-center p-2.5"
                              : "justify-between px-3 py-2 text-xs font-semibold",
                            active
                              ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/30 font-bold"
                              : "text-slate-400 hover:bg-slate-850 hover:text-slate-100"
                          )}
                        >
                          <div className={clsx("flex items-center gap-2.5 min-w-0", collapsed && "justify-center")}>
                            <Icon
                              className={clsx(
                                "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                                active ? "text-white" : "text-slate-400 group-hover:text-indigo-400"
                              )}
                              strokeWidth={2}
                            />
                            {!collapsed && <span className="truncate">{item.label}</span>}
                          </div>

                          {!collapsed && item.badge && (
                            <span
                              className={clsx(
                                "ml-2 rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider shrink-0",
                                active
                                  ? "bg-white/20 text-white"
                                  : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                              )}
                            >
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-slate-800/80 p-2.5 bg-[#080d19]">
          {!collapsed ? (
            <div className="flex items-center justify-between rounded-xl bg-slate-900/90 border border-slate-800 px-3 py-2 text-xs shadow-inner">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-slate-300 font-semibold text-[11px]">Supabase Cloud</span>
              </div>
              <span className="text-[10px] font-mono text-indigo-400 font-bold bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-800/60">
                PROD 17.11
              </span>
            </div>
          ) : (
            <div className="flex justify-center py-1" title="Connected to Supabase PostgreSQL 17.11">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
