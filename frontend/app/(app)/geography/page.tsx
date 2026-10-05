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
      states_covered: number;
      cities_covered: number;
    };
  };
}

export default function GeographicIntelligencePage() {
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
          GEOGRAPHIC MARKET INTELLIGENCE
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-200 sm:text-3xl">Geographic Intelligence</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          State, city, and regional distribution of collected public market entities (Doctors, Dispensaries, Clinics, Competitors).
        </p>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Entities</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-200 mt-1">{summary.total_entities}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">States Covered</p>
          <p className="text-2xl font-extrabold text-indigo-600 mt-1">{summary.states_covered || entities_by_state.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cities Covered</p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{summary.cities_covered || 0}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Market Competitors</p>
          <p className="text-2xl font-extrabold text-purple-600 mt-1">{summary.competitors}</p>
        </div>
      </div>

      {/* State Matrix Card */}
      <Card>
        <CardHeader className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Geographic State Breakdown</h2>
          <Badge tone="info">{entities_by_state.length} Active Regions</Badge>
        </CardHeader>
        <CardBody className="space-y-4">
          {entities_by_state.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400">
              <p className="text-xs">No geographic market data available yet. Trigger a collection run to discover regional entities!</p>
            </div>
          ) : (
            entities_by_state.map((st) => {
              const percentage = Math.round((st.count / (summary.total_entities || 1)) * 1000) / 10;
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
            })
          )}
        </CardBody>
      </Card>
    </div>
  );
}
