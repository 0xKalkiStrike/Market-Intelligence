"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application runtime error captured by boundary:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 sm:p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          System Recovered from Unexpected Error
        </h2>

        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
          An isolated runtime error occurred in this view. Your session and underlying data remain secure and uncorrupted.
        </p>

        {error?.message && (
          <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-left">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Diagnostic Message
            </span>
            <code className="text-xs font-mono text-rose-600 dark:text-rose-400 break-words block">
              {error.message}
            </code>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            onClick={() => reset()}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Action
          </Button>
          <Link href="/command-center" className="w-full sm:w-auto">
            <Button variant="secondary" className="w-full flex items-center justify-center gap-2">
              <Home className="w-4 h-4" />
              Return to Command Center
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
