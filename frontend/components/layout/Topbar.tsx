"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { Search, Bell, CheckCircle2, ShieldCheck, Database, X } from "lucide-react";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : "U";

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 sm:px-6 transition-colors">
        <div className="flex items-center gap-2.5">
          {/* Mobile hamburger menu */}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white lg:hidden transition-colors border border-slate-200/80 dark:border-slate-700/60 shadow-2xs shrink-0 cursor-pointer"
            onClick={onMenuClick}
            aria-label="Open sidebar menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Mobile branding */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-black text-xs shadow-xs">
              MI
            </div>
            <span className="font-bold text-xs sm:text-sm tracking-tight text-slate-900 dark:text-white hidden sm:inline">
              Market Intelligence
            </span>
          </div>

          {/* Quick Search / Command Palette Trigger */}
          <button
            id="cmd-palette-trigger"
            onClick={() => setPaletteOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 px-2.5 sm:px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer"
            title="Press Ctrl+K or Cmd+K to search"
          >
            <Search className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="hidden md:inline">Quick Jump & Search...</span>
            <span className="md:hidden text-[11px]">Search...</span>
            <kbd className="hidden lg:inline-block ml-1.5 px-1.5 py-0.5 text-[9px] font-mono text-slate-400 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 shadow-2xs">
              ⌘K
            </kbd>
          </button>

          {/* Desktop status pill */}
          <div className="hidden xl:flex items-center gap-2 rounded-lg bg-slate-100/80 dark:bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/50">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-semibold text-slate-700 dark:text-slate-200">Supabase Connected</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="text-slate-500 dark:text-slate-400">Zero-PHI Grounded Sync Active</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notifications Button */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs transition-colors cursor-pointer relative"
              aria-label="System notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
            </button>

            {/* Notifications Popover */}
            {notificationsOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setNotificationsOpen(false)}
                />
                <div className="absolute right-0 mt-2 z-50 w-80 sm:w-88 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-4 text-xs animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      Live System Telemetry
                    </span>
                    <button
                      onClick={() => setNotificationsOpen(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50 flex items-start gap-2.5">
                      <Database className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white block">
                          Primary Database: Supabase
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                          PostgreSQL 17.11 connected via transaction pooler with SSL encryption.
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50 flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white block">
                          Quality Engine: Operational
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                          Autonomous failure remediation and drift detection pipelines active.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Theme Switcher Button */}
          <ThemeToggle />

          {/* User Profile Pill */}
          {user && (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 py-1 px-2 sm:py-1.5 sm:px-3 rounded-xl shadow-2xs">
              <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-bold text-xs shrink-0 shadow-xs">
                {userInitial}
              </div>
              <span className="hidden md:inline text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[140px] truncate">
                {user.email}
              </span>
              <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border border-indigo-200 dark:border-indigo-800/60">
                {user.is_superuser ? "Admin" : "Analyst"}
              </span>
            </div>
          )}

          {/* Sign Out Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={logout}
            className="text-xs px-2.5 sm:px-3 rounded-xl shadow-2xs hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-800/60 transition-colors"
          >
            Sign Out
          </Button>
        </div>
      </header>

      {/* Global Command Palette Modal */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
