"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Map, ArrowRight } from "lucide-react";

export default function GeoOptimizationRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/geography");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 space-y-4">
      <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
        <Map className="h-6 w-6" />
      </div>
      <h1 className="text-xl font-bold text-white">Redirecting to Geospatial Intelligence Grid...</h1>
      <p className="text-xs text-slate-400 max-w-md">
        Spatial demand clustering and ZIP code opportunity scoring have been consolidated into the unified Geospatial Intelligence center.
      </p>
      <Link
        href="/geography"
        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
      >
        <span>Open Geospatial Intelligence</span>
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
