"use client";

import { useEffect, useState } from "react";
import { Handshake, Search, Filter, MapPin, Building2, Phone, Mail, ChevronRight, Check } from "lucide-react";

interface PartnershipOpp {
  id: string;
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
  internal_notes: string;
}

const STATUS_OPTIONS = [
  "ALL",
  "NOT_CONTACTED",
  "CONTACTED",
  "FOLLOW_UP_NEEDED",
  "INTERESTED",
  "MEETING_SCHEDULED",
  "PARTNER",
  "ACTIVE_REFERRAL",
  "INACTIVE",
  "NOT_INTERESTED",
];

export default function PartnershipsPage() {
  const [opportunities, setOpportunities] = useState<PartnershipOpp[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    fetchPartnerships();
  }, [statusFilter, search]);

  async function fetchPartnerships() {
    setLoading(true);
    try {
      const url = new URL(`${API_BASE}/api/market-intelligence/partnerships`);
      if (statusFilter !== "ALL") url.searchParams.append("status", statusFilter);
      if (search) url.searchParams.append("search", search);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setOpportunities(data.opportunities || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/market-intelligence/partnerships/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ opportunity_id: id, new_status: newStatus }),
      });

      if (res.ok) {
        fetchPartnerships();
      }
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Handshake className="h-6 w-6 text-indigo-400" /> Dispensary Partnership Opportunity Engine
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            CRM pipeline connecting MMJ-DOCS internal business metrics with surface-web dispensary data.
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search dispensaries or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg bg-slate-950 border border-slate-700 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white"
          >
            {STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>
                {st.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table / Cards */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Dispensary</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Locations</th>
                <th className="px-4 py-3">Opportunity Score</th>
                <th className="px-4 py-3">Pipeline Status</th>
                <th className="px-4 py-3">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {opportunities.map((opp) => (
                <tr key={opp.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-medium text-white">
                    <div>{opp.name}</div>
                    <span className="text-[10px] text-slate-500">{opp.parent_company}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-slate-300">
                      <MapPin className="h-3 w-3 text-slate-500" />
                      {opp.city}, {opp.state}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono">{opp.location_count} stores</td>
                  <td className="px-4 py-3 font-bold text-emerald-400 text-sm">
                    {opp.partnership_score.toFixed(1)} / 100
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded px-2 py-0.5 text-[10px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
                      {opp.partnership_status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={opp.partnership_status}
                      onChange={(e) => updateStatus(opp.id, e.target.value)}
                      className="rounded bg-slate-950 border border-slate-700 px-2 py-1 text-[11px] text-slate-200"
                    >
                      {STATUS_OPTIONS.filter((s) => s !== "ALL").map((st) => (
                        <option key={st} value={st}>
                          {st.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
