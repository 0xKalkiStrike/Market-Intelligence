"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Handshake,
  Search,
  Filter,
  MapPin,
  Building2,
  Phone,
  Mail,
  Store,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { api } from "@/lib/api";

interface PartnershipOpp {
  id: string;
  entity_id?: string;
  name: string;
  parent_company: string;
  brand: string;
  state: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  location_count: number;
  partnership_status: string;
  partnership_score: number;
  distance_miles?: number;
  local_patient_volume?: number;
  competitor_presence_level?: string;
  internal_notes: string;
}

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "active", label: "Active Referral Partner" },
  { value: "negotiating", label: "Negotiating / Meeting" },
  { value: "contacted", label: "Contacted / In Discussion" },
  { value: "not_contacted", label: "Not Yet Contacted" },
  { value: "closed", label: "Archived / Closed" },
];

export default function PartnershipsPage() {
  const [opportunities, setOpportunities] = useState<PartnershipOpp[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [stateFilter, setStateFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [availableStates, setAvailableStates] = useState<string[]>([]);

  useEffect(() => {
    api.get<{ states: { code: string; name: string }[] }>("/api/market-intelligence/active-states")
      .then((res) => {
        if (res?.states && res.states.length > 0) {
          setAvailableStates(res.states.map((s) => s.code));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchPartnerships();
  }, [statusFilter, stateFilter]);

  async function fetchPartnerships() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter.toLowerCase());
      if (stateFilter !== "ALL") params.append("state", stateFilter);
      if (search.trim()) params.append("search", search.trim());

      const res = await api.get<{ opportunities: PartnershipOpp[]; available_states?: string[] }>(
        `/api/market-intelligence/partnerships?${params.toString()}`
      );
      setOpportunities(res.opportunities || []);
      if (res.available_states && res.available_states.length > 0) {
        setAvailableStates(res.available_states);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(oppId: string, newStatus: string) {
    setUpdatingId(oppId);
    try {
      await api.post("/api/market-intelligence/partnerships/status", {
        opportunity_id: oppId,
        new_status: newStatus,
      });
      setOpportunities((prev) =>
        prev.map((opp) => (opp.id === oppId ? { ...opp, partnership_status: newStatus } : opp))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered = opportunities.filter((opp) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      opp.name?.toLowerCase().includes(q) ||
      opp.parent_company?.toLowerCase().includes(q) ||
      opp.city?.toLowerCase().includes(q) ||
      opp.state?.toLowerCase().includes(q)
    );
  });

  const totalCount = opportunities.length;
  const avgScore = totalCount
    ? (opportunities.reduce((acc, o) => acc + (o.partnership_score || 0), 0) / totalCount).toFixed(1)
    : "0.0";
  const activeCount = opportunities.filter(
    (o) => o.partnership_status?.toLowerCase() === "active" || o.partnership_status?.toLowerCase() === "negotiating"
  ).length;
  const totalStores = opportunities.reduce((acc, o) => acc + (o.location_count || 1), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200/80 dark:border-[#29354b] pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold tracking-wide mb-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            Dispensary Referral Pipeline
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Handshake className="h-6 w-6 text-indigo-500" />
            Dispensary Partnerships
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            B2B co-marketing & patient referral opportunity pipeline connecting licensed dispensaries with certifying clinics.
          </p>
        </div>

        <button
          onClick={fetchPartnerships}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-[#151e32] border border-slate-200/80 dark:border-[#29354b] px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1c2740] shadow-sm transition-colors self-start md:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-indigo-500" : ""}`} />
          Refresh Pipeline
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-xl border border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#151e32] p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Dispensaries</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white tracking-tight tabular-nums">
            {totalCount.toLocaleString()}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Licensed retail footprints</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#151e32] p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Avg. Opportunity Score</p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight tabular-nums">{avgScore}</span>
            <span className="text-xs text-slate-400">/ 100</span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Weighted volume model</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#151e32] p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active / In Pipeline</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white tracking-tight tabular-nums">
            {activeCount.toLocaleString()}
          </p>
          <p className="mt-0.5 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">Negotiating or active</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#151e32] p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Store Footprint</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white tracking-tight tabular-nums">
            {totalStores.toLocaleString()}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Combined store locations</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-[#151e32] p-3 rounded-xl border border-slate-200/80 dark:border-[#29354b] shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search dispensary brand, MSO, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg bg-slate-50 dark:bg-[#10172a] border border-slate-200 dark:border-[#29354b] pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* State Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">State:</span>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="rounded-lg bg-slate-50 dark:bg-[#10172a] border border-slate-200 dark:border-[#29354b] px-3 py-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="ALL">All States</option>
              {availableStates.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg bg-slate-50 dark:bg-[#10172a] border border-slate-200 dark:border-[#29354b] px-3 py-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
            >
              {STATUS_OPTIONS.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Opportunities Table */}
      <div className="rounded-xl border border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#151e32] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="border-b border-slate-200/80 dark:border-[#29354b] bg-slate-50 dark:bg-[#10172a] text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Dispensary & Brand</th>
                <th className="px-4 py-3">Geography</th>
                <th className="px-4 py-3">Stores</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400 text-xs">
                    No dispensary partnership opportunities found matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((opp) => {
                  const normalizedStatus = opp.partnership_status?.toLowerCase();
                  return (
                    <tr key={opp.id} className="hover:bg-slate-50/80 dark:hover:bg-[#1c2740]/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-white text-xs">{opp.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Building2 className="h-3 w-3 text-slate-400" />
                          <span>{opp.parent_company || "Independent Operator"}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                          <MapPin className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                          <span>{opp.city}, {opp.state}</span>
                        </div>
                        {opp.address && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[160px] mt-0.5">
                            {opp.address}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 tabular-nums font-medium text-xs text-slate-700 dark:text-slate-300">
                          <Store className="h-3.5 w-3.5 text-slate-400" />
                          {opp.location_count || 1} {opp.location_count === 1 ? "store" : "stores"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-baseline gap-1 tabular-nums">
                          <span className="font-semibold text-slate-900 dark:text-white text-xs">
                            {opp.partnership_score?.toFixed(1) || "50.0"}
                          </span>
                          <span className="text-[10px] text-slate-400">/ 100</span>
                        </div>
                        {opp.local_patient_volume && (
                          <div className="text-[10px] text-slate-400 tabular-nums">
                            ~{opp.local_patient_volume.toLocaleString()} patients
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="space-y-0.5 text-[11px]">
                          {opp.phone ? (
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                              <Phone className="h-3 w-3 text-slate-400" />
                              <span>{opp.phone}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[10px]">—</span>
                          )}
                          {opp.email && (
                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                              <Mail className="h-3 w-3 text-slate-400" />
                              <span className="truncate max-w-[130px]">{opp.email}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <select
                          value={normalizedStatus}
                          disabled={updatingId === opp.id}
                          onChange={(e) => updateStatus(opp.id, e.target.value)}
                          className="rounded-md bg-slate-50 dark:bg-[#10172a] border border-slate-200 dark:border-[#29354b] px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="not_contacted">Not Contacted</option>
                          <option value="contacted">Contacted</option>
                          <option value="negotiating">Negotiating</option>
                          <option value="active">Active Partner</option>
                          <option value="closed">Archived</option>
                        </select>
                      </td>

                      <td className="px-4 py-3 text-right">
                        {opp.entity_id ? (
                          <Link
                            href={`/entities/${opp.entity_id}`}
                            className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-[#1c2740] hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 px-2.5 py-1 text-[11px] font-semibold border border-slate-200/80 dark:border-[#29354b] transition-colors"
                          >
                            <span>Dossier</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
