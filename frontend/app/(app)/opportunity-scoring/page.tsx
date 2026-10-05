"use client";

import { useEffect, useState } from "react";
import { Target, Sliders, RefreshCw, CheckCircle2, TrendingUp } from "lucide-react";

interface Config {
  patient_pop_weight: number;
  market_growth_weight: number;
  competitor_density_weight: number;
  pricing_opp_weight: number;
  dispensary_density_weight: number;
  physician_coverage_weight: number;
  regulatory_ease_weight: number;
  seo_opp_weight: number;
  mmj_presence_weight: number;
}

interface StateRanking {
  state_code: string;
  opportunity_score: number;
  breakdown: Record<string, { score: number; max: number; explanation: string }>;
}

export default function OpportunityScoringPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [rankings, setRankings] = useState<StateRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [confRes, rankRes] = await Promise.all([
        fetch(`${API_BASE}/api/market-intelligence/opportunity-scoring/config`),
        fetch(`${API_BASE}/api/market-intelligence/opportunity-scoring/rankings`),
      ]);

      if (confRes.ok) setConfig(await confRes.json());
      if (rankRes.ok) {
        const data = await rankRes.json();
        setRankings(data.rankings || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveConfig() {
    if (!config) return;
    setSaving(true);
    setSuccessMsg("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/market-intelligence/opportunity-scoring/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        setSuccessMsg("Scoring weights saved successfully!");
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" /> Loading Market Opportunity Engine...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Target className="h-6 w-6 text-indigo-400" /> State Opportunity Scoring Engine
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Explainable 0–100 market prioritization score calculated across 9 weighted parameters.
          </p>
        </div>

        <button
          onClick={handleSaveConfig}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sliders className="h-3.5 w-3.5" />}
          Save Weight Model
        </button>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-950/40 border border-emerald-800 p-3 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" /> {successMsg}
        </div>
      )}

      {/* Top Rankings Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-xs">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-400" /> State Opportunity Rankings
        </h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rankings.map((r, idx) => (
            <div key={r.state_code} className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-950 text-indigo-400 font-bold text-xs">
                    #{idx + 1}
                  </span>
                  <span className="font-bold text-white text-lg">{r.state_code}</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-emerald-400">{r.opportunity_score}</span>
                  <span className="text-[10px] text-slate-500 block">/ 100</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full"
                  style={{ width: `${r.opportunity_score}%` }}
                />
              </div>

              {/* Component breakdown summary */}
              <div className="space-y-1.5 pt-2 text-[11px] border-t border-slate-800">
                {Object.entries(r.breakdown || {}).map(([key, val]) => (
                  <div key={key} className="flex justify-between text-slate-400">
                    <span className="capitalize">{key.replace(/_/g, " ")}:</span>
                    <span className="font-mono text-slate-200">{val.score}/{val.max}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Admin Weights Configurator */}
      {config && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-xs">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Sliders className="h-4 w-4 text-indigo-400" /> Configurable Scoring Weights
          </h2>

          <div className="grid gap-4 md:grid-cols-3 text-xs">
            {Object.entries(config).map(([key, val]) => {
              if (key.includes("updated")) return null;
              return (
                <div key={key} className="space-y-1 bg-slate-950/40 p-3 rounded-lg border border-slate-800">
                  <label className="text-slate-300 font-medium capitalize block truncate">
                    {key.replace(/_weight/g, "").replace(/_/g, " ")} (%)
                  </label>
                  <input
                    type="number"
                    value={val}
                    onChange={(e) => setConfig({ ...config, [key]: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-white font-mono text-xs"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
