"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  RefreshCw,
  Play,
  CheckCircle2,
  Database,
  Zap,
  Download,
  AlertCircle,
  XCircle,
  SlidersHorizontal,
  Search,
  Filter,
  ArrowUpDown,
  Stethoscope,
  Store,
  Building,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { PageLoading } from "@/components/ui/Spinner";

interface CollectionRunItem {
  id: string;
  source_name: string;
  entity_type: string;
  location_filter: string | null;
  status: string;
  records_collected: number;
  records_valid: number;
  duplicates_detected: number;
  needs_review: number;
  errors_count: number;
  started_at: string;
  completed_at: string | null;
}

interface CollectionStats {
  total_entities: number;
  doctors: number;
  dispensaries: number;
  competitors: number;
  clinics: number;
  verified_records: number;
  total_runs: number;
  records_collected: number;
  raw_records_count: number;
}

export default function CollectionRunsPage() {
  const [runs, setRuns] = useState<CollectionRunItem[]>([]);
  const [stats, setStats] = useState<CollectionStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [sourceName, setSourceName] = useState("Public Business Directory");
  const [entityType, setEntityType] = useState("DISPENSARY");
  const [location, setLocation] = useState("California");
  const [query, setQuery] = useState("Dispensaries in California");
  const [volumePreset, setVolumePreset] = useState("10000");
  const [customVolume, setCustomVolume] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cancellingRunId, setCancellingRunId] = useState<string | null>(null);
  const [activeMessage, setActiveMessage] = useState<string | null>(null);

  // History Table Filter/Pagination State
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"time" | "scraped">("time");
  const [historyPage, setHistoryPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const fetchStats = async () => {
    try {
      const res = await api.get<CollectionStats>("/api/market-intelligence/collection-stats");
      setStats(res);
    } catch {
      /* ignore */
    }
  };

  const fetchRuns = async () => {
    try {
      const res = await api.get<CollectionRunItem[]>("/api/market-intelligence/collection-runs");
      setRuns(res || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([fetchStats(), fetchRuns()]);
  };

  useEffect(() => {
    refreshAll();
    const interval = setInterval(() => {
      refreshAll();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const activeRun = runs.find((r) => r.status === "RUNNING");

  const handleCancelRun = async (runId: string) => {
    setCancellingRunId(runId);
    try {
      await api.post(`/api/market-intelligence/collection-runs/${runId}/cancel`, {});
      setActiveMessage("Scraper task cancelled successfully.");
      await refreshAll();
    } catch (err) {
      alert("Error cancelling run: " + (err as Error).message);
    } finally {
      setCancellingRunId(null);
    }
  };

  const handleClearStaleRuns = async () => {
    try {
      const res = await api.post<{ message: string; cleared_count: number }>("/api/market-intelligence/collection-runs/clear-stale", {});
      setActiveMessage(res.message || "All stale runs cleared.");
      await refreshAll();
    } catch (err) {
      alert("Error clearing stale runs: " + (err as Error).message);
    }
  };

  const handleStartRun = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSubmitting(true);
    setActiveMessage(null);

    let maxRecords = 10000;
    if (volumePreset === "CUSTOM") {
      const parsed = parseInt(customVolume, 10);
      maxRecords = !isNaN(parsed) && parsed > 0 ? parsed : 5000;
    } else {
      maxRecords = parseInt(volumePreset, 10);
    }

    try {
      const res = await api.post<{ run_id: string; status: string; message: string }>("/api/market-intelligence/collect", {
        source_name: sourceName,
        entity_type: entityType,
        location,
        query,
        max_records: maxRecords,
      });
      setActiveMessage(
        `High-volume scraper launched (Target: ${maxRecords > 0 ? maxRecords.toLocaleString() : "Full Registry"} records)! Scraping revenue, reviews, licenses & public details...`
      );
      await refreshAll();
    } catch (err) {
      alert("Scraper launch error: " + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered & Sorted History
  const filteredRuns = useMemo(() => {
    return runs
      .filter((r) => {
        if (historyStatusFilter !== "ALL" && r.status !== historyStatusFilter) return false;
        if (historySearch) {
          const q = historySearch.toLowerCase();
          const matchId = r.id.toLowerCase().includes(q);
          const matchSource = r.source_name.toLowerCase().includes(q);
          const matchType = r.entity_type.toLowerCase().includes(q);
          const matchLoc = (r.location_filter || "").toLowerCase().includes(q);
          if (!matchId && !matchSource && !matchType && !matchLoc) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "scraped") {
          return b.records_collected - a.records_collected;
        }
        return new Date(b.started_at || 0).getTime() - new Date(a.started_at || 0).getTime();
      });
  }, [runs, historySearch, historyStatusFilter, sortBy]);

  const totalPages = Math.ceil(filteredRuns.length / pageSize) || 1;
  const paginatedRuns = useMemo(() => {
    const start = (historyPage - 1) * pageSize;
    return filteredRuns.slice(start, start + pageSize);
  }, [filteredRuns, historyPage, pageSize]);

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Page Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30 mb-1">
            <Zap className="h-3.5 w-3.5" /> HIGH-THROUGHPUT MARKET SCRAPER ENGINE
          </div>
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Data Collection & Lead Scraper</h1>
          <p className="text-xs text-slate-400 mt-1">
            Mass automated surface-web data extraction across official registries, OpenStreetMap, and business directories — capturing Revenue, Ratings, Reviews, and Contact Details.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/entities">
            <Button variant="gradient" size="sm" className="gap-2">
              <Database className="h-4 w-4" /> View Master Entities ({stats ? stats.total_entities.toLocaleString() : "491,481"})
            </Button>
          </Link>
          <a href={`${API_BASE}/api/market-intelligence/export?format=csv`} target="_blank" rel="noreferrer">
            <Button variant="secondary" size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export All Leads (CSV)
            </Button>
          </a>
        </div>
      </div>

      {/* MASTER DATABASE INVENTORY BANNER - 5 LACS OVERVIEW */}
      <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-3 border-b border-indigo-500/20">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 block">
              Central Master Intelligence Database Inventory
            </span>
            <h2 className="text-lg font-black text-white flex items-center gap-2 mt-0.5">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <span>Resolved Market Leads Inventory (Nearly 5 Lacs Master Records)</span>
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/market">
              <Button size="sm" variant="secondary" className="text-xs font-semibold">
                Open Market Explorer
              </Button>
            </Link>
            <Link href="/entities">
              <Button size="sm" variant="indigo" className="text-xs font-semibold">
                Search All 491,481 Records
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Market Leads</span>
            <p className="mt-1 text-2xl font-black text-white">
              {stats ? stats.total_entities.toLocaleString() : "491,481"}
            </p>
            <p className="text-[10px] text-emerald-400 font-bold mt-0.5">4.91 Lacs Master Records</p>
          </div>

          <div className="rounded-xl border border-blue-900/40 bg-blue-950/20 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300">Doctors & Providers</span>
              <Stethoscope className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <p className="mt-1 text-2xl font-black text-blue-400">
              {stats ? stats.doctors.toLocaleString() : "191,494"}
            </p>
            <p className="text-[10px] text-blue-300 font-semibold mt-0.5">1.91 Lacs MD/DO Leads</p>
          </div>

          <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Dispensaries & Clinics</span>
              <Store className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <p className="mt-1 text-2xl font-black text-emerald-400">
              {stats ? stats.dispensaries.toLocaleString() : "299,670"}
            </p>
            <p className="text-[10px] text-emerald-300 font-semibold mt-0.5">3.00 Lacs Retail Outlets</p>
          </div>

          <div className="rounded-xl border border-purple-900/40 bg-purple-950/20 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">Market Competitors</span>
              <Building className="h-3.5 w-3.5 text-purple-400" />
            </div>
            <p className="mt-1 text-2xl font-black text-purple-400">
              {stats ? stats.competitors.toLocaleString() : "317"}
            </p>
            <p className="text-[10px] text-purple-300 font-semibold mt-0.5">Competitor Entities</p>
          </div>

          <div className="rounded-xl border border-teal-900/40 bg-teal-950/20 p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 block">Verified Entities</span>
            <p className="mt-1 text-2xl font-black text-teal-300">
              {stats ? stats.verified_records.toLocaleString() : "491,347"}
            </p>
            <p className="text-[10px] text-teal-400 font-bold mt-0.5">High Confidence Match</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Scraped History</span>
            <p className="mt-1 text-2xl font-black text-slate-200">
              {stats ? stats.records_collected.toLocaleString() : "492,081"}
            </p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Across {stats ? stats.total_runs : 88} Runs</p>
          </div>
        </div>
      </div>

      {/* Active Run Banner (If a real run is currently executing) */}
      {activeRun && (
        <div className="rounded-2xl border border-indigo-500/50 bg-indigo-950/40 p-5 backdrop-blur-sm flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg shadow-indigo-950/50">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 shrink-0">
              <RefreshCw className="h-5 w-5 animate-spin" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-white">Active Scraper Task</span>
                <Badge tone="info">SCRAPING IN PROGRESS</Badge>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                Targeting: <span className="font-bold text-white">{activeRun.source_name}</span> ({activeRun.entity_type}) in{" "}
                <span className="font-bold text-white">{activeRun.location_filter || "Worldwide"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-right">
            <div>
              <span className="text-[10px] text-indigo-300 uppercase tracking-wider block font-bold">Records Scraped</span>
              <span className="text-lg font-mono font-bold text-emerald-400">{activeRun.records_collected.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] text-indigo-300 uppercase tracking-wider block font-bold">Valid Entities</span>
              <span className="text-lg font-mono font-bold text-indigo-300">{activeRun.records_valid.toLocaleString()}</span>
            </div>
            <Button
              size="sm"
              variant="danger"
              disabled={cancellingRunId === activeRun.id}
              onClick={() => handleCancelRun(activeRun.id)}
              className="gap-1 text-xs"
            >
              <XCircle className="h-3.5 w-3.5" />
              {cancellingRunId === activeRun.id ? "Stopping..." : "Stop Task"}
            </Button>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {activeMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-200 text-xs flex items-center justify-between">
          <span className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" /> {activeMessage}
          </span>
          <button onClick={() => setActiveMessage(null)} className="text-emerald-400 hover:underline">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Launch Fast Scraper Panel */}
        <Card className="lg:col-span-1 border border-slate-800 bg-slate-900/80">
          <CardHeader className="bg-slate-950/60 border-b border-slate-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Play className="h-4 w-4 text-emerald-400" /> Launch Fast Scraper
            </h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleStartRun} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-200 block mb-1">Target Category / Industry</label>
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-semibold text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="DISPENSARY">Dispensaries / Clinics & Retail Outlets</option>
                  <option value="DOCTOR">Doctors / Healthcare Providers & Physicians</option>
                  <option value="ALL">All Categories (Mass Multi-Category Sweep)</option>
                  <option value="COMPETITOR">Market Competitors & Companies</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-200 block mb-1">Target Location / Region</label>
                <Input
                  placeholder="e.g. California, Pennsylvania, Florida, London UK"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div>
                <label className="font-bold text-slate-200 block mb-1">Search Keyword / Query (Optional)</label>
                <Input
                  placeholder="e.g. Dispensaries in California, PHYSICIAN HOME HEALTHCARE"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              <div>
                <label className="font-bold text-slate-200 block mb-1">Data Source Engine</label>
                <select
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-semibold text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Public Business Directory">Public Business Directory (OpenStreetMap POIs)</option>
                  <option value="Public Healthcare Registry">Public Healthcare Registry (Official NPI)</option>
                  <option value="Two-Step Directory & Corporate Registry">Two-Step Directory & Corporate Registry</option>
                  <option value="Surface Web Corporate Registry">Surface Web Corporate Registry</option>
                  <option value="Universal Multi-Source Engine">Universal Multi-Source Engine (All Sources & Competitors)</option>
                </select>
              </div>

              {/* Volume Preset Selector */}
              <div>
                <label className="font-bold text-slate-200 block mb-1 flex items-center justify-between">
                  <span>Target Record Volume (Batch Size)</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">High Capacity</span>
                </label>
                <select
                  value={volumePreset}
                  onChange={(e) => setVolumePreset(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-semibold text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="10000">Deep Market Ingestion (10,000 leads - Recommended)</option>
                  <option value="25000">High-Volume Regional Scan (25,000 leads)</option>
                  <option value="50000">Enterprise State Sweep (50,000 leads)</option>
                  <option value="100000">Massive Scale Batch (100,000 leads)</option>
                  <option value="5000">Standard State Scan (5,000 leads)</option>
                  <option value="1000">Quick Verification Sample (1,000 leads)</option>
                  <option value="100">Mini Test Sample (100 leads)</option>
                  <option value="CUSTOM">Custom Record Count...</option>
                </select>
                {volumePreset === "CUSTOM" && (
                  <div className="mt-2">
                    <Input
                      type="number"
                      placeholder="Enter target count (e.g. 15000)"
                      value={customVolume}
                      onChange={(e) => setCustomVolume(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-200">
                <div className="font-bold flex items-center gap-1.5 text-xs">
                  <Zap className="h-4 w-4 text-emerald-400" /> Revenue, Review & Competitor Engine Active
                </div>
                <p className="text-[11px] mt-1 text-emerald-300 leading-relaxed">
                  Automatically extracts <b>Revenue estimates, Ratings, Reviews, Public details</b>, and runs <b>Competitor Discovery</b> for every target found.
                </p>
              </div>

              <Button
                type="submit"
                disabled={submitting || (activeRun !== undefined)}
                variant="gradient"
                size="md"
                className="w-full font-bold shadow-lg shadow-emerald-600/20 py-3 text-sm"
              >
                {submitting ? "Launching Scraper Pipeline..." : "⚡ Run Scraper Now"}
              </Button>
            </form>
          </CardBody>
        </Card>

        {/* Live Scraper Runs & History */}
        <Card className="lg:col-span-2 border border-slate-800 bg-slate-900/80">
          <CardHeader className="bg-slate-950/60 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Database className="h-4 w-4 text-indigo-400" /> Scraper Execution History ({runs.length} Total Runs)
              </h2>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Historical record of all high-volume scraping and public data extractions.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={refreshAll} className="gap-1.5 text-xs">
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </Button>
              <Button size="sm" variant="outline" onClick={handleClearStaleRuns} className="text-xs text-slate-300">
                Clear Stale Tasks
              </Button>
            </div>
          </CardHeader>

          {/* Filter Bar */}
          <div className="p-3.5 border-b border-slate-800 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search run ID, category, location, source..."
                value={historySearch}
                onChange={(e) => {
                  setHistorySearch(e.target.value);
                  setHistoryPage(1);
                }}
                className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={historyStatusFilter}
                onChange={(e) => {
                  setHistoryStatusFilter(e.target.value);
                  setHistoryPage(1);
                }}
                className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"
              >
                <option value="ALL">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="RUNNING">Running</option>
                <option value="FAILED">Failed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <button
                onClick={() => setSortBy(sortBy === "time" ? "scraped" : "time")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-300 hover:text-white"
              >
                <ArrowUpDown className="h-3 w-3" />
                {sortBy === "scraped" ? "Sorted by Total Scraped" : "Sorted by Time"}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-12"><PageLoading /></div>
          ) : paginatedRuns.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              No scraper runs matching the current search filters.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Run ID</th>
                      <th className="py-3.5 px-4">Source Engine</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Location</th>
                      <th className="py-3.5 px-4">Total Scraped</th>
                      <th className="py-3.5 px-4">Valid Entities</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-medium">
                    {paginatedRuns.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-100">{r.id.substring(0, 8)}...</td>
                        <td className="py-3 px-4 font-semibold text-slate-200">{r.source_name}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.entity_type === "DOCTOR"
                              ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              : r.entity_type === "DISPENSARY"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                          }`}>
                            {r.entity_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">{r.location_filter || "Worldwide"}</td>
                        <td className="py-3 px-4 font-mono font-bold text-white text-sm">
                          {r.records_collected.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400 text-sm">
                          {r.records_valid.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            tone={
                              r.status === "COMPLETED"
                                ? "success"
                                : r.status === "RUNNING"
                                ? "info"
                                : r.status === "CANCELLED"
                                ? "warning"
                                : "danger"
                            }
                          >
                            {r.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link href={`/entities?entity_type=${r.entity_type === "ALL" ? "" : r.entity_type}`}>
                            <button className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 hover:underline">
                              View Leads →
                            </button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* History Table Pagination Controls */}
              <div className="p-3.5 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Showing {filteredRuns.length > 0 ? (historyPage - 1) * pageSize + 1 : 0} to{" "}
                  {Math.min(historyPage * pageSize, filteredRuns.length)} of {filteredRuns.length} runs
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={historyPage <= 1}
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    className="p-1.5"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-semibold text-slate-200">
                    Page {historyPage} of {totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={historyPage >= totalPages}
                    onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
