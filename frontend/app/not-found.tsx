import Link from "next/link";
import { Compass, Home, Search, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex items-center justify-center p-4 sm:p-6 font-['Inter',sans-serif]">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-8 text-center relative overflow-hidden">
        {/* Decorative blur backdrop */}
        <div className="absolute -top-20 -right-20 w-44 h-44 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-44 h-44 rounded-full bg-cyan-500/10 dark:bg-cyan-500/20 blur-3xl pointer-events-none" />

        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-5 border border-indigo-500/20 shadow-inner">
          <Compass className="w-8 h-8 animate-pulse" />
        </div>

        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-200/60 dark:border-indigo-800/60 inline-block mb-3">
          Error 404 • Destination Not Found
        </span>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Resource Unavailable
        </h1>

        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          The intelligence view, report, or entity route you requested does not exist or has been relocated to another workspace partition.
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <Link href="/command-center" className="w-full">
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2">
              <Home className="w-4 h-4" />
              Go to Command Center
              <ArrowRight className="w-3.5 h-3.5 ml-auto" />
            </Button>
          </Link>
          <Link href="/market" className="w-full">
            <Button variant="secondary" className="w-full flex items-center justify-center gap-2">
              <Search className="w-4 h-4" />
              Explore Market Directory
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
