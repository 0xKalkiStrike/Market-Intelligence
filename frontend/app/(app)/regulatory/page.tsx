"use client";

import { useEffect, useState } from "react";
import {
  Scale,
  AlertCircle,
  FileText,
  CheckCircle,
  ExternalLink,
  Calendar,
  Filter,
  Search,
  ShieldCheck,
  RefreshCw,
  Building,
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-950/80 px-3 py-0.5 text-xs font-bold text-indigo-300 border border-indigo-800/50 mb-1.5">
            SURFACE-WEB REGULATORY INTELLIGENCE
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5 sm:text-3xl">
            <Scale className="h-7 w-7 text-indigo-400" /> State Regulatory & Telehealth Compliance
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Automated compliance indexing across authoritative state Department of Health portals for medical marijuana telehealth and recertification requirements.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors self-start md:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Gazettes
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Indexed Frameworks</p>
          <p className="mt-1 text-2xl font-extrabold text-white">{requirements.length}</p>
          <p className="mt-0.5 text-[10px] text-indigo-400 font-medium">State rule statutes</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Monitored States</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-400">{uniqueStates.length}</p>
          <p className="mt-0.5 text-[10px] text-slate-400 font-medium">Jurisdictions under surveillance</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Telehealth Permitted</p>
          <p className="mt-1 text-2xl font-extrabold text-teal-400">{telehealthAllowedCount} <span className="text-xs text-slate-500 font-normal">/ {requirements.length}</span></p>
          <p className="mt-0.5 text-[10px] text-teal-400 font-medium">Virtual consult eligible</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Change Alerts</p>
          <p className="mt-1 text-2xl font-extrabold text-rose-400">{changes.length}</p>
          <p className="mt-0.5 text-[10px] text-rose-300 font-medium">Recent gazette updates</p>
        </div>
      </div>

      {/* Recent Regulatory Changes Alert Banner */}
      {changes.length > 0 && (
        <div className="rounded-2xl border border-rose-900/50 bg-gradient-to-b from-rose-950/30 to-slate-900/60 p-5 space-y-3.5 shadow-xl">
          <h2 className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-400" /> Recent High-Priority Regulatory Changes
          </h2>
          <div className="grid gap-3">
            {changes.map((c) => (
              <div key={c.id} className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white text-sm">[{c.state}] {c.rule_title}</span>
                    <span className="rounded-full bg-rose-950 px-2.5 py-0.5 text-[9px] font-extrabold text-rose-300 border border-rose-800 uppercase">
                      {c.impact_priority} PRIORITY
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                    <Calendar className="h-3 w-3" /> {new Date(c.detected_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">{c.new_info}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search state statutes or rules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-3.5 w-3.5 text-slate-500" />
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
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
      <div className="grid gap-4 md:grid-cols-2">
        {filteredRequirements.map((r) => (
          <div
            key={r.id}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3.5 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-extrabold text-xl text-white tracking-tight">{r.state}</span>
                  <span className="text-slate-400 block text-[11px] font-medium">{r.agency_name}</span>
                </div>
                <span className="rounded-full bg-indigo-950/80 px-2.5 py-0.5 text-[10px] font-bold text-indigo-300 border border-indigo-800">
                  {r.rule_category}
                </span>
              </div>

              <h3 className="text-xs font-bold text-slate-200">{r.rule_title}</h3>
              <p className="text-slate-300 text-xs leading-relaxed">{r.requirement_text}</p>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-800/80">
              <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400">
                <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                  <span className="block text-[10px] text-slate-500">Telehealth</span>
                  <span className={`font-bold inline-flex items-center gap-1 ${r.telehealth_allowed ? "text-emerald-400" : "text-rose-400"}`}>
                    {r.telehealth_allowed ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {r.telehealth_allowed ? "Permitted" : "Restricted"}
                  </span>
                </div>

                <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                  <span className="block text-[10px] text-slate-500">Recertification</span>
                  <span className="font-bold text-white">{r.renewal_frequency_months} Months</span>
                </div>

                <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                  <span className="block text-[10px] text-slate-500">State Fee</span>
                  <span className="font-bold text-emerald-400">${r.registration_fee}</span>
                </div>
              </div>

              {r.source_url && (
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-slate-500 truncate max-w-[200px]">{r.source_name}</span>
                  <a
                    href={r.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 hover:underline font-semibold"
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
