"use client";

import { useEffect, useState } from "react";
import { TrendingUp, RefreshCw, Calendar, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { api } from "@/lib/api";

interface WhatChangedData {
  summary: {
    period: string;
    compared_to: string;
    cutoff_date: string;
    total_price_changes: number;
    total_regulatory_changes: number;
    total_market_events: number;
    total_new_entities: number;
  };
  price_changes: Array<{
    competitor_name: string;
    state: string;
    service_name: string;
    promotion?: string;
    price_diff: number;
    new_price: number;
    previous_price: number | null;
  }>;
  regulatory_changes: Array<{
    state: string;
    rule_title: string;
    priority: string;
    new_info: string;
  }>;
  market_events: Array<{
    entity_name: string;
    state: string;
    importance: string;
    description: string;
  }>;
}

export default function WhatChangedPage() {
  const [data, setData] = useState<WhatChangedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("this_week");
  const [stateFilter, setStateFilter] = useState("");

  async function fetchChanges() {
    setLoading(true);
    try {
      let path = `/api/market-intelligence/ai/what-changed?period=${period}`;
      if (stateFilter) path += `&state=${encodeURIComponent(stateFilter)}`;
      const json = await api.get<WhatChangedData>(path);
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchChanges();
  }, [period, stateFilter]);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200/80 dark:border-[#29354b] pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold tracking-wide mb-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            Period-Over-Period Comparison Engine
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-indigo-500" />
            &ldquo;What Changed?&rdquo; Market Delta
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Compare market conditions across customizable timeframes to detect additions, removals, price shifts, and regulatory updates.
          </p>
        </div>

        <button
          onClick={fetchChanges}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-[#151e32] border border-slate-200/80 dark:border-[#29354b] px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1c2740] shadow-sm transition-colors self-start md:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-indigo-500" : ""}`} />
          Refresh Delta
        </button>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#151e32] border border-slate-200/80 dark:border-[#29354b] p-3 rounded-xl shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-indigo-500" /> Period:
          </span>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-[#29354b] bg-slate-50 dark:bg-[#10172a] px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="today">Today vs Yesterday</option>
            <option value="this_week">This Week vs Last Week</option>
            <option value="this_month">This Month vs Last Month</option>
            <option value="this_quarter">This Quarter vs Last Quarter</option>
            <option value="this_year">This Year vs Last Year</option>
          </select>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">State:</span>
          <input
            type="text"
            placeholder="e.g. FL, TX, CA"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value.toUpperCase())}
            className="rounded-lg border border-slate-200 dark:border-[#29354b] bg-slate-50 dark:bg-[#10172a] px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:outline-none w-28 uppercase font-mono"
          />
        </div>
      </div>

      {/* Metric Cards */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-xl bg-white dark:bg-[#151e32] border border-slate-200/80 dark:border-[#29354b] p-4 shadow-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Price Changes</span>
            <div className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight tabular-nums mt-1.5">
              {data.summary.total_price_changes}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">vs {data.summary.compared_to}</span>
          </div>

          <div className="rounded-xl bg-white dark:bg-[#151e32] border border-slate-200/80 dark:border-[#29354b] p-4 shadow-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Regulatory Updates</span>
            <div className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight tabular-nums mt-1.5">
              {data.summary.total_regulatory_changes}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Gazette updates</span>
          </div>

          <div className="rounded-xl bg-white dark:bg-[#151e32] border border-slate-200/80 dark:border-[#29354b] p-4 shadow-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Intelligence Events</span>
            <div className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight tabular-nums mt-1.5">
              {data.summary.total_market_events}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Competitor movements</span>
          </div>

          <div className="rounded-xl bg-white dark:bg-[#151e32] border border-slate-200/80 dark:border-[#29354b] p-4 shadow-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">New Tracked Entities</span>
            <div className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight tabular-nums mt-1.5">
              {data.summary.total_new_entities}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Newly indexed entities</span>
          </div>
        </div>
      )}

      {/* Changes Detail Sections */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" /> Computing period delta...
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Price Changes List */}
          <div className="rounded-xl border border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#151e32] overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200/80 dark:border-[#29354b] bg-slate-50 dark:bg-[#10172a]">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">Competitor Price Changes</h2>
            </div>
            <div className="p-4 space-y-2.5">
              {data.price_changes.length === 0 ? (
                <p className="text-xs text-slate-400">No price changes recorded in this period.</p>
              ) : (
                data.price_changes.map((pc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-[#10172a] border border-slate-200/70 dark:border-slate-800">
                    <div>
                      <div className="font-semibold text-xs text-slate-900 dark:text-white">{pc.competitor_name} ({pc.state})</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{pc.service_name} {pc.promotion && `• ${pc.promotion}`}</div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 font-mono tabular-nums font-semibold text-xs justify-end">
                        {pc.price_diff < 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center"><ArrowDownRight className="h-3.5 w-3.5" /> ${pc.new_price.toFixed(2)}</span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400 flex items-center"><ArrowUpRight className="h-3.5 w-3.5" /> ${pc.new_price.toFixed(2)}</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono tabular-nums">Prev: ${pc.previous_price || 0}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Regulatory & Market Events */}
          <div className="rounded-xl border border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#151e32] overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200/80 dark:border-[#29354b] bg-slate-50 dark:bg-[#10172a]">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">Regulatory Updates & Market Events</h2>
            </div>
            <div className="p-4 space-y-2.5">
              {data.regulatory_changes.map((rc, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-50 dark:bg-[#10172a] border border-slate-200/70 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-white">
                    <span>[{rc.state}] {rc.rule_title}</span>
                    <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] px-2 py-0.5 rounded border border-indigo-500/20 font-medium">{rc.priority}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">{rc.new_info}</p>
                </div>
              ))}

              {data.market_events.map((me, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-50 dark:bg-[#10172a] border border-slate-200/70 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-white">
                    <span>{me.entity_name} ({me.state})</span>
                    <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] px-2 py-0.5 rounded border border-emerald-500/20 font-medium">{me.importance}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">{me.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
