"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import clsx from "clsx";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={clsx(
        "flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:text-slate-900 dark:hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40",
        className
      )}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "Light" : "Dark"} mode`}
    >
      {isDark ? <Moon className="h-4 w-4" strokeWidth={2} /> : <Sun className="h-4 w-4" strokeWidth={2} />}
    </button>
  );
}
