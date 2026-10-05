"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface QualityOverview {
  summary: {
    total_entities: number;
    verified_records: number;
    data_quality_percentage: number;
    duplicates_detected: number;
    needs_review: number;
  };
  verification_status: {
    verified: number;
    partially_verified: number;
    unverified: number;
    needs_review: number;
  };
  freshness: {
    fresh: number;
    recently_updated: number;
    stale: number;
    needs_reverification: number;
  };
  quality_gaps: {
    missing_phone: number;
    missing_website: number;
    missing_address: number;
    missing_email: number;
  };
  duplicate_candidates: Array<{
    id: string;
    entity_1: { id: string; name: string; type: string };
    entity_2: { id: string; name: string; type: string };
    match_score: number;
    match_reasons: string;
    status: string;
  }>;
  sources: Array<{
    id: string;
    name: string;
    category: string;
    records: number;
    status: string;
  }>;
}

export default function DataQualityPage() {
  const [data, setData] = useState<QualityOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchQualityData = async () => {
    setLoading(true);
    try {
      const result = await apiFetch<QualityOverview>("/api/market-intelligence/data-quality");
      setData(result);
    } catch (err) {
      console.error("Failed to fetch data quality metrics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQualityData();
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 text-sm">
        <Loader2 className="inline-block mr-2 h-4 w-4 animate-spin" /> Computing Data Quality & Freshness metrics...
      </div>
    );
  }

  const total = data?.summary.total_entities || 1;
  const verifiedPct = Math.round(((data?.verification_status.verified || 0) / total) * 100);
  const missingPhonePct = Math.round(((data?.quality_gaps.missing_phone || 0) / total) * 100);
  const missingWebsitePct = Math.round(((data?.quality_gaps.missing_website || 0) / total) * 100);
  const missingAddressPct = Math.round(((data?.quality_gaps.missing_address || 0) / total) * 100);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
              Quality Assurance & Verification
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Data Quality & Freshness Dashboard</h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Transparent metrics tracking market dataset verification status, data completeness, attribute coverage gaps, data freshness, and duplicate entity candidates.
            </p>
          </div>

          <button
            onClick={fetchQualityData}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition-all self-start md:self-auto"
          >
            Recalculate Metrics
          </button>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 p-5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Quality Score</div>
          <div className="text-3xl font-black text-indigo-400 mt-2">
            {data?.summary.data_quality_percentage || 0}%
          </div>
          <div className="text-xs text-emerald-400 font-semibold mt-1">Multi-signal confidence score</div>
        </div>

        <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 p-5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verified Records</div>
          <div className="text-3xl font-black text-emerald-400 mt-2">{verifiedPct}%</div>
          <div className="text-xs text-slate-400 mt-1">
            {data?.verification_status.verified} / {total} entities
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 p-5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Duplicate Rate</div>
          <div className="text-3xl font-black text-amber-400 mt-2">
            {Math.round(((data?.summary.duplicates_detected || 0) / total) * 100)}%
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {data?.summary.duplicates_detected} potential duplicate links
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 p-5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Needs Review</div>
          <div className="text-3xl font-black text-violet-400 mt-2">
            {data?.summary.needs_review || 0}
          </div>
          <div className="text-xs text-slate-400 mt-1">Low confidence records</div>
        </div>
      </div>

      {/* Freshness & Quality Gap Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Data Freshness Categories */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-xl">
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            ⏱️ Data Freshness Index
          </h2>
          <p className="text-xs text-slate-400">
            Market information changes over time. Entities are automatically categorized by collection age and verification timestamps.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl bg-emerald-950/40 border border-emerald-800/60 p-4">
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Fresh (&lt;30 days)</div>
              <div className="text-2xl font-black text-white mt-1">{data?.freshness.fresh || 0}</div>
            </div>

            <div className="rounded-xl bg-indigo-950/40 border border-indigo-800/60 p-4">
              <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Recently Updated</div>
              <div className="text-2xl font-black text-white mt-1">{data?.freshness.recently_updated || 0}</div>
            </div>

            <div className="rounded-xl bg-amber-950/40 border border-amber-800/60 p-4">
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">Stale (&gt;90 days)</div>
              <div className="text-2xl font-black text-white mt-1">{data?.freshness.stale || 0}</div>
            </div>

            <div className="rounded-xl bg-rose-950/40 border border-rose-800/60 p-4">
              <div className="text-xs font-bold text-rose-400 uppercase tracking-wider">Needs Reverification</div>
              <div className="text-2xl font-black text-white mt-1">{data?.freshness.needs_reverification || 0}</div>
            </div>
          </div>
        </div>

        {/* Attribute Completeness Gaps */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-xl">
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            Attribute Completeness Gaps
          </h2>
          <p className="text-xs text-slate-400">
            Percentage of market entities missing key public disclosure fields:
          </p>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                <span>Missing Phone Number</span>
                <span className="text-amber-400">{missingPhonePct}%</span>
              </div>
              <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${missingPhonePct}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                <span>Missing Official Website</span>
                <span className="text-violet-400">{missingWebsitePct}%</span>
              </div>
              <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div className="h-full bg-violet-500 rounded-full" style={{ width: `${missingWebsitePct}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                <span>Missing Physical Address</span>
                <span className="text-rose-400">{missingAddressPct}%</span>
              </div>
              <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: `${missingAddressPct}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Duplicate Candidates Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              Entity Resolution & Duplicate Candidates
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Identified potential duplicate entity matches based on matching signals (name, phone, website, location).
            </p>
          </div>
          <span className="text-xs font-bold bg-indigo-950 border border-indigo-800 text-indigo-300 px-3 py-1 rounded-full">
            {data?.duplicate_candidates.length || 0} Pending Matches
          </span>
        </div>

        {data?.duplicate_candidates.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No pending duplicate candidates detected. All entity resolutions are confirmed.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4">Candidate Entity 1</th>
                  <th className="py-3.5 px-4">Candidate Entity 2</th>
                  <th className="py-3.5 px-4">Similarity Score</th>
                  <th className="py-3.5 px-4">Match Signals / Reasons</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data?.duplicate_candidates.map((cand) => (
                  <tr key={cand.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">
                      {cand.entity_1.name}
                      <span className="ml-2 text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                        {cand.entity_1.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {cand.entity_2.name}
                      <span className="ml-2 text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                        {cand.entity_2.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-indigo-400">
                      {cand.match_score}%
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {cand.match_reasons}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-full bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-bold uppercase">
                        {cand.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
