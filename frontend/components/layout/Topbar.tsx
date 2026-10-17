"use client";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth();

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : "U";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 sm:px-6 transition-colors">
      <div className="flex items-center gap-2.5">
        <button
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white lg:hidden transition-colors border border-slate-200/80 dark:border-slate-700/60 shadow-2xs shrink-0"
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

        {/* Desktop status pill */}
        <div className="hidden lg:flex items-center gap-2 rounded-lg bg-slate-100/80 dark:bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/50">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-700 dark:text-slate-200">Sync Engine Active</span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span className="text-slate-500 dark:text-slate-400">Real-time Cross-Source Intelligence</span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme Switcher Button */}
        <ThemeToggle />

        {user && (
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 py-1 px-2 sm:py-1.5 sm:px-3 rounded-lg">
            <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-indigo-600 text-white font-semibold text-xs shrink-0">
              {userInitial}
            </div>
            <span className="hidden md:inline text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[140px] truncate">
              {user.email}
            </span>
            <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide border border-indigo-200 dark:border-indigo-800/60">
              {user.is_superuser ? "Admin" : "Analyst"}
            </span>
          </div>
        )}
        <Button variant="secondary" size="sm" onClick={logout} className="text-xs px-2.5 sm:px-3">
          Sign Out
        </Button>
      </div>
    </header>
  );
}

