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



  const { summary, distribution, verification_status, entities_by_state, sources } = data.metrics;

  return (
    <div className="flex flex-col gap-6 sm:gap-8 pb-10">
      {/* Header Banner */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-all">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>MARKET INTELLIGENCE PIPELINE</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
              Public Surface-Web Market Intelligence
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Automated data collection, cleaning, normalization, deduplication, and verification across Healthcare Providers, Dispensaries, Clinics, and Competitors.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link href="/collection">
              <Button variant="indigo" size="md" className="font-semibold">
                <Rocket className="h-4 w-4" />
                Start Collection
              </Button>
            </Link>
            <Link href="/market">
              <Button variant="secondary" size="md" className="font-semibold">
                <Search className="h-4 w-4" />
                Market Explorer
              </Button>
            </Link>
            <a href="/api/market-intelligence/export?format=csv" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="md" className="font-semibold">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </a>
          </div>

        </div>
      </div>

      {/* Row 1: Top Primary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs hover:shadow-md transition-all">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Entities</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-100">{summary.total_entities.toLocaleString('en-US')}</p>
          <p className="mt-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">Cleaned Master Records</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs hover:shadow-md transition-all">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Doctors</p>
          <p className="mt-1 text-2xl font-extrabold text-blue-600 dark:text-blue-400">{summary.doctors.toLocaleString('en-US')}</p>
          <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 font-medium">Healthcare Providers</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs hover:shadow-md transition-all">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Dispensaries</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{summary.dispensaries.toLocaleString('en-US')}</p>
          <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 font-medium">Retail & Medical Outlets</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs hover:shadow-md transition-all">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Competitors</p>
          <p className="mt-1 text-2xl font-extrabold text-purple-600 dark:text-purple-400">{summary.competitors.toLocaleString('en-US')}</p>
          <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 font-medium">Market Competitors</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs hover:shadow-md transition-all">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Verified Records</p>
          <p className="mt-1 text-2xl font-extrabold text-teal-600 dark:text-teal-400">{summary.verified_records.toLocaleString('en-US')}</p>
          <p className="mt-1 text-[10px] text-teal-600 dark:text-teal-400 font-semibold">High Confidence</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs hover:shadow-md transition-all">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Data Sources</p>
          <p className="mt-1 text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{summary.data_sources.toLocaleString('en-US')}</p>
          <p className="mt-1 text-[10px] text-indigo-500 dark:text-indigo-400 font-medium">Surface Adapters</p>
        </div>
      </div>

      {/* Row 2: Secondary Collection Metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Collection Runs</span>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">{summary.collection_runs.toLocaleString('en-US')}</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Raw Records Collected</span>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">{summary.records_collected.toLocaleString('en-US')}</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Duplicates Detected</span>
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">{summary.duplicates_detected.toLocaleString('en-US')}</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Needs Review</span>
          <p className="text-lg font-bold text-orange-600 dark:text-orange-400 mt-0.5">{summary.needs_review.toLocaleString('en-US')}</p>
        </div>
        <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/60 dark:bg-indigo-950/40 p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Data Quality Score</span>
          <p className="text-lg font-extrabold text-indigo-700 dark:text-indigo-300 mt-0.5">{summary.data_quality_percentage}%</p>
        </div>
      </div>

      {/* Row 3: Distribution & Geographic Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Entity Distribution Chart */}
        <Card>
          <CardHeader className="bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800/60">
            <h3 className="font-bold text-slate-900 dark:text-slate-200 text-xs uppercase tracking-wider flex items-center justify-between">
              <span>Entity Distribution</span>
              <Badge tone="info">Category Types</Badge>
            </h3>
          </CardHeader>
          <CardBody className="space-y-3.5">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700 dark:text-slate-300">Doctors / Providers</span>
                <span className="text-blue-600">{distribution.doctors.toLocaleString('en-US')}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-900/50 overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(distribution.doctors / (summary.total_entities || 1)) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700 dark:text-slate-300">Dispensaries</span>
                <span className="text-emerald-600">{distribution.dispensaries.toLocaleString('en-US')}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-900/50 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(distribution.dispensaries / (summary.total_entities || 1)) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700 dark:text-slate-300">Competitors</span>
                <span className="text-purple-600">{distribution.competitors.toLocaleString('en-US')}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-900/50 overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(distribution.competitors / (summary.total_entities || 1)) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700 dark:text-slate-300">Clinics</span>
                <span className="text-teal-600">{distribution.clinics.toLocaleString('en-US')}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-900/50 overflow-hidden">
                <div className="h-full bg-teal-500 rounded-full" style={{ width: `${(distribution.clinics / (summary.total_entities || 1)) * 100}%` }} />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Entities by State (Geographic Breakdown) */}
        <Card>
          <CardHeader className="bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800/60">
            <h3 className="font-bold text-slate-900 dark:text-slate-200 text-xs uppercase tracking-wider flex items-center justify-between">
              <span>Geographic Distribution</span>
              <Badge tone="neutral">State Breakdown</Badge>
            </h3>
          </CardHeader>
          <CardBody className="space-y-3">
            {entities_by_state.length > 0 ? (
              entities_by_state.map((item) => (
                <div key={item.state} className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{item.state}</span>
                  <div className="flex items-center gap-3 w-3/5">
                    <div className="h-2 flex-1 rounded-full bg-slate-100 dark:bg-slate-900/50 overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${(item.count / (summary.total_entities || 1)) * 100}%` }} />
                    </div>
                    <span className="font-bold text-slate-900 dark:text-slate-200 w-12 text-right">{item.count.toLocaleString('en-US')}</span>
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
          <CardHeader className="bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800/60">
            <h3 className="font-bold text-slate-900 dark:text-slate-200 text-xs uppercase tracking-wider flex items-center justify-between">
              <span>Data Quality & Verification</span>
              <Badge tone="success">{summary.data_quality_percentage}% Complete</Badge>
            </h3>
          </CardHeader>
          <CardBody className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/60">
              <span className="font-semibold text-emerald-800 dark:text-emerald-300">Verified Entities</span>
              <span className="font-bold text-emerald-900 dark:text-emerald-200">{verification_status.verified.toLocaleString('en-US')}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800/60">
              <span className="font-semibold text-blue-800 dark:text-blue-300">Partially Verified</span>
              <span className="font-bold text-blue-900 dark:text-blue-200">{verification_status.partially_verified.toLocaleString('en-US')}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800/60">
              <span className="font-semibold text-amber-800 dark:text-amber-300">Needs Review</span>
              <span className="font-bold text-amber-900 dark:text-amber-200">{verification_status.needs_review.toLocaleString('en-US')}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Unverified</span>
              <span className="font-bold text-slate-900 dark:text-slate-200">{verification_status.unverified.toLocaleString('en-US')}</span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Row 4: Data Sources Breakdown Table */}
      <Card>
        <CardHeader className="bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800/60">
          <h3 className="font-bold text-slate-900 dark:text-slate-200 text-xs uppercase tracking-wider">Surface Data Sources & Adapters</h3>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-100/80 dark:bg-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800/60">
              <tr>
                <th className="py-2.5 px-4">Source Name</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Records Collected</th>
                <th className="py-2.5 px-4">Adapter Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {sources.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-200">{s.name}</td>
                  <td className="py-3 px-4 capitalize">{s.category.replace("_", " ")}</td>
                  <td className="py-3 px-4 font-bold text-indigo-600">{s.records}</td>
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
        <CardHeader className="bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-slate-200 text-xs uppercase tracking-wider">Recently Collected Master Entities</h3>
          <Link href="/data-explorer">
            <span className="text-xs text-indigo-600 font-bold hover:underline">View All Entities →</span>
          </Link>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-100/80 dark:bg-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800/60">
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
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.recent_entities.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-200">
                    <div className="flex items-center gap-2">
                      <span>{e.name}</span>
                      {e.is_demo && (
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 rounded border border-amber-300">
                          DEMO DATA
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge tone={e.entity_type === "DOCTOR" ? "info" : e.entity_type === "DISPENSARY" ? "success" : "purple"}>
                      {e.entity_type}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">{e.location}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{e.phone || "—"}</td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">{e.source_name}</td>
                  <td className="py-3 px-4">
                    <Badge tone={e.verification_status === "VERIFIED" ? "success" : e.verification_status === "PARTIALLY_VERIFIED" ? "info" : "warning"}>
                      {e.verification_status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 font-extrabold text-indigo-600">{e.data_quality_score}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
