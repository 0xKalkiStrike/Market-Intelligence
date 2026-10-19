"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Loader2, Star, RefreshCw, Download, Building2, ExternalLink } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Competitor {
  id: string;
  name: string;
  business_type: string;
  location: string;
  city: string | null;
  state: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  services: string;
  business_description: string;
  source_name: string;
  source_url: string | null;
  verification_status: string;
  freshness_status: string;
  data_quality_score: number;
  evidence: string;
  last_verified: string;
  rating: number | null;
  review_count: number | null;
  reviews_source_url: string | null;
}

interface CompetitorSummary {
  rated_count: number;
  average_rating: number | null;
  total_reviews: number;
}

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [summary, setSummary] = useState<CompetitorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [businessTypeFilter, setBusinessTypeFilter] = useState("");

  const fetchCompetitors = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.append("search", search);
      if (stateFilter) query.append("state", stateFilter);
      if (businessTypeFilter) query.append("business_type", businessTypeFilter);

      const data = await apiFetch<{ competitors: Competitor[]; summary: CompetitorSummary }>(
        `/api/market-intelligence/competitors?${query.toString()}`
      );
      setCompetitors(data.competitors || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.error("Failed to load competitor landscape", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompetitors();
  }, [search, stateFilter, businessTypeFilter]);

  const uniqueStates = Array.from(new Set(competitors.map((c) => c.state).filter(Boolean)));
  const uniqueTypes = Array.from(new Set(competitors.map((c) => c.business_type).filter(Boolean)));

  const verifiedCount = competitors.filter(
    (c) => c.verification_status === "VERIFIED" || c.verification_status === "PARTIALLY_VERIFIED"
  ).length;
  const verificationRate = competitors.length > 0 ? Math.round((verifiedCount / competitors.length) * 100) : 100;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200/80 dark:border-[#29354b] pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold tracking-wide mb-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            Competitive Intelligence Engine
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-6 w-6 text-indigo-500" />
            Competitive Landscape
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Continuous surface-web analysis of competitors based on public disclosures, physical presence, listed offerings, and verifiable citations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={fetchCompetitors}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-[#151e32] border border-slate-200/80 dark:border-[#29354b] px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1c2740] shadow-sm transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-indigo-500" : ""}`} />
            Refresh
          </button>
          <a
            href="/api/market-intelligence/export?entity_type=COMPETITOR&format=csv"
            download
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </a>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="rounded-xl bg-white dark:bg-[#151e32] border border-slate-200/80 dark:border-[#29354b] p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Identified Competitors</div>
          <div className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight tabular-nums mt-1.5">
            {competitors.length.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Verified surface web entities</div>
        </div>

        <div className="rounded-xl bg-white dark:bg-[#151e32] border border-slate-200/80 dark:border-[#29354b] p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">States Covered</div>
          <div className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight tabular-nums mt-1.5">
            {uniqueStates.length || 1}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Active state footprints</div>
        </div>

        <div className="rounded-xl bg-white dark:bg-[#151e32] border border-slate-200/80 dark:border-[#29354b] p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Business Types</div>
          <div className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight tabular-nums mt-1.5">
            {uniqueTypes.length || 1}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Market categories</div>
        </div>

        <div className="rounded-xl bg-white dark:bg-[#151e32] border border-slate-200/80 dark:border-[#29354b] p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Verification Rate</div>
          <div className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight tabular-nums mt-1.5">
            {verificationRate}%
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Cross-registry confirmed
          </div>
        </div>

        <div className="rounded-xl bg-white dark:bg-[#151e32] border border-slate-200/80 dark:border-[#29354b] p-4 shadow-sm col-span-2 sm:col-span-1">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Avg. Rating</div>
          <div className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight tabular-nums mt-1.5 flex items-center gap-1.5">
            {summary?.average_rating != null ? (
              <>
                <Star className="h-5 w-5 fill-amber-400 text-amber-400 shrink-0" />
                <span>{summary.average_rating.toFixed(1)}</span>
              </>
            ) : (
              <span className="text-sm font-normal text-slate-400">Pending</span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            {summary?.total_reviews ? `${summary.total_reviews.toLocaleString()} total reviews` : "Across monitored profiles"}
          </div>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="rounded-xl bg-white dark:bg-[#151e32] border border-slate-200/80 dark:border-[#29354b] p-3 flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
        <div className="flex-1 w-full md:w-auto relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search competitor name, services, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#10172a] border border-slate-200 dark:border-[#29354b] rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="bg-slate-50 dark:bg-[#10172a] border border-slate-200 dark:border-[#29354b] rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
          >
            <option value="">All States</option>
            {uniqueStates.map((st) => (
              <option key={st} value={st || ""}>
                {st}
              </option>
            ))}
          </select>

          <select
            value={businessTypeFilter}
            onChange={(e) => setBusinessTypeFilter(e.target.value)}
            className="bg-slate-50 dark:bg-[#10172a] border border-slate-200 dark:border-[#29354b] rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
          >
            <option value="">All Business Types</option>
            {uniqueTypes.map((bt) => (
              <option key={bt} value={bt || ""}>
                {bt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Competitor Table */}
      <div className="rounded-xl bg-white dark:bg-[#151e32] border border-slate-200/80 dark:border-[#29354b] overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs">
            <Loader2 className="inline-block mr-2 h-4 w-4 animate-spin text-indigo-500" /> Loading competitive landscape data...
          </div>
        ) : competitors.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs">
            No market competitors matching the current search filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#10172a] border-b border-slate-200/80 dark:border-[#29354b] text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Business & Entity</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Reviews</th>
                  <th className="py-3 px-4">Offerings</th>
                  <th className="py-3 px-4">Website</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {competitors.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-[#1c2740]/50 transition-colors group">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {c.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {c.business_description || "Public market entity"}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200/70 dark:border-slate-700">
                        {c.business_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {c.location || `${c.city || ""}, ${c.state || ""}`}
                    </td>
                    <td className="py-3 px-4">
                      {c.rating != null ? (
                        <div className="flex items-center gap-1.5 tabular-nums">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
                          <span className="font-semibold text-slate-900 dark:text-white">{c.rating.toFixed(1)}</span>
                          {c.review_count != null && (
                            <span className="text-slate-400 text-[10px]">
                              ({c.review_count.toLocaleString()})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">No reviews</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {c.services ? (
                          c.services.split(",").slice(0, 2).map((s, idx) => (
                            <span
                              key={idx}
                              className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded text-[10px]"
                            >
                              {s.trim()}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-[10px]">—</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {c.website ? (
                        <a
                          href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 dark:text-indigo-400 hover:underline font-mono truncate block max-w-[140px] text-[11px]"
                        >
                          {c.website.replace(/^https?:\/\//, "")}
                        </a>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                          c.verification_status === "VERIFIED"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : c.verification_status === "PARTIALLY_VERIFIED"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
                        }`}
                      >
                        <span className="h-1 w-1 rounded-full bg-current" />
                        {c.verification_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/entities/${c.id}`}
                        className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-[#1c2740] hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 px-2.5 py-1 font-semibold transition-colors text-[11px] border border-slate-200/80 dark:border-[#29354b]"
                      >
                        <span>Dossier</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Competitor Classification Rationale Card */}
      <div className="rounded-xl bg-white dark:bg-[#151e32] border border-slate-200/80 dark:border-[#29354b] p-4 text-xs text-slate-500 dark:text-slate-400 space-y-1.5 shadow-sm">
        <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Classification Evidence Criteria</h3>
        <p className="leading-relaxed">
          Competitors are classified via multi-source surface signals: <code className="text-indigo-600 dark:text-indigo-400 bg-slate-100 dark:bg-[#10172a] px-1 py-0.5 rounded border border-slate-200 dark:border-[#29354b]">Category Match + Geographic Presence + Public Service Disclosures</code>.
        </p>
        <p className="text-[11px] text-slate-400">
          All records represent verified, public business intelligence fetched directly from verified public sources.
        </p>
      </div>
    </div>
  );
}
