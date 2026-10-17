"use client";

import { useEffect, useState } from "react";
import {
  FileSpreadsheet,
  Download,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  Copy,
  Scale,
  ShieldCheck,
  Activity,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { api } from "@/lib/api";

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
  anomalies?: Array<{
    category: string;
    severity: string;
    description: string;
    suggested_action: string;
  }>;
  trends?: Array<{
    metric: string;
    direction: string;
    confidence: string;
    summary: string;
  }>;
  cross_signals?: Array<{
    entity_name: string;
    entity_type: string;
    state: string;
    city: string;
    signal_title: string;
    signal_summary?: string;
    confidence_level: string;
    sources_fused: string;
    evidence_summary: string;
  }>;
  markdown_report?: string;
}

export default function ExecutiveReportPage() {
  const [report, setReport] = useState<ExecReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchReport();
  }, []);

  async function fetchReport() {
    setLoading(true);
    try {
      const data = await api.get<ExecReport>("/api/market-intelligence/executive-report");
      setReport(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const copyMarkdown = () => {
    if (!report?.markdown_report) return;
    navigator.clipboard.writeText(report.markdown_report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadReport = () => {
    if (!report?.markdown_report) return;
    const blob = new Blob([report.markdown_report], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `executive-report-${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex flex-col h-72 items-center justify-center text-slate-400 space-y-3">
        <RefreshCw className="h-7 w-7 animate-spin text-indigo-500" />
        <span className="text-xs font-semibold">Compiling Multi-Source Executive Intelligence Brief...</span>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 space-y-3">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <h2 className="text-base font-bold text-white">Executive Report Unavailable</h2>
        <p className="text-xs text-slate-400 max-w-sm">
          Failed to compile executive brief. Ensure intelligence data is seeded.
        </p>
        <button
          onClick={fetchReport}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
        >
          Retry Compilation
        </button>
      </div>
    );
  }

  const executiveSummary = report.executive_summary || report.summary_bullets || [];
  const topOpportunities = report.top_market_opportunities || [];
  const pricingChanges = report.pricing_changes || [];
  const recommendedActions = report.recommended_actions || [];
  const anomalies = report.anomalies || [];
  const trends = report.trends || [];
  const crossSignals = report.cross_signals || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-14">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-950/80 px-3 py-0.5 text-xs font-bold text-indigo-300 border border-indigo-800/50 mb-1.5">
            EXECUTIVE INTELLIGENCE BRIEF • GROUNDED V3.0
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5 sm:text-3xl">
            <FileSpreadsheet className="h-7 w-7 text-indigo-400" /> {report.title}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated executive intelligence synthesis with deterministic data citations, anomaly triggers, and actionable recommendations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={copyMarkdown}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? "Copied Brief!" : "Copy Markdown"}
          </button>
          <button
            onClick={downloadReport}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-md transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export Brief (.md)
          </button>
        </div>
      </div>

      {/* Executive Summary Cards */}
      <div className="rounded-2xl border border-indigo-900/50 bg-gradient-to-b from-indigo-950/30 to-slate-900/60 p-6 space-y-4 shadow-xl">
        <h2 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Executive Highlights & Core Observations
        </h2>
        <ul className="space-y-2.5 text-xs text-slate-200 leading-relaxed">
          {executiveSummary.map((bullet, idx) => (
            <li key={idx} className="flex items-start gap-2.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
              <span className="h-2 w-2 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Trends & Detected Anomalies Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Market Trends */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Activity className="h-4 w-4 text-indigo-400" /> Macro Market Trends
          </h3>
          <div className="space-y-2.5">
            {trends.length === 0 ? (
              <p className="text-xs text-slate-500">No trend signals recorded this cycle.</p>
            ) : (
              trends.map((t, idx) => (
                <div key={idx} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{t.metric}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                      t.direction === "INCREASING" ? "bg-emerald-950 text-emerald-300 border-emerald-800" :
                      t.direction === "DECREASING" ? "bg-rose-950 text-rose-300 border-rose-800" :
                      "bg-indigo-950 text-indigo-300 border-indigo-800"
                    }`}>
                      {t.direction}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">{t.summary}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Operational Bottlenecks & Anomalies */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" /> Detected Operational Anomalies
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">{anomalies.length} Flagged</span>
          </div>
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1.5 custom-scrollbar">
            {anomalies.length === 0 ? (
              <p className="text-xs text-slate-500">Zero active capacity bottlenecks or critical anomalies detected.</p>
            ) : (
              anomalies.map((a, idx) => (
                <div key={idx} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{a.category}</span>
                    <span className="bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">
                      {a.severity}
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px]">{a.description}</p>
                  <p className="text-indigo-400 text-[10px] font-medium pt-1">Action: {a.suggested_action}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Top Opportunity Markets & Pricing */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Opportunity Markets */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" /> Top Opportunity State Markets
          </h3>
          <div className="space-y-2">
            {topOpportunities.map((opp) => (
              <div key={opp.state} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="font-extrabold text-white text-base">{opp.state}</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Patients: {opp.patient_pop?.toLocaleString() || 0} • Dispensaries: {opp.dispensary_count || 0} • Competitors: {opp.competitor_count || 0}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-emerald-400 text-lg">{opp.score}</span>
                  <span className="text-[10px] text-slate-500 block">/ 100</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Adjustments */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Scale className="h-4 w-4 text-indigo-400" /> Competitor Pricing Surveillance
          </h3>
          <div className="space-y-2">
            {pricingChanges.length === 0 ? (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-500 text-center">
                No recent price cuts or promotions detected in tracked competitors.
              </div>
            ) : (
              pricingChanges.map((p, idx) => (
                <div key={idx} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white">{p.competitor_name} ({p.state})</span>
                    {p.promotion && <span className="text-[10px] text-indigo-400 block mt-0.5">{p.promotion}</span>}
                  </div>
                  <div className="font-mono font-bold text-amber-300">
                    {p.previous_price ? `$${p.previous_price} → ` : ""}${p.new_price}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Cross-Source Registry Signals */}
      {crossSignals.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-400" /> Multi-Source Entity Presence Fusion
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950/80 text-[10px] font-bold uppercase text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Entity Name</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Signal Summary</th>
                  <th className="py-2.5 px-3">Confidence</th>
                  <th className="py-2.5 px-3">Fused Sources</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {crossSignals.map((cs, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-bold text-white">{cs.entity_name}</td>
                    <td className="py-2.5 px-3 text-slate-400">{cs.city || cs.state || "—"}</td>
                    <td className="py-2.5 px-3 text-slate-300 text-[11px]">{cs.signal_summary}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                        {cs.confidence_level}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[10px] text-slate-400 font-mono">{cs.sources_fused}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Strategic Recommendations */}
      <div className="rounded-2xl border border-emerald-900/50 bg-gradient-to-b from-emerald-950/20 to-slate-900/60 p-6 space-y-4 shadow-xl">
        <h2 className="text-sm font-bold text-emerald-300 flex items-center gap-2 uppercase tracking-wider">
          <Lightbulb className="h-4 w-4 text-emerald-400" /> Strategic Recommendations for Management Review
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {recommendedActions.map((rec, idx) => (
            <div key={idx} className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-xs text-slate-200 flex items-start gap-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-emerald-950 text-emerald-400 font-bold text-[10px] shrink-0 mt-0.5 border border-emerald-800">
                {idx + 1}
              </span>
              <span className="leading-relaxed">{rec}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Provenance Grounding Footer */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>Strictly grounded in public Surface-Web data: NPI CMS, OpenStreetMap, State Gazettes. Zero PHI.</span>
        </div>
        <span className="font-mono text-[10px]">Audit Fingerprint: {report.generated_at}</span>
      </div>
    </div>
  );
}
