"use client";

import { useEffect, useState } from "react";
import { FileSpreadsheet, Download, CheckCircle2, TrendingUp, AlertTriangle, Lightbulb, RefreshCw } from "lucide-react";

interface ExecReport {
  title: string;
  generated_at: string;
  executive_summary?: string[];
  summary_bullets?: string[];
  top_market_opportunities?: Array<{
    state: string;
    score: number;
    patient_pop: number;
    competitor_count: number;
    dispensary_count: number;
  }>;
  top_opportunities?: Array<{
    state: string;
    score: number;
    patient_pop: number;
    competitor_count: number;
    dispensary_count: number;
  }>;
  recent_events?: Array<{
    event_type: string;
    entity_name: string;
    state: string;
    description: string;
    importance: string;
  }>;
  pricing_changes?: Array<{
    competitor_name: string;
    state: string;
    previous_price: number | null;
    new_price: number;
    promotion: string | null;
  }>;
  regulatory_changes?: Array<{
    state: string;
    rule_title: string;
    new_info: string;
    priority: string;
  }>;
  recommended_actions?: string[];
}

export default function ExecutiveReportPage() {
  const [report, setReport] = useState<ExecReport | null>(null);
  const [loading, setLoading] = useState(true);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    fetchReport();
  }, []);

  async function fetchReport() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/market-intelligence/executive-report`);
      if (res.ok) {
        setReport(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" /> Compiling Weekly Executive Intelligence Report...
      </div>
    );
  }

  if (!report) return null;

  const executiveSummary = report.executive_summary || report.summary_bullets || [];
  const topOpportunities = report.top_market_opportunities || report.top_opportunities || [];
  const pricingChanges = report.pricing_changes || [];
  const recommendedActions = report.recommended_actions || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-indigo-400" /> {report.title}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated executive-ready market intelligence summary & strategic recommendations for MMJ-DOCS leadership.
          </p>
        </div>
      </div>

      {/* Executive Summary Cards */}
      <div className="rounded-xl border border-indigo-900/40 bg-indigo-950/20 p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-indigo-400" /> Executive Summary
        </h2>
        <ul className="space-y-2 text-xs text-slate-200">
          {executiveSummary.map((bullet, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Top Opportunities & Pricing Changes Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Opportunities */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" /> Top Opportunity Markets
          </h3>
          <div className="space-y-2">
            {topOpportunities.map((opp) => (
              <div key={opp.state} className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-white text-sm">{opp.state}</span>
                  <span className="text-[10px] text-slate-500 block">Pop: {opp.patient_pop?.toLocaleString() || 0} • Dispensaries: {opp.dispensary_count || 0}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-emerald-400 text-base">{opp.score}</span>
                  <span className="text-[10px] text-slate-500 block">/ 100</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Changes */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" /> Competitor Pricing Adjustments
          </h3>
          <div className="space-y-2">
            {pricingChanges.map((p, idx) => (
              <div key={idx} className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-white">{p.competitor_name} ({p.state})</span>
                  {p.promotion && <span className="text-[10px] text-indigo-400 block">{p.promotion}</span>}
                </div>
                <div className="font-mono font-bold text-amber-300">
                  {p.previous_price ? `$${p.previous_price} → ` : ""}${p.new_price}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Strategic Recommendations */}
      <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-6 space-y-4">
        <h2 className="text-base font-bold text-emerald-300 flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-emerald-400" /> Strategic Recommendations for Management Review
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {recommendedActions.map((rec, idx) => (
            <div key={idx} className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-xs text-slate-200 flex items-start gap-2.5">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-950 text-emerald-400 font-bold text-[10px] shrink-0 mt-0.5 border border-emerald-800">
                {idx + 1}
              </span>
              <span>{rec}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

