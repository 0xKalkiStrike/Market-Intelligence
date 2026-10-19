"use client";

import { useEffect, useState } from "react";
import {
  Scale,
  AlertCircle,
  ExternalLink,
  Calendar,
  Filter,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api";

interface RegulatoryReq {
  id: string;
  state: string;
  agency_name: string;
  rule_title: string;
  rule_category: string;
  requirement_text: string;
  telehealth_allowed: boolean;
  renewal_frequency_months: number;
  registration_fee: number;
  source_name: string;
  source_url: string | null;
}

interface RegulatoryChg {
  id: string;
  state: string;
  rule_title: string;
  event_type: string;
  previous_info: string | null;
  new_info: string;
  impact_priority: string;
  detected_at: string;
}

export default function RegulatoryPage() {
  const [requirements, setRequirements] = useState<RegulatoryReq[]>([]);
  const [changes, setChanges] = useState<RegulatoryChg[]>([]);
  const [loading, setLoading] = useState(true);
  const [stateFilter, setStateFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [reqData, chgData] = await Promise.all([
        api.get<{ requirements: RegulatoryReq[] }>("/api/market-intelligence/regulatory/requirements"),
        api.get<{ changes: RegulatoryChg[] }>("/api/market-intelligence/regulatory/changes"),
      ]);
      setRequirements(reqData.requirements || []);
      setChanges(chgData.changes || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filteredRequirements = requirements.filter((r) => {
    if (stateFilter !== "ALL" && r.state !== stateFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.rule_title.toLowerCase().includes(q) ||
        r.agency_name.toLowerCase().includes(q) ||
        r.requirement_text.toLowerCase().includes(q) ||
        r.state.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const uniqueStates = Array.from(new Set(requirements.map((r) => r.state)));
  const telehealthAllowedCount = requirements.filter((r) => r.telehealth_allowed).length;

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200/80 dark:border-[#29354b] pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold tracking-wide mb-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            Statutory & Telehealth Compliance
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Scale className="h-6 w-6 text-indigo-500" /> State Regulatory Intelligence
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Automated compliance indexing across authoritative state Department of Health portals for medical marijuana telehealth and recertification requirements.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-[#151e32] border border-slate-200/80 dark:border-[#29354b] px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1c2740] shadow-sm transition-colors self-start md:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-indigo-500" : ""}`} />
          Refresh Gazettes
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#151e32] p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Indexed Frameworks</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white tracking-tight tabular-nums">{requirements.length}</p>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">State rule statutes</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#151e32] p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Monitored States</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white tracking-tight tabular-nums">{uniqueStates.length}</p>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">Jurisdictions indexed</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#151e32] p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Telehealth Permitted</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white tracking-tight tabular-nums">
            {telehealthAllowedCount} <span className="text-xs text-slate-400 font-normal">/ {requirements.length}</span>
          </p>
          <p className="mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Virtual consult eligible</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#151e32] p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Change Alerts</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white tracking-tight tabular-nums">{changes.length}</p>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">Recent gazette updates</p>
        </div>
      </div>

      {/* Recent Regulatory Changes Alert Banner */}
      {changes.length > 0 && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-50/50 dark:bg-rose-950/20 p-5 space-y-3.5 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-500" /> Recent High-Priority Regulatory Changes
          </h2>
          <div className="grid gap-3">
            {changes.map((c) => (
              <div key={c.id} className="bg-white dark:bg-[#10172a] p-4 rounded-lg border border-rose-200/70 dark:border-rose-900/40 text-xs space-y-1.5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white text-xs">[{c.state}] {c.rule_title}</span>
                    <span className="rounded bg-rose-500/10 px-2 py-0.5 text-[9px] font-semibold text-rose-600 dark:text-rose-400 border border-rose-500/20 uppercase">
                      {c.impact_priority} PRIORITY
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono tabular-nums">
                    <Calendar className="h-3 w-3" /> {new Date(c.detected_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium">{c.new_info}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-[#151e32] p-3 rounded-xl border border-slate-200/80 dark:border-[#29354b] shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search state statutes or rules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg bg-slate-50 dark:bg-[#10172a] border border-slate-200 dark:border-[#29354b] pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="rounded-lg bg-slate-50 dark:bg-[#10172a] border border-slate-200 dark:border-[#29354b] px-3 py-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
          >
            <option value="ALL">All States ({requirements.length})</option>
            {uniqueStates.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active State Regulatory Framework Cards */}
      <div className="grid gap-3.5 md:grid-cols-2">
        {filteredRequirements.map((r) => (
          <div
            key={r.id}
            className="rounded-xl border border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#151e32] p-4 space-y-3 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-lg text-slate-900 dark:text-white tracking-tight">{r.state}</span>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">{r.agency_name}</span>
                </div>
                <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  {r.rule_category}
                </span>
              </div>

              <h3 className="text-xs font-semibold text-slate-900 dark:text-white">{r.rule_title}</h3>
              <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed font-medium">{r.requirement_text}</p>
            </div>

            <div className="space-y-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/60">
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className="bg-slate-50 dark:bg-[#10172a] p-2 rounded-lg border border-slate-200/70 dark:border-slate-800">
                  <span className="block text-[10px] text-slate-400">Telehealth</span>
                  <span className={`font-semibold inline-flex items-center gap-1 ${r.telehealth_allowed ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {r.telehealth_allowed ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {r.telehealth_allowed ? "Permitted" : "Restricted"}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-[#10172a] p-2 rounded-lg border border-slate-200/70 dark:border-slate-800">
                  <span className="block text-[10px] text-slate-400">Recertification</span>
                  <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{r.renewal_frequency_months} Mo</span>
                </div>

                <div className="bg-slate-50 dark:bg-[#10172a] p-2 rounded-lg border border-slate-200/70 dark:border-slate-800">
                  <span className="block text-[10px] text-slate-400">State Fee</span>
                  <span className="font-semibold tabular-nums text-slate-900 dark:text-white">${r.registration_fee}</span>
                </div>
              </div>

              {r.source_url && (
                <div className="flex items-center justify-between text-[11px] pt-0.5">
                  <span className="text-slate-400 truncate max-w-[200px]">{r.source_name}</span>
                  <a
                    href={r.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                  >
                    Official Portal <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
