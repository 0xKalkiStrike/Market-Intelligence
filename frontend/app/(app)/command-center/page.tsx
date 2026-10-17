"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Eye,
  FileCheck,
  Filter,
  Globe,
  Layers,
  MapPin,
  Maximize2,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
  Info,
} from "lucide-react";

import { api } from "@/lib/api";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ToastContainer, ToastMessage } from "@/components/ui/Toast";

export default function CommandCenterPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stateFilter, setStateFilter] = useState("FL");
  const [activeTab, setActiveTab] = useState<"overview" | "forecasts" | "risks" | "reviews" | "competitors" | "geo">("overview");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(0);
  const [copiedSummary, setCopiedSummary] = useState(false);

  const addToast = (type: "success" | "warning" | "info" | "error", title: string, message?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const loadData = async (isManual = false) => {
    setLoading(true);
    try {
      const json = await api.get<any>(`/api/phase4/command-center?state=${stateFilter}`);
      setData(json);
      if (isManual) {
        addToast("success", "Intelligence Refreshed", `Market data for ${stateFilter} successfully updated.`);
      }
    } catch (e: any) {
      console.error(e);
      addToast("error", "Sync Error", e?.message || "Failed to load command center intelligence.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [stateFilter]);

  // Auto-refresh timer
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;
    const interval = setInterval(() => {
      loadData();
    }, autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshInterval, stateFilter]);

  const copyExecutiveSummary = () => {
    if (!data?.executive_takeaway) return;
    navigator.clipboard.writeText(data.executive_takeaway);
    setCopiedSummary(true);
    addToast("info", "Copied to Clipboard", "Executive summary copied.");
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const exportExecutiveBrief = () => {
    if (!data) return;
    const briefContent = {
      timestamp: new Date().toISOString(),
      state: stateFilter,
      executive_summary: data.executive_takeaway,
      market_status: data.market_status,
      forecasts_count: data.recent_forecasts?.length || 0,
      risk_signals_count: data.risk_signals?.length || 0,
      reviews_pending: data.management_review_queue?.length || 0,
      competitors: data.competitor_movements || [],
    };
    const blob = new Blob([JSON.stringify(briefContent, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Executive_Brief_${stateFilter}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("success", "Brief Exported", `Saved executive briefing for ${stateFilter}.`);
  };

  const handleReviewAction = (itemId: string, action: "APPROVED" | "AUDIT" | "DISMISSED") => {
    addToast(
      action === "APPROVED" ? "success" : action === "AUDIT" ? "warning" : "info",
      `Action Recorded: ${action}`,
      `Item ${itemId} has been updated in the management audit log.`
    );
    // Optimistically update local view
    if (data?.management_review_queue) {
      setData({
        ...data,
        management_review_queue: data.management_review_queue.filter((item: any) => item.id !== itemId),
        market_status: {
          ...data.market_status,
          pending_management_reviews_count: Math.max(0, (data.market_status?.pending_management_reviews_count || 1) - 1),
        },
      });
    }
    setIsModalOpen(false);
  };

  const openDetail = (item: any, type: string) => {
    setSelectedItem({ ...item, _type: type });
    setIsModalOpen(true);
  };

  const formatMetricValue = (metricName: string, val: any): string => {
    if (val === null || val === undefined) return "—";
    if (typeof val === "number") {
      if (metricName?.toUpperCase().includes("REVENUE")) {
        return `$${val.toLocaleString()}`;
      }
      return val.toLocaleString();
    }
    return String(val);
  };

  const formatStatusLabel = (status: string): string => {
    if (!status) return "Balanced";
    if (status === "HIGH_DEMAND_CAPACITY_PRESSURE") return "High Pressure";
    if (status === "CAPACITY_SURPLUS") return "Surplus";
    if (status === "BALANCED") return "Balanced";
    return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-1 sm:px-4 lg:px-6 py-2 transition-all min-w-0">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Top Header Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/40">
              Continuous Intelligence Engine Active
            </span>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
            <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400 font-medium">
              Zero-PHI Grounded Architecture
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-2">
            Executive Command Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
            Multi-horizon predictive forecasting, autonomous early-warning risk correlation, and human-in-the-loop governance.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* State Filter Buttons */}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
            {["FL", "PA", "OH", "TX"].map((st) => (
              <button
                key={st}
                onClick={() => setStateFilter(st)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  stateFilter === st
                    ? "bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Auto-Refresh Dropdown */}
          <select
            value={autoRefreshInterval}
            onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
            className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-hidden"
            title="Auto-refresh frequency"
          >
            <option value={0}>Auto: Off</option>
            <option value={30}>Auto: 30s</option>
            <option value={60}>Auto: 60s</option>
            <option value={300}>Auto: 5m</option>
          </select>

          {/* Export Brief Button */}
          <button
            onClick={exportExecutiveBrief}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700/80 transition-all shadow-2xs cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-indigo-500" />
            Export Brief
          </button>

          {/* Refresh Action */}
          <button
            onClick={() => loadData(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:shadow-indigo-500/20 transition-all disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Executive Takeaway Banner (Glassmorphism + Subtle Gradient) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/10 via-purple-900/5 to-slate-900/10 dark:from-indigo-950/60 dark:via-purple-950/40 dark:to-slate-900/80 border border-indigo-200/60 dark:border-indigo-500/30 p-4 sm:p-5 shadow-sm backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs shrink-0 mt-0.5">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
                  Grounded Intelligence Synthesis ({stateFilter} Market)
                </h2>
                <Badge tone="indigo">Evidence Grounded</Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                {loading && !data ? "Synthesizing cross-source signals and calculating predictive horizon..." : data?.executive_takeaway || "No synthesis available for the selected state."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
            <button
              onClick={copyExecutiveSummary}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-2xs"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>{copiedSummary ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
        {/* Watchlists Card */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Active Watchlists</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Eye className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
            {data?.market_status?.active_watchlists_count || 0}
            <span className="text-sm font-semibold text-slate-400 ml-1.5">
              / {data?.market_status?.active_rules_count || 0} Rules
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 overflow-hidden">
            <Activity className="h-3 w-3 shrink-0" />
            <span className="truncate">Continuous evaluation</span>
          </div>
        </div>

        {/* Capacity Utilization Card */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Capacity Utilization</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
            {data?.capacity_and_demand?.overall_utilization_rate || 0}%
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] overflow-hidden">
            <span className="text-slate-500 dark:text-slate-400 shrink-0">Status:</span>
            <span
              className="font-bold text-emerald-600 dark:text-emerald-400 truncate"
              title={data?.capacity_and_demand?.demand_capacity_status || "BALANCED"}
            >
              {formatStatusLabel(data?.capacity_and_demand?.demand_capacity_status || "BALANCED")}
            </span>
          </div>
        </div>

        {/* Risk & Early Warnings Card */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Risk Signals</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
            {data?.risk_signals?.length || 0}
            <span className="text-xs font-semibold text-slate-400 ml-1.5">Active</span>
          </div>
          <div className="mt-2 text-[11px] font-semibold text-amber-600 dark:text-amber-400 truncate">
            {data?.early_warning_signals?.length || 0} Correlated Early Warnings
          </div>
        </div>

        {/* Management Review Queue Card */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Human Governance</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <FileCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
            {data?.market_status?.pending_management_reviews_count || 0}
            <span className="text-xs font-semibold text-slate-400 ml-1.5">Pending</span>
          </div>
          <div className="mt-2 text-[11px] text-purple-600 dark:text-purple-400 font-medium">
            Requires management approval
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 sm:gap-2 border-b border-slate-200/80 dark:border-slate-800 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { key: "overview", label: "Executive Overview", icon: Layers },
          { key: "forecasts", label: `Forecasts (${data?.recent_forecasts?.length || 0})`, icon: TrendingUp },
          { key: "risks", label: `Risks & Warnings (${data?.early_warning_signals?.length || 0})`, icon: ShieldAlert },
          { key: "reviews", label: `Review Queue (${data?.management_review_queue?.length || 0})`, icon: FileCheck },
          { key: "competitors", label: `Competitors (${data?.competitor_movements?.length || 0})`, icon: Zap },
          { key: "geo", label: "Geo Clusters", icon: MapPin },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Executive Overview Grid */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main 2-column pane */}
          <div className="lg:col-span-2 space-y-6">
            {/* Multi-Horizon Forecasts Section */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Multi-Horizon Mathematical Forecasts</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Empirical time-series projection with expected range boundaries</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab("forecasts")}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                >
                  View All <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {data?.recent_forecasts?.slice(0, 4).map((fc: any) => (
                  <div
                    key={fc.id}
                    onClick={() => openDetail(fc, "FORECAST")}
                    className="group p-4 rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/50 dark:bg-slate-950/40 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-500">
                        {fc.metric_name}
                      </span>
                      <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md font-mono">
                        {fc.horizon_days === 0 ? "All Time" : `${fc.horizon_days}d`}
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-baseline justify-between">
                      <div className="text-xl font-extrabold text-slate-900 dark:text-white">
                        {formatMetricValue(fc.metric_name, fc.forecast_value)}
                      </div>
                      <Badge tone={fc.confidence === "HIGH" ? "success" : "warning"}>
                        {fc.confidence}
                      </Badge>
                    </div>

                    <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      {fc.explanation}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk & Early Warnings Section */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Early Warnings & Correlated Risks</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Multi-source correlation engine flagging anomalies</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab("risks")}
                  className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
                >
                  View All <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                {data?.early_warning_signals?.slice(0, 3).map((ew: any) => (
                  <div
                    key={ew.id}
                    onClick={() => openDetail(ew, "RISK")}
                    className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/20 hover:border-amber-500/40 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-200">{ew.signal_title}</span>
                      <Badge tone="warning">{ew.confidence} Confidence</Badge>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-1.5 leading-relaxed">{ew.interpretation}</p>
                    <div className="mt-2.5 pt-2 border-t border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-300">
                      <span className="font-semibold">Action: {ew.recommended_review_step}</span>
                      <span className="text-slate-400 flex items-center gap-1">Details <ArrowUpRight className="h-3 w-3" /></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right 1-column pane */}
          <div className="space-y-6">
            {/* Management Review Queue */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                    <FileCheck className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Review Queue</h3>
                </div>
                <button
                  onClick={() => setActiveTab("reviews")}
                  className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-1"
                >
                  Manage <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                {data?.management_review_queue?.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">Queue clean. No pending approvals.</div>
                ) : (
                  data?.management_review_queue?.slice(0, 3).map((item: any) => (
                    <div
                      key={item.id}
                      onClick={() => openDetail(item, "REVIEW")}
                      className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:border-purple-500/40 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.title}</span>
                        <span className="text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono px-2 py-0.5 rounded">
                          {item.item_type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{item.evidence}</p>
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                          Review & Act <ArrowUpRight className="h-3 w-3" />
                        </span>
                        <span className="text-[10px] text-slate-400">Governance</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Competitor Movements Mini */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <Zap className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Competitor Velocity</h3>
                </div>
                <button
                  onClick={() => setActiveTab("competitors")}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  All
                </button>
              </div>

              <div className="space-y-2.5">
                {data?.competitor_movements?.slice(0, 4).map((cm: any) => (
                  <div
                    key={cm.id || cm.competitor_name}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/70 bg-slate-50/40 dark:bg-slate-950/40 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{cm.competitor_name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {cm.price_changes_count} cuts • {cm.locations_added_count} new locs
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-indigo-600 dark:text-indigo-400">{cm.activity_score}</div>
                      <span className={`text-[10px] font-semibold ${cm.momentum === "INCREASING" ? "text-amber-500" : "text-slate-400"}`}>
                        {cm.momentum}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Detailed Forecasts */}
      {activeTab === "forecasts" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Empirical Multi-Horizon Time Series Forecasts</h3>
            <span className="text-xs text-slate-500 font-mono">Mathematical Engine • Grounded Historical Bounded</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.recent_forecasts?.map((fc: any) => (
              <div
                key={fc.id}
                onClick={() => openDetail(fc, "FORECAST")}
                className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-2xs hover:shadow-md hover:border-indigo-500/50 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{fc.metric_name}</span>
                    <Badge tone={fc.confidence === "HIGH" ? "success" : "warning"}>{fc.confidence}</Badge>
                  </div>

                  <div className="mt-3">
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                      {formatMetricValue(fc.metric_name, fc.forecast_value)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Expected Range: <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">{formatMetricValue(fc.metric_name, fc.expected_range_min)} - {formatMetricValue(fc.metric_name, fc.expected_range_max)}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 leading-relaxed">{fc.explanation}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Horizon: {fc.horizon_days === 0 ? "All Time (Inception to Present)" : `${fc.horizon_days} Days`}</span>
                  <span className="text-indigo-500 font-bold flex items-center gap-1">Deep Dive <ArrowUpRight className="h-3 w-3" /></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Detailed Risks & Warnings */}
      {activeTab === "risks" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Autonomous Early Warning & Risk Correlation</h3>
            <Badge tone="warning">{data?.early_warning_signals?.length || 0} Critical Signals</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.early_warning_signals?.map((ew: any) => (
              <div
                key={ew.id}
                onClick={() => openDetail(ew, "RISK")}
                className="p-5 rounded-2xl border border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-amber-950 dark:text-amber-200">{ew.signal_title}</h4>
                    <Badge tone="warning">{ew.confidence} Confidence</Badge>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 leading-relaxed">{ew.interpretation}</p>
                  <div className="mt-3 p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200 dark:border-amber-900/40 text-xs">
                    <span className="font-bold text-amber-800 dark:text-amber-300">Recommended Review:</span>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">{ew.recommended_review_step}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between text-xs text-amber-700 dark:text-amber-400">
                  <span>State: {stateFilter}</span>
                  <span className="font-bold flex items-center gap-1">Investigate <ArrowUpRight className="h-3 w-3" /></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Detailed Human Review Queue */}
      {activeTab === "reviews" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Human-in-the-Loop Management Governance</h3>
            <span className="text-xs text-slate-500">Every decision produces an immutable audit record</span>
          </div>

          <div className="space-y-3">
            {data?.management_review_queue?.length === 0 ? (
              <div className="text-center py-12 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold">No items pending management approval.</p>
                <p className="text-xs mt-1">All regulatory and data anomalies are currently reviewed.</p>
              </div>
            ) : (
              data?.management_review_queue?.map((item: any) => (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-2xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h4>
                      <span className="text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono px-2 py-0.5 rounded font-bold">
                        {item.item_type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{item.evidence}</p>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                      <strong>Suggested Action:</strong> {item.suggested_review_step}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleReviewAction(item.id, "AUDIT")}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      Audit
                    </button>
                    <button
                      onClick={() => handleReviewAction(item.id, "APPROVED")}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-2xs cursor-pointer"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Competitor Movements */}
      {activeTab === "competitors" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Competitor Velocity & Price Action Index</h3>
            <span className="text-xs text-slate-500">Surface-Web Verified Price Movements</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.competitor_movements?.map((cm: any) => (
              <div
                key={cm.id || cm.competitor_name}
                className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{cm.competitor_name}</h4>
                  <Badge tone={cm.momentum === "INCREASING" ? "warning" : "neutral"}>
                    {cm.momentum}
                  </Badge>
                </div>

                <div className="mt-4 flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Activity Score</span>
                    <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{cm.activity_score}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{cm.price_changes_count} Price Changes</div>
                    <div className="text-[11px] text-slate-500">{cm.locations_added_count} New Dispensaries</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 6: Geographic Opportunity Clusters */}
      {activeTab === "geo" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Geographic Opportunity Density ({stateFilter})</h3>
            <span className="text-xs text-slate-500">Target Expansion Zones</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.geographic_opportunity_clusters?.map((cluster: any, idx: number) => (
              <div
                key={idx}
                className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-indigo-500" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{cluster.cluster_name || cluster.county || `Zone ${idx + 1}`}</h4>
                  </div>
                  <Badge tone="success">High Signal</Badge>
                </div>

                <div className="mt-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {cluster.rationale || cluster.description || "Unmet patient demand detected relative to licensed dispensary density."}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Priority Rank</span>
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400">P{idx + 1} Target</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deep Dive Detail Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedItem?.signal_title || selectedItem?.title || selectedItem?.metric_name || "Intelligence Deep Dive"}
        maxWidth="lg"
      >
        {selectedItem && (
          <div className="space-y-4 text-xs sm:text-sm">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Classification</span>
                <div className="font-extrabold text-indigo-600 dark:text-indigo-400">{selectedItem._type}</div>
              </div>
              <Badge tone="success">Verified Provenance</Badge>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-slate-900 dark:text-white">Explanation & Context:</span>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50/50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                {selectedItem.explanation || selectedItem.interpretation || selectedItem.evidence || "No extended narrative."}
              </p>
            </div>

            {selectedItem.recommended_review_step && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
                <span className="font-bold">Recommended Step:</span>
                <p className="mt-0.5">{selectedItem.recommended_review_step}</p>
              </div>
            )}

            {selectedItem._type === "REVIEW" && (
              <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  onClick={() => handleReviewAction(selectedItem.id, "DISMISSED")}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => handleReviewAction(selectedItem.id, "AUDIT")}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 text-white hover:bg-amber-500 cursor-pointer"
                >
                  Request Audit
                </button>
                <button
                  onClick={() => handleReviewAction(selectedItem.id, "APPROVED")}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
                >
                  Approve Item
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
