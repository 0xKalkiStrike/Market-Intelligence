"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck,
  Globe,
  Layers,
  MapPin,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  UserCheck,
  Zap,
} from "lucide-react";

import { api } from "@/lib/api";

export default function CommandCenterPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stateFilter, setStateFilter] = useState("FL");

  const loadData = async () => {
    setLoading(true);
    try {
      const json = await api.get<any>(`/api/phase4/command-center?state=${stateFilter}`);
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [stateFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Phase 4 Active</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">Executive Command Center</h1>
          <p className="text-xs text-slate-400 mt-1">
            Continuous Intelligence, Multi-Horizon Forecasting, Risk Monitoring & Human Approval Governance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs font-medium text-white focus:outline-hidden focus:border-indigo-500"
          >
            <option value="FL">Florida (FL)</option>
            <option value="TX">Texas (TX)</option>
            <option value="PA">Pennsylvania (PA)</option>
            <option value="OH">Ohio (OH)</option>
          </select>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Intelligence
          </button>
        </div>
      </div>

      {/* Executive Takeaway Banner */}
      {data?.executive_takeaway && (
        <div className="rounded-xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-500/30 p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 shrink-0 mt-0.5">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-indigo-200">Grounded Intelligence Executive Summary</h2>
              <p className="text-xs text-slate-300 leading-relaxed mt-1">{data.executive_takeaway}</p>
            </div>
          </div>
        </div>
      )}

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Watchlists & Rules</span>
            <Eye className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {data?.market_status?.active_watchlists_count || 0} / {data?.market_status?.active_rules_count || 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Active watchlists & rules</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Capacity Utilization</span>
            <UserCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {data?.capacity_and_demand?.overall_utilization_rate || 0}%
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Status: <span className="text-emerald-400 font-medium">{data?.capacity_and_demand?.demand_capacity_status || "NORMAL"}</span>
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Risk & Early Warnings</span>
            <ShieldAlert className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {data?.risk_signals?.length || 0} Signals
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {data?.early_warning_signals?.length || 0} Correlated Early Warnings
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Pending Human Reviews</span>
            <FileCheck className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {data?.market_status?.pending_management_reviews_count || 0} Items
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Requiring management approval</p>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Multi-Horizon Forecasts */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">Multi-Horizon Mathematical Forecasts</h3>
              </div>
              <span className="text-[11px] font-medium text-slate-400">Surface-Web Grounded Engine</span>
            </div>
            <div className="space-y-3">
              {data?.recent_forecasts?.map((fc: any) => (
                <div key={fc.id} className="p-3.5 rounded-lg border border-slate-800/80 bg-slate-950/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-indigo-300">{fc.metric_name}</span>
                      <span className="ml-2 text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                        {fc.horizon_days} Days Horizon
                      </span>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      fc.confidence === "HIGH" ? "bg-emerald-950 text-emerald-300 border border-emerald-800/50" : "bg-amber-950 text-amber-300 border border-amber-800/50"
                    }`}>
                      {fc.confidence} Confidence
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <div className="text-lg font-bold text-white">
                      {typeof fc.forecast_value === "number" ? fc.forecast_value.toLocaleString() : fc.forecast_value}
                    </div>
                    <div className="text-xs text-slate-400">
                      Expected Range: <span className="text-slate-200 font-mono">{fc.expected_range_min?.toLocaleString()} - {fc.expected_range_max?.toLocaleString()}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">{fc.explanation}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Signals & Early Warnings */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">Early Warnings & Risk Intelligence</h3>
              </div>
            </div>
            <div className="space-y-3">
              {data?.early_warning_signals?.map((ew: any) => (
                <div key={ew.id} className="p-3.5 rounded-lg border border-amber-500/20 bg-amber-950/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-300">{ew.signal_title}</span>
                    <span className="text-[10px] bg-amber-900/40 text-amber-200 px-2 py-0.5 rounded border border-amber-700/50 font-medium">
                      {ew.confidence} Confidence
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1.5">{ew.interpretation}</p>
                  <div className="mt-2.5 pt-2 border-t border-amber-900/30 flex items-start gap-2 text-[11px] text-amber-200">
                    <span className="font-semibold shrink-0">Recommended Review:</span>
                    <span>{ew.recommended_review_step}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Column */}
        <div className="space-y-6">
          {/* Pending Management Reviews */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-white">Management Review Queue</h3>
              </div>
            </div>
            <div className="space-y-3">
              {data?.management_review_queue?.map((item: any) => (
                <div key={item.id} className="p-3 rounded-lg border border-slate-800 bg-slate-950/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">{item.title}</span>
                    <span className="text-[10px] bg-purple-950 text-purple-300 px-2 py-0.5 rounded font-mono">
                      {item.item_type}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{item.evidence}</p>
                  <div className="mt-2 text-[10px] text-indigo-300 bg-indigo-950/50 p-2 rounded border border-indigo-900/50">
                    <strong>Suggested Review:</strong> {item.suggested_review_step}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Competitor Movement Score */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">Competitor Movement Scores</h3>
              </div>
            </div>
            <div className="space-y-3">
              {data?.competitor_movements?.map((cm: any) => (
                <div key={cm.id || cm.competitor_name} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800/70 bg-slate-950/40 text-xs">
                  <div>
                    <div className="font-semibold text-white">{cm.competitor_name}</div>
                    <div className="text-[10px] text-slate-400">
                      {cm.price_changes_count} price cuts • {cm.locations_added_count} new locs
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-indigo-300">{cm.activity_score}</span>
                    <div className={`text-[10px] font-medium ${cm.momentum === "INCREASING" ? "text-amber-400" : "text-slate-400"}`}>
                      {cm.momentum}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
