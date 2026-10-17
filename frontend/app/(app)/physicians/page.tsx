"use client";

import { useEffect, useState } from "react";
import { UserCheck, Stethoscope, AlertTriangle, CheckCircle, Video, MapPin } from "lucide-react";
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-indigo-400" /> Physician Coverage Intelligence
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Monitor physician licensing status, weekly capacities, telehealth eligibility, and patient demand mismatches.
          </p>
        </div>
      </div>

      {/* Stats Summary */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <span className="text-xs text-slate-400 block font-medium">Total Physicians</span>
            <span className="text-2xl font-bold text-white mt-1 block">{summary.total_physicians}</span>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <span className="text-xs text-slate-400 block font-medium">Weekly Capacity</span>
            <span className="text-2xl font-bold text-indigo-400 mt-1 block">{summary.total_capacity_weekly} hrs</span>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <span className="text-xs text-slate-400 block font-medium">Weekly Patient Volume</span>
            <span className="text-2xl font-bold text-emerald-400 mt-1 block">{summary.total_patient_volume}</span>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <span className="text-xs text-slate-400 block font-medium">Overall Utilization</span>
            <span className="text-2xl font-bold text-amber-400 mt-1 block">{summary.overall_utilization_percent}%</span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
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
            <tbody className="divide-y divide-slate-800">
              {physicians.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-medium text-white">
                    <div>{p.physician_name}</div>
                    <span className="text-[10px] text-slate-500">License #{p.license_number || "N/A"}</span>
                  </td>
                  <td className="px-4 py-3 font-bold">{p.state}</td>
                  <td className="px-4 py-3">
                    {p.telehealth_eligible ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px]">
                        <Video className="h-3 w-3" /> Eligible
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">In-Person Only</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono">{p.weekly_capacity} hrs/wk</td>
                  <td className="px-4 py-3 font-mono">{p.patient_volume} patients</td>
                  <td className="px-4 py-3 font-bold text-slate-200">{p.utilization_rate}%</td>
                  <td className="px-4 py-3">
                    {p.mismatch_signal === "HIGH_DEMAND_LOW_CAPACITY" ? (
                      <span className="rounded bg-rose-950 px-2 py-0.5 text-[10px] font-semibold text-rose-300 border border-rose-800 flex items-center gap-1 w-fit">
                        <AlertTriangle className="h-3 w-3" /> High Demand / Low Capacity
                      </span>
                    ) : p.mismatch_signal === "AVAILABLE_CAPACITY" ? (
                      <span className="rounded bg-indigo-950 px-2 py-0.5 text-[10px] font-semibold text-indigo-300 border border-indigo-800 flex items-center gap-1 w-fit">
                        <CheckCircle className="h-3 w-3" /> Available Capacity
                      </span>
                    ) : (
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">Balanced</span>
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
