"use client";

import { useEffect, useState } from "react";
import { UserCheck, AlertTriangle, CheckCircle, Video, RefreshCw } from "lucide-react";
import { API_BASE } from "@/lib/api";

interface PhysicianItem {
  id: string;
  physician_name: string;
  state: string;
  license_number: string;
  license_status: string;
  telehealth_eligible: boolean;
  in_person_required: boolean;
  weekly_capacity: number;
  patient_volume: number;
  appointment_volume: number;
  utilization_rate: number;
  mismatch_signal: string;
}

interface PhysicianCoverageSummary {
  physicians: PhysicianItem[];
  total_physicians: number;
  total_capacity_weekly: number;
  total_patient_volume: number;
  overall_utilization_percent: number;
}

export default function PhysiciansPage() {
  const [physicians, setPhysicians] = useState<PhysicianItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<PhysicianCoverageSummary | null>(null);

  async function fetchPhysicians() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/market-intelligence/physicians/coverage`);
      if (res.ok) {
        const data = await res.json();
        setPhysicians(data.physicians || []);
        setSummary(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPhysicians();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200/80 dark:border-[#29354b] pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold tracking-wide mb-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            Clinical Operations Intelligence
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-indigo-500" />
            Physician Coverage Intelligence
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Monitor physician licensing status, weekly capacities, telehealth eligibility, and regional patient demand mismatches.
          </p>
        </div>

        <button
          onClick={fetchPhysicians}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-[#151e32] border border-slate-200/80 dark:border-[#29354b] px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1c2740] shadow-sm transition-colors self-start md:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-indigo-500" : ""}`} />
          Refresh Coverage
        </button>
      </div>

      {/* Stats Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="rounded-xl border border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#151e32] p-4 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Total Physicians</span>
            <span className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight tabular-nums mt-1.5 block">
              {summary.total_physicians.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">Active certifying clinicians</span>
          </div>
          <div className="rounded-xl border border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#151e32] p-4 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Weekly Capacity</span>
            <span className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight tabular-nums mt-1.5 block">
              {summary.total_capacity_weekly.toLocaleString()} <span className="text-xs font-normal text-slate-400">hrs</span>
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">Scheduled consultation capacity</span>
          </div>
          <div className="rounded-xl border border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#151e32] p-4 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Weekly Patient Volume</span>
            <span className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight tabular-nums mt-1.5 block">
              {summary.total_patient_volume.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">Completed evaluations</span>
          </div>
          <div className="rounded-xl border border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#151e32] p-4 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Overall Utilization</span>
            <span className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight tabular-nums mt-1.5 block">
              {summary.overall_utilization_percent}%
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Operational efficiency
            </span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#151e32] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="border-b border-slate-200/80 dark:border-[#29354b] bg-slate-50 dark:bg-[#10172a] text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Physician</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Telehealth</th>
                <th className="px-4 py-3">Weekly Capacity</th>
                <th className="px-4 py-3">Volume</th>
                <th className="px-4 py-3">Utilization</th>
                <th className="px-4 py-3">Operational Signal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {physicians.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-[#1c2740]/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900 dark:text-white text-xs">{p.physician_name}</div>
                    <span className="text-[10px] text-slate-400 font-mono">License #{p.license_number || "N/A"}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{p.state}</td>
                  <td className="px-4 py-3">
                    {p.telehealth_eligible ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                        <Video className="h-3 w-3" /> Eligible
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">In-Person Only</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-slate-700 dark:text-slate-300">{p.weekly_capacity} hrs/wk</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-slate-700 dark:text-slate-300">{p.patient_volume} patients</td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-slate-900 dark:text-white">{p.utilization_rate}%</td>
                  <td className="px-4 py-3">
                    {p.mismatch_signal === "HIGH_DEMAND_LOW_CAPACITY" ? (
                      <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400 border border-rose-500/20 inline-flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> High Demand / Low Cap
                      </span>
                    ) : p.mismatch_signal === "AVAILABLE_CAPACITY" ? (
                      <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 inline-flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Available Capacity
                      </span>
                    ) : (
                      <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        Balanced
                      </span>
                    )}
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
