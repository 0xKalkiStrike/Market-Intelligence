"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Loader2, Star } from "lucide-react";
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

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
              Market Intelligence Platform
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Competitive Landscape</h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Factual analysis of identified market competitors based on public source disclosures, location presence, listed offerings, and verifiable evidence.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchCompetitors}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-xs font-bold text-slate-200 transition-all border border-slate-700"
            >
              Refresh Data
            </button>
            <a
              href="/api/market-intelligence/export?entity_type=COMPETITOR&format=csv"
              download
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition-all"
            >
              Export Competitors CSV
            </a>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 p-5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Identified Competitors</div>
          <div className="text-3xl font-black text-white mt-2">{competitors.length}</div>
          <div className="text-xs text-indigo-400 font-semibold mt-1">Factual surface web entities</div>
        </div>

        <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 p-5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">States Covered</div>
          <div className="text-3xl font-black text-emerald-400 mt-2">{uniqueStates.length || 1}</div>
          <div className="text-xs text-slate-400 mt-1">Geographic footprint</div>
        </div>

        <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 p-5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Business Types</div>
          <div className="text-3xl font-black text-violet-400 mt-2">{uniqueTypes.length || 1}</div>
          <div className="text-xs text-slate-400 mt-1">Market categories</div>
        </div>

        <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 p-5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verification Rate</div>
          <div className="text-3xl font-black text-blue-400 mt-2">
            {competitors.length > 0
              ? Math.round(
                  (competitors.filter((c) => c.verification_status === "VERIFIED" || c.verification_status === "PARTIALLY_VERIFIED").length /
                    competitors.length) *
                    100
                )
              : 100}
            %
          </div>
          <div className="text-xs text-slate-400 mt-1">Multi-source alignment</div>
        </div>

        <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 p-5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg. Google Rating</div>
          <div className="text-3xl font-black text-amber-400 mt-2 flex items-center gap-1.5">
            {summary?.average_rating != null ? (
              <>
                <Star className="h-6 w-6 fill-amber-400" />
                {summary.average_rating.toFixed(1)}
              </>
            ) : (
              <span className="text-lg text-slate-500 font-semibold">No data yet</span>
            )}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {summary
              ? `${summary.rated_count} of ${competitors.length} rated · ${summary.total_reviews.toLocaleString()} reviews`
              : "Across rated competitors"}
          </div>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex-1 w-full md:w-auto relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search competitor name, services, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
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
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
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
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <Loader2 className="inline-block mr-2 h-4 w-4 animate-spin" /> Loading competitive landscape data...
          </div>
        ) : competitors.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No market competitors matching the current search filters. Try clearing your filters or triggering a collection run.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4">Business & Entity Name</th>
                  <th className="py-3.5 px-4">Business Type</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Reviews</th>
                  <th className="py-3.5 px-4">Listed Offerings & Services</th>
                  <th className="py-3.5 px-4">Public Website</th>
                  <th className="py-3.5 px-4">Verification</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {competitors.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors group">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white group-hover:text-indigo-400 transition-colors">
                        {c.name}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                        {c.business_description}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                        {c.business_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {c.location}
                    </td>
                    <td className="py-3.5 px-4">
                      {c.rating != null ? (
                        <div className="flex items-center gap-1.5">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
                          <span className="font-bold text-slate-100">{c.rating.toFixed(1)}</span>
                          {c.review_count != null && (
                            <span className="text-slate-400 text-[11px]">
                              ({c.review_count.toLocaleString()})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">No review data</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {c.services.split(",").slice(0, 3).map((s, idx) => (
                          <span
                            key={idx}
                            className="bg-indigo-950/80 border border-indigo-800/60 text-indigo-300 px-2 py-0.5 rounded text-[10px]"
                          >
                            {s.trim()}
                          </span>

                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {c.website ? (
                        <a
                          href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-400 hover:underline font-mono truncate block max-w-[160px]"
                        >
                          {c.website.replace(/^https?:\/\//, "")}
                        </a>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400 italic">N/A</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          c.verification_status === "VERIFIED"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : c.verification_status === "PARTIALLY_VERIFIED"
                            ? "bg-amber-950 text-amber-400 border border-amber-800"
                            : "bg-slate-800 text-slate-400 border border-slate-700"
                        }`}
                      >
                        ● {c.verification_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/entities/${c.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white px-3 py-1.5 font-bold transition-all text-[11px] border border-indigo-500/30"
                      >
                        Full Dossier ↗
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
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 text-xs text-slate-400 space-y-2">
        <h3 className="text-sm font-bold text-slate-200">Classification Evidence Criteria</h3>
        <p>
          Market competitors are classified using factual public surface-web signals: <code className="text-indigo-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">Market Category Match + Geographic Overlap + Public Service Disclosures</code>.
        </p>
        <p className="text-slate-500 dark:text-slate-400 text-[11px]">
          Note: This table displays verified objective market information collected from public surface-web registries and directories. Review ratings and counts shown are the real, current figures from each business&apos;s public Google Maps listing (fetched live during collection, capped to the first 8 new competitors per run) &mdash; never generated or estimated. A competitor shows &quot;No review data&quot; until a listing is found.
        </p>
      </div>
    </div>
  );
}
