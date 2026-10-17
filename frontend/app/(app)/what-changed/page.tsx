"use client";

import { useEffect, useState } from "react";
import { TrendingUp, RefreshCw, Filter, Calendar, Zap, AlertTriangle, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
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
      <div className="border-b border-slate-800 pb-5">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-950/80 px-3 py-0.5 text-xs font-bold text-emerald-300 border border-emerald-800/50 mb-1">
          PERIOD-OVER-PERIOD COMPARISON ENGINE
        </div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2 sm:text-3xl">
          <TrendingUp className="h-7 w-7 text-emerald-400" /> &ldquo;What Changed?&rdquo; Engine
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Compare market conditions across customizable timeframes (Today vs Yesterday, This Week vs Last Week, Month vs Month, Year vs Year) to detect additions, removals, price shifts, and regulatory updates.
        </p>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-emerald-400" /> Compare Period:
          </span>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-200 focus:border-emerald-500 focus:outline-none"
          >
            <option value="today">Today vs Yesterday</option>
            <option value="this_week">This Week vs Last Week</option>
            <option value="this_month">This Month vs Last Month</option>
            <option value="this_quarter">This Quarter vs Last Quarter</option>
            <option value="this_year">This Year vs Last Year</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">State Filter:</span>
          <input
            type="text"
            placeholder="e.g. FL, TX, CA"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none w-32 font-bold"
          />
          <Button size="sm" variant="secondary" onClick={fetchChanges}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border border-slate-800">
            <CardBody className="p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Price Changes</span>
              <div className="text-2xl font-extrabold text-amber-400 mt-1">{data.summary.total_price_changes}</div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Compared to {data.summary.compared_to}</span>
            </CardBody>
          </Card>

          <Card className="bg-slate-900 border border-slate-800">
            <CardBody className="p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Regulatory Rule Updates</span>
              <div className="text-2xl font-extrabold text-indigo-400 mt-1">{data.summary.total_regulatory_changes}</div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">State gazette notifications</span>
            </CardBody>
          </Card>

          <Card className="bg-slate-900 border border-slate-800">
            <CardBody className="p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Intelligence Events</span>
              <div className="text-2xl font-extrabold text-emerald-400 mt-1">{data.summary.total_market_events}</div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Competitor movements & signals</span>
            </CardBody>
          </Card>

          <Card className="bg-slate-900 border border-slate-800">
            <CardBody className="p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">New Tracked Entities</span>
              <div className="text-2xl font-extrabold text-blue-400 mt-1">{data.summary.total_new_entities}</div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Newly added surface web entities</span>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Changes Detail Tabs / Sections */}
      {loading ? (
        <div className="py-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-emerald-400" /> Computing period-over-period market delta...
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Price Changes List */}
          <Card className="border border-slate-800 bg-slate-900">
            <CardHeader className="border-b border-slate-800 bg-slate-950/60">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Competitor Price Changes</h2>
            </CardHeader>
            <CardBody className="p-4 space-y-3">
              {data.price_changes.length === 0 ? (
                <p className="text-xs text-slate-500">No price changes recorded in this period.</p>
              ) : (
                data.price_changes.map((pc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div>
                      <div className="font-bold text-xs text-white">{pc.competitor_name} ({pc.state})</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{pc.service_name} {pc.promotion && `• ${pc.promotion}`}</div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 font-mono font-bold text-xs">
                        {pc.price_diff < 0 ? (
                          <span className="text-emerald-400 flex items-center"><ArrowDownRight className="h-3.5 w-3.5" /> ${pc.new_price.toFixed(2)}</span>
                        ) : (
                          <span className="text-rose-400 flex items-center"><ArrowUpRight className="h-3.5 w-3.5" /> ${pc.new_price.toFixed(2)}</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">Prev: ${pc.previous_price || 0}</span>
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          {/* Regulatory & Market Events */}
          <Card className="border border-slate-800 bg-slate-900">
            <CardHeader className="border-b border-slate-800 bg-slate-950/60">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Regulatory Updates & Market Events</h2>
            </CardHeader>
            <CardBody className="p-4 space-y-3">
              {data.regulatory_changes.map((rc, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-300">
                    <span>[{rc.state}] {rc.rule_title}</span>
                    <span className="bg-indigo-950 text-indigo-300 text-[10px] px-2 py-0.5 rounded border border-indigo-800">{rc.priority}</span>
                  </div>
                  <p className="text-[11px] text-slate-300">{rc.new_info}</p>
                </div>
              ))}

              {data.market_events.map((me, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                    <span>{me.entity_name} ({me.state})</span>
                    <span className="bg-emerald-950 text-emerald-300 text-[10px] px-2 py-0.5 rounded border border-emerald-800">{me.importance}</span>
                  </div>
                  <p className="text-[11px] text-slate-300">{me.description}</p>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
