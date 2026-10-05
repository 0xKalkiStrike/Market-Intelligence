"use client";

import { useEffect, useState } from "react";
import { Scale, AlertCircle, FileText, CheckCircle, ExternalLink, Calendar } from "lucide-react";

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

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [reqRes, chgRes] = await Promise.all([
        fetch(`${API_BASE}/api/market-intelligence/regulatory/requirements`),
        fetch(`${API_BASE}/api/market-intelligence/regulatory/changes`),
      ]);

      if (reqRes.ok) {
        const data = await reqRes.json();
        setRequirements(data.requirements || []);
      }
      if (chgRes.ok) {
        const data = await chgRes.json();
        setChanges(data.changes || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Scale className="h-6 w-6 text-indigo-400" /> Regulatory Intelligence Engine
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated monitoring of authoritative state government portals for medical marijuana telehealth and certification rule updates.
          </p>
        </div>
      </div>

      {/* Regulatory Alert Changes */}
      {changes.length > 0 && (
        <div className="rounded-xl border border-rose-900/40 bg-rose-950/20 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-rose-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-400" /> Recent High-Impact Regulatory Changes
          </h2>
          <div className="grid gap-3">
            {changes.map((c) => (
              <div key={c.id} className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">[{c.state}] {c.rule_title}</span>
                    <span className="rounded bg-rose-950 px-2 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-800">
                      {c.impact_priority} PRIORITY
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {new Date(c.detected_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-slate-300">{c.new_info}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active State Regulations */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <FileText className="h-4 w-4 text-indigo-400" /> State Regulatory Framework Index
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          {requirements.map((r) => (
            <div key={r.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-lg text-white">{r.state}</span>
                  <span className="text-slate-400 block text-[11px]">{r.agency_name}</span>
                </div>
                <span className="rounded bg-indigo-950 px-2.5 py-1 text-[11px] font-semibold text-indigo-300 border border-indigo-800">
                  {r.rule_category}
                </span>
              </div>

              <p className="text-slate-300 leading-relaxed">{r.requirement_text}</p>

              <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                <div>
                  Telehealth:{" "}
                  <strong className={r.telehealth_allowed ? "text-emerald-400" : "text-rose-400"}>
                    {r.telehealth_allowed ? "Permitted" : "Restricted"}
                  </strong>
                </div>
                <div>Renewal Frequency: <strong className="text-white">{r.renewal_frequency_months} mos</strong></div>
                <div>Reg Fee: <strong className="text-white">${r.registration_fee}</strong></div>
              </div>

              {r.source_url && (
                <a
                  href={r.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-indigo-400 hover:underline pt-1"
                >
                  Official Source <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
