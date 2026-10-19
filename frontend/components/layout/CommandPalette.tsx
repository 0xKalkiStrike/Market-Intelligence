"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Activity,
  FileSpreadsheet,
  Swords,
  Handshake,
  Map,
  Scale,
  FlaskConical,
  LineChart,
  TrendingUp,
  Sparkles,
  Bell,
  Building2,
  ShieldCheck,
  Share2,
  Settings,
  ArrowRight,
  X,
  type LucideIcon,
} from "lucide-react";

interface PaletteItem {
  title: string;
  category: string;
  href: string;
  icon: LucideIcon;
  keywords: string[];
  badge?: string;
}

const PALETTE_ITEMS: PaletteItem[] = [
  // Executive
  {
    title: "Command Center",
    category: "Executive",
    href: "/command-center",
    icon: LayoutDashboard,
    keywords: ["home", "executive", "dashboard", "overview", "kpis"],
    badge: "MAIN",
  },
  {
    title: "Pipeline Overview",
    category: "Executive",
    href: "/dashboard",
    icon: Activity,
    keywords: ["pipeline", "status", "sync", "jobs"],
  },
  {
    title: "Executive Brief",
    category: "Executive",
    href: "/executive-report",
    icon: FileSpreadsheet,
    keywords: ["report", "brief", "pdf", "export", "summary"],
  },
  {
    title: "Market Explorer",
    category: "Executive",
    href: "/market",
    icon: Search,
    keywords: ["search", "directory", "entities", "providers", "dispensaries"],
  },

  // Market Intel
  {
    title: "Competitors & Pricing",
    category: "Market Intel",
    href: "/competitors",
    icon: Swords,
    keywords: ["competitor", "pricing", "catalog", "prices", "products"],
  },
  {
    title: "Dispensary Partners",
    category: "Market Intel",
    href: "/partnerships",
    icon: Handshake,
    keywords: ["partners", "dispensary", "store", "b2b", "channels"],
  },
  {
    title: "Geospatial Intelligence",
    category: "Market Intel",
    href: "/geography",
    icon: Map,
    keywords: ["map", "density", "geography", "county", "location", "florida"],
  },
  {
    title: "Regulatory Intelligence",
    category: "Market Intel",
    href: "/regulatory",
    icon: Scale,
    keywords: ["compliance", "regulations", "statute", "rules", "legal"],
  },

  // Research & AI Studio
  {
    title: "Research Workspace",
    category: "Research & AI",
    href: "/research",
    icon: FlaskConical,
    keywords: ["research", "investigation", "analysis", "evidence", "citations"],
    badge: "PRO",
  },
  {
    title: "AI Copilot & Query",
    category: "Research & AI",
    href: "/ai-query",
    icon: Sparkles,
    keywords: ["ai", "copilot", "chat", "gpt", "rag", "natural language"],
    badge: "AI",
  },
  {
    title: "Market Forecasts",
    category: "Research & AI",
    href: "/forecasting",
    icon: TrendingUp,
    keywords: ["forecast", "predictions", "trend", "future", "growth"],
  },
  {
    title: "Scenario Studio",
    category: "Research & AI",
    href: "/scenario-comparison",
    icon: LineChart,
    keywords: ["scenarios", "what-if", "simulation", "modeling"],
  },
  {
    title: "Market Watchlists",
    category: "Research & AI",
    href: "/watchlists",
    icon: Bell,
    keywords: ["alerts", "watchlists", "tracking", "monitored"],
  },

  // Operations & Workspace
  {
    title: "Quality Center",
    category: "Operations",
    href: "/admin-quality",
    icon: ShieldCheck,
    keywords: ["quality", "remediation", "benchmarks", "drift", "audit"],
    badge: "LIVE",
  },
  {
    title: "Organization & Team",
    category: "Operations",
    href: "/organization",
    icon: Building2,
    keywords: ["team", "members", "org", "users", "tenant"],
  },
  {
    title: "Integrations Hub",
    category: "Operations",
    href: "/integrations-center",
    icon: Share2,
    keywords: ["integrations", "api", "webhooks", "connections", "supabase"],
  },
  {
    title: "System Settings",
    category: "Operations",
    href: "/settings",
    icon: Settings,
    keywords: ["settings", "preferences", "config", "api keys"],
  },
];

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus when opened
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        setQuery("");
        setSelectedIndex(0);
        inputRef.current?.focus();
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) {
          onClose();
        } else {
          // Trigger open via custom event or external callback
          const btn = document.getElementById("cmd-palette-trigger");
          btn?.click();
        }
      } else if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Filter items
  const filteredItems = PALETTE_ITEMS.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.keywords.some((kw) => kw.toLowerCase().includes(q))
    );
  });

  // Handle keyboard navigation
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev === 0 ? Math.max(0, filteredItems.length - 1) : prev - 1
      );
    } else if (e.key === "Enter" && filteredItems[selectedIndex]) {
      e.preventDefault();
      navigateTo(filteredItems[selectedIndex].href);
    }
  };

  const navigateTo = (href: string) => {
    onClose();
    router.push(href);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[80vh] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          <Search className="w-5 h-5 text-indigo-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a feature, report, or command... (e.g. pricing, ai, quality)"
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setSelectedIndex(0);
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-200/70 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/40 custom-scrollbar">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No matching modules or features found for &quot;{query}&quot;
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={item.href}
                  onClick={() => navigateTo(item.href)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <span className="block text-xs font-semibold truncate">
                        {item.title}
                      </span>
                      <span
                        className={`block text-[10px] uppercase font-bold tracking-wider ${
                          isSelected ? "text-indigo-200" : "text-slate-400"
                        }`}
                      >
                        {item.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {item.badge && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    <ArrowRight
                      className={`w-3.5 h-3.5 transition-transform ${
                        isSelected
                          ? "text-white translate-x-0.5"
                          : "text-slate-400 opacity-40"
                      }`}
                    />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1 py-0.5 font-mono text-[9px] bg-slate-200 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700">
              ↑↓
            </kbd>
            to navigate
            <kbd className="ml-1.5 px-1 py-0.5 font-mono text-[9px] bg-slate-200 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700">
              ENTER
            </kbd>
            to select
          </span>
          <span className="font-semibold text-slate-500 dark:text-slate-400">
            Enterprise Navigation
          </span>
        </div>
      </div>
    </div>
  );
}
