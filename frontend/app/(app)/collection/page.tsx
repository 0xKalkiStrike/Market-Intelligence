"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Play, CheckCircle2, Database, Zap } from "lucide-react";
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

export default function CollectionRunsPage() {
  const [runs, setRuns] = useState<CollectionRunItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State - Default to Two-Step Directory & Corporate Registry as requested
  const [sourceName, setSourceName] = useState("Two-Step Directory & Corporate Registry");
  const [entityType, setEntityType] = useState("ALL");
  const [location, setLocation] = useState("Pennsylvania");
  const [query, setQuery] = useState("PHYSICIAN HOME HEALTHCARE");
  const [submitting, setSubmitting] = useState(false);
  const [activeMessage, setActiveMessage] = useState<string | null>(null);

  const fetchRuns = async () => {
    try {
      const res = await api.get<CollectionRunItem[]>("/api/market-intelligence/collection-runs");
      setRuns(res);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
    const interval = setInterval(() => {
      fetchRuns();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const activeRun = runs.find((r) => r.status === "RUNNING");

  const handleStartRun = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSubmitting(true);
    setActiveMessage(null);
    try {
      // Always uncapped / max_records: 0 to scrape everything found
      const res = await api.post<{ run_id: string; status: string; message: string }>("/api/market-intelligence/collect", {
        source_name: sourceName,
        entity_type: entityType,
        location,
        query,
        max_records: 0,
      });
      setActiveMessage("Universal Scraper started! Scrapes revenue, reviews, public data, and competitors in parallel...");
      await fetchRuns();
    } catch (err) {
      alert("Scraper launch error: " + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Page Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30 mb-1">
            <Zap className="h-3.5 w-3.5" /> UNIVERSAL FAST WEB SCRAPER
          </div>
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Global Market Scraper</h1>
          <p className="text-xs text-slate-400 mt-1">
            Scrapes target entities and their competitors across public registries, live web search, and corporate databases — capturing Revenue, Reviews, Ratings, and complete public profiles.
          </p>
        </div>
        <Link href="/entities">
          <Button variant="gradient" size="sm" className="gap-2">
            <Database className="h-4 w-4" /> View Master Entities
          </Button>
        </Link>
      </div>

      {/* Active Run Banner */}
      {activeRun && (
        <div className="rounded-2xl border border-indigo-500/40 bg-indigo-950/30 p-5 backdrop-blur-sm animate-pulse flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 shrink-0">
              <RefreshCw className="h-5 w-5 animate-spin" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-white">Active Scraper Task</span>
                <Badge tone="info">SCRAPING IN PROGRESS</Badge>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                Targeting: <span className="font-bold text-white">{activeRun.source_name}</span> ({activeRun.entity_type}) in <span className="font-bold text-white">{activeRun.location_filter || "Worldwide"}</span>
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
        {/* Streamlined Launch Panel */}
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
                  <option value="ALL">All Categories (for mass scraping)</option>
                  <option value="DOCTOR">Doctors / Healthcare Providers</option>
                  <option value="DISPENSARY">Dispensaries / Clinics</option>
                  <option value="COMPETITOR">Market Competitors</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-200 block mb-1">Target Location / Region</label>
                <Input placeholder="e.g. Pennsylvania, California, Florida, London UK" value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>

              <div>
                <label className="font-bold text-slate-200 block mb-1">Search Keyword / Query (Optional)</label>
                <Input placeholder="e.g. PHYSICIAN HOME HEALTHCARE, Wellness Clinic" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>

              <div>
                <label className="font-bold text-slate-200 block mb-1">Data Source Engine</label>
                <select
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-semibold text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Two-Step Directory & Corporate Registry">Two-Step Directory & Corporate Registry</option>
                  <option value="Public Healthcare Registry">Public Healthcare Registry (Official NPI)</option>
                  <option value="Public Business Directory">Public Business Directory (OpenStreetMap POIs)</option>
                  <option value="Surface Web Corporate Registry">Surface Web Corporate Registry</option>
                  <option value="Universal Multi-Source Engine">Universal Multi-Source Engine (All Sources & Competitors)</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-200">
                <div className="font-bold flex items-center gap-1.5 text-xs">
                  <Zap className="h-4 w-4 text-emerald-400" /> Revenue, Review & Competitor Engine Active
                </div>
                <p className="text-[11px] mt-1 text-emerald-300 leading-relaxed">
                  Automatically extracts <b>Revenue estimates, Ratings, Reviews, Public details</b>, and runs <b>Competitor Discovery</b> for every target found.
                </p>
              </div>

              <Button type="submit" disabled={submitting} variant="gradient" size="md" className="w-full font-bold shadow-lg shadow-emerald-600/20 py-3 text-sm">
                {submitting ? "Scraping In Progress..." : "⚡ Run Scraper Now"}
              </Button>
            </form>
          </CardBody>
        </Card>


        {/* Live Scraper Runs & History */}
        <Card className="lg:col-span-2 border border-slate-800 bg-slate-900/80">
          <CardHeader className="bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Database className="h-4 w-4 text-indigo-400" /> Scraper Execution History
            </h2>
            <Button size="sm" variant="secondary" onClick={fetchRuns} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh History
            </Button>
          </CardHeader>
          {loading ? (
            <div className="py-12"><PageLoading /></div>
          ) : (
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-medium">
                  {runs.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-100">{r.id.substring(0, 8)}...</td>
                      <td className="py-3 px-4 font-semibold text-slate-200">{r.source_name}</td>
                      <td className="py-3 px-4">{r.entity_type}</td>
                      <td className="py-3 px-4 text-slate-400">{r.location_filter || "Worldwide"}</td>
                      <td className="py-3 px-4 font-mono font-bold text-white text-sm">{r.records_collected.toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400 text-sm">{r.records_valid.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <Badge tone={r.status === "COMPLETED" ? "success" : r.status === "RUNNING" ? "info" : "danger"}>
                          {r.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}


