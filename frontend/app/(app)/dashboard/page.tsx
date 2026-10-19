"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Rocket, Search, Download } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageLoading } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";

interface DashboardData {
  metrics: {
    summary: {
      total_entities: number;
      doctors: number;
      dispensaries: number;
      competitors: number;
      verified_records: number;
      data_sources: number;
      collection_runs: number;
      records_collected: number;
      duplicates_detected: number;
      needs_review: number;
      data_quality_percentage: number;
    };
    distribution: {
      doctors: number;
      dispensaries: number;
      competitors: number;
      clinics: number;
      others: number;
    };
    verification_status: {
      verified: number;
      partially_verified: number;
      unverified: number;
      needs_review: number;
    };
    quality_gaps: {
      missing_phone: number;
      missing_website: number;
      missing_address: number;
      missing_email: number;
    };
    entities_by_state: { state: string; count: number }[];
    sources: { id: string; name: string; category: string; records: number; status: string }[];
  };
  recent_runs: {
    id: string;
    source_name: string;
    entity_type: string;
    records_collected: number;
    status: string;
    started_at: string;
  }[];
  recent_entities: {
    id: string;
    name: string;
    entity_type: string;
    location: string;
    phone: string | null;
    website: string | null;
    source_name: string;
    verification_status: string;
    data_quality_score: number;
    is_demo: boolean;
  }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get<DashboardData>("/api/market-intelligence/dashboard");
      setData(res);
    } catch (err) {
      setErrorMsg((err as Error).message || "Failed to load Market Intelligence dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);


  if (loading) return <PageLoading />;

  if (errorMsg || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h2 className="text-xl font-bold text-slate-100">Unable to load Market Intelligence Dashboard</h2>
        <p className="text-xs text-slate-400 max-w-md">
          {errorMsg || "Database or authentication session needs initialization."}
        </p>
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={loadData} variant="gradient" size="md">
            Retry Loading
          </Button>
          <Link href="/collection">
            <Button variant="secondary" size="md">
              Start Collection
            </Button>
          </Link>
        </div>
      </div>
    );
  }



  const summary = data?.metrics?.summary ?? {
    total_entities: 0,
    doctors: 0,
    dispensaries: 0,
    competitors: 0,
    verified_records: 0,
    data_sources: 0,
    collection_runs: 0,
    records_collected: 0,
    duplicates_detected: 0,
    needs_review: 0,
    data_quality_percentage: 0,
  };
  const distribution = data?.metrics?.distribution ?? {
    doctors: 0,
    dispensaries: 0,
    competitors: 0,
    clinics: 0,
    others: 0,
  };
  const verification_status = data?.metrics?.verification_status ?? {
    verified: 0,
    partially_verified: 0,
    unverified: 0,
    needs_review: 0,
  };
  const entities_by_state = data?.metrics?.entities_by_state ?? [];
  const sources = data?.metrics?.sources ?? [];

  return (
    <div className="flex flex-col gap-6 sm:gap-8 pb-10">
      {/* Header Banner */}
      <div className="rounded-xl bg-white dark:bg-[#151e32] p-5 sm:p-6 border border-slate-200/80 dark:border-[#29354b] shadow-2xs transition-all">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-md bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>CONTINUOUS MARKET INTELLIGENCE PIPELINE</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Public Surface-Web Market Intelligence
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Automated data collection, cleaning, normalization, deduplication, and verification across Healthcare Providers, Dispensaries, Clinics, and Competitors.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link href="/collection">
              <Button variant="indigo" size="md">
                <Rocket className="h-4 w-4" />
                Start Collection
              </Button>
            </Link>
            <Link href="/market">
              <Button variant="secondary" size="md">
                <Search className="h-4 w-4" />
                Market Explorer
              </Button>
            </Link>
            <a href="/api/market-intelligence/export?format=csv" target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="md">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* Row 1: Executive 4-Pillar KPI Deck */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Entities */}
        <div className="rounded-xl border border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#151e32] p-5 shadow-2xs hover:border-slate-300 dark:hover:border-[#384865] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Discovered Entities
            </span>
            <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              +100% Surface Grounded
            </span>
          </div>
          <div className="mt-2.5 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {summary.total_entities.toLocaleString('en-US')}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Normalized master records across all states
          </p>
          <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-[#29354b] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Verified High-Confidence</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
              {summary.verified_records.toLocaleString('en-US')}
            </span>
          </div>
        </div>

        {/* Doctors & Providers */}
        <div className="rounded-xl border border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#151e32] p-5 shadow-2xs hover:border-slate-300 dark:hover:border-[#384865] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Healthcare Providers
            </span>
            <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              {Math.round((summary.doctors / (summary.total_entities || 1)) * 100)}% of Base
            </span>
          </div>
          <div className="mt-2.5 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {summary.doctors.toLocaleString('en-US')}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Physicians, clinical directors & practitioners
          </p>
          <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-[#29354b] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Market Share Ratio</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
              {((summary.doctors / (summary.total_entities || 1)) * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Dispensaries */}
        <div className="rounded-xl border border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#151e32] p-5 shadow-2xs hover:border-slate-300 dark:hover:border-[#384865] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Dispensary Footprint
            </span>
            <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              {Math.round((summary.dispensaries / (summary.total_entities || 1)) * 100)}% of Base
            </span>
          </div>
          <div className="mt-2.5 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {summary.dispensaries.toLocaleString('en-US')}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Licensed retail outlets & dispensary partners
          </p>
          <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-[#29354b] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Retail Outlets Share</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
              {((summary.dispensaries / (summary.total_entities || 1)) * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Data Quality */}
        <div className="rounded-xl border border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#151e32] p-5 shadow-2xs hover:border-slate-300 dark:hover:border-[#384865] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Data Quality Index
            </span>
            <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Verified Pipeline
            </span>
          </div>
          <div className="mt-2.5 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {summary.data_quality_percentage}%
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Completeness across phone, website & address
          </p>
          <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-[#29354b] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Surface Adapters Active</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
              {summary.data_sources} Sources
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Secondary Pipeline Telemetry Strip */}
      <div className="rounded-xl border border-slate-200/80 dark:border-[#29354b] bg-slate-50/70 dark:bg-[#151e32]/80 p-3.5 grid grid-cols-2 sm:grid-cols-5 gap-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-[#29354b]">
        <div className="px-3 py-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Surface Adapters
          </span>
          <p className="text-base font-semibold text-slate-900 dark:text-white tabular-nums mt-0.5">
            {summary.data_sources} Active
          </p>
        </div>
        <div className="px-3 py-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Collection Runs
          </span>
          <p className="text-base font-semibold text-slate-900 dark:text-white tabular-nums mt-0.5">
            {summary.collection_runs.toLocaleString('en-US')}
          </p>
        </div>
        <div className="px-3 py-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Raw Records Ingested
          </span>
          <p className="text-base font-semibold text-slate-900 dark:text-white tabular-nums mt-0.5">
            {summary.records_collected.toLocaleString('en-US')}
          </p>
        </div>
        <div className="px-3 py-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Duplicates Resolved
          </span>
          <p className="text-base font-semibold text-slate-900 dark:text-white tabular-nums mt-0.5">
            {summary.duplicates_detected.toLocaleString('en-US')}
          </p>
        </div>
        <div className="px-3 py-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Governance Queue
          </span>
          <p className="text-base font-semibold text-slate-900 dark:text-white tabular-nums mt-0.5">
            {summary.needs_review.toLocaleString('en-US')} Pending
          </p>
        </div>
      </div>

      {/* Row 3: Distribution & Geographic Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Entity Distribution Chart */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-900 dark:text-slate-200 text-xs uppercase tracking-wider flex items-center justify-between w-full">
              <span>Entity Mix</span>
              <Badge tone="indigo">Classification</Badge>
            </h3>
          </CardHeader>
          <CardBody className="space-y-3.5">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 dark:text-slate-300 font-medium">Doctors / Providers</span>
                <span className="font-semibold text-slate-900 dark:text-white tabular-nums">{distribution.doctors.toLocaleString('en-US')}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(distribution.doctors / (summary.total_entities || 1)) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 dark:text-slate-300 font-medium">Dispensaries</span>
                <span className="font-semibold text-slate-900 dark:text-white tabular-nums">{distribution.dispensaries.toLocaleString('en-US')}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-teal-500 rounded-full" style={{ width: `${(distribution.dispensaries / (summary.total_entities || 1)) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 dark:text-slate-300 font-medium">Competitors</span>
                <span className="font-semibold text-slate-900 dark:text-white tabular-nums">{distribution.competitors.toLocaleString('en-US')}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-slate-500 rounded-full" style={{ width: `${(distribution.competitors / (summary.total_entities || 1)) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 dark:text-slate-300 font-medium">Clinics & Practices</span>
                <span className="font-semibold text-slate-900 dark:text-white tabular-nums">{distribution.clinics.toLocaleString('en-US')}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-sky-500 rounded-full" style={{ width: `${(distribution.clinics / (summary.total_entities || 1)) * 100}%` }} />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Entities by State (Geographic Breakdown) */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-900 dark:text-slate-200 text-xs uppercase tracking-wider flex items-center justify-between w-full">
              <span>Geographic Distribution</span>
              <Badge tone="neutral">State Footprint</Badge>
            </h3>
          </CardHeader>
          <CardBody className="space-y-3">
            {entities_by_state.length > 0 ? (
              entities_by_state.map((item) => (
                <div key={item.state} className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300 w-16">{item.state}</span>
                  <div className="flex items-center gap-3 flex-1">
                    <div className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(item.count / (summary.total_entities || 1)) * 100}%` }} />
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-white tabular-nums w-12 text-right">
                      {item.count.toLocaleString('en-US')}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">No location state data available yet.</p>
            )}
          </CardBody>
        </Card>

        {/* Data Quality & Verification Status */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-900 dark:text-slate-200 text-xs uppercase tracking-wider flex items-center justify-between w-full">
              <span>Data Quality & Verification</span>
              <Badge tone="success">{summary.data_quality_percentage}% Complete</Badge>
            </h3>
          </CardHeader>
          <CardBody className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-[#29354b]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-medium text-slate-700 dark:text-slate-300">Verified Entities</span>
              </div>
              <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                {verification_status.verified.toLocaleString('en-US')}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-[#29354b]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                <span className="font-medium text-slate-700 dark:text-slate-300">Partially Verified</span>
              </div>
              <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                {verification_status.partially_verified.toLocaleString('en-US')}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-[#29354b]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="font-medium text-slate-700 dark:text-slate-300">Needs Review</span>
              </div>
              <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                {verification_status.needs_review.toLocaleString('en-US')}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                <span className="font-medium text-slate-700 dark:text-slate-300">Unverified</span>
              </div>
              <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                {verification_status.unverified.toLocaleString('en-US')}
              </span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Row 4: Data Sources Breakdown Table */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-900 dark:text-slate-200 text-xs uppercase tracking-wider">
            Surface Data Sources & Adapters
          </h3>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50/80 dark:bg-[#18233a] text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-[#29354b]">
              <tr>
                <th className="py-2.5 px-4">Source Name</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Records Collected</th>
                <th className="py-2.5 px-4">Adapter Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#29354b] font-medium">
              {sources.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-[#1c2740]/60 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-200">{s.name}</td>
                  <td className="py-3 px-4 capitalize">{s.category.replace("_", " ")}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white tabular-nums">{s.records}</td>
                  <td className="py-3 px-4">
                    <Badge tone="success">Active Collector</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Row 5: Recent Entities Master Dataset */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-slate-200 text-xs uppercase tracking-wider">
            Recently Collected Master Entities
          </h3>
          <Link href="/market" className="text-xs text-indigo-500 hover:text-indigo-400 font-medium">
            View Market Explorer →
          </Link>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50/80 dark:bg-[#18233a] text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-[#29354b]">
              <tr>
                <th className="py-3 px-4">Entity Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Phone / Contact</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Verification Status</th>
                <th className="py-3 px-4">Data Quality</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#29354b]">
              {data.recent_entities.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-[#1c2740]/60 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-200">
                    <div className="flex items-center gap-2">
                      <span>{e.name}</span>
                      {e.is_demo && (
                        <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 bg-amber-500/10 text-amber-500 rounded border border-amber-500/20">
                          DEMO
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge tone={e.entity_type === "DOCTOR" ? "indigo" : e.entity_type === "DISPENSARY" ? "cyan" : "neutral"}>
                      {e.entity_type}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">{e.location}</td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{e.phone || "—"}</td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">{e.source_name}</td>
                  <td className="py-3 px-4">
                    <Badge tone={e.verification_status === "VERIFIED" ? "success" : e.verification_status === "PARTIALLY_VERIFIED" ? "info" : "warning"}>
                      {e.verification_status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white tabular-nums">
                    {e.data_quality_score}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
