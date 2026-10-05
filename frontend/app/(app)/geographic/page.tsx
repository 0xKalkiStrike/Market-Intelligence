"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageLoading } from "@/components/ui/Spinner";

interface GeoState {
  metrics: {
    entities_by_state: { state: string; count: number }[];
    summary: {
      total_entities: number;
      doctors: number;
      dispensaries: number;
      competitors: number;
    };
  };
}

export default function GeographicViewPage() {
  const [data, setData] = useState<GeoState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<GeoState>("/api/market-intelligence/dashboard")
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) return <PageLoading />;

  const { entities_by_state, summary } = data.metrics;

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800/60 pb-5">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 dark:bg-indigo-900/50 px-3 py-0.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1">
          GEOGRAPHIC MARKET ANALYSIS
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-200 sm:text-3xl">Geographic Location View</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          State and city breakdown of collected Healthcare Providers, Doctors, Dispensaries, and Market Competitors.
        </p>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Entities</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-200 mt-1">{summary.total_entities}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Doctors</p>
          <p className="text-2xl font-extrabold text-blue-600 mt-1">{summary.doctors}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dispensaries</p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{summary.dispensaries}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Competitors</p>
          <p className="text-2xl font-extrabold text-purple-600 mt-1">{summary.competitors}</p>
        </div>
      </div>

      {/* State Matrix Card */}
      <Card>
        <CardHeader className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Geographic State Breakdown</h2>
          <Badge tone="info">Active Regions</Badge>
        </CardHeader>
        <CardBody className="space-y-4">
          {entities_by_state.map((st) => {
            const percentage = roundPercent((st.count / (summary.total_entities || 1)) * 100);
            return (
              <div key={st.state} className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-indigo-600 inline-block" />
                    <span className="font-extrabold text-slate-900 dark:text-slate-200 text-sm">{st.state}</span>
                  </div>
                  <span className="font-extrabold text-indigo-700 dark:text-indigo-300 text-xs">{st.count} Entities ({percentage}%)</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full" style={{ width: `${percentage}%` }} />
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>
    </div>
  );
}

function roundPercent(val: number): number {
  return Math.round(val * 10) / 10;
}
