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
      <div className="flex flex-col h-72 items-center justify-center text-slate-500 dark:text-slate-400 space-y-3">
        <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
        <span className="text-xs font-semibold">Compiling Multi-Source Executive Brief...</span>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 space-y-3">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">Executive Report Unavailable</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
          Failed to compile executive brief. Ensure intelligence data is seeded.
        </p>
        <button
          onClick={fetchReport}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200/80 dark:border-[#29354b] pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold tracking-wide mb-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            Executive Synthesis Brief • Grounded v3.0
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-indigo-500" /> {report.title}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Automated intelligence synthesis with deterministic data citations, anomaly triggers, and actionable recommendations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={copyMarkdown}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-[#151e32] border border-slate-200/80 dark:border-[#29354b] px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1c2740] shadow-sm transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? "Copied Brief!" : "Copy Markdown"}
          </button>
          <button
            onClick={downloadReport}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export (.md)
          </button>
        </div>
      </div>

      {/* Executive Summary Cards */}
      <div className="rounded-xl border border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#151e32] p-5 space-y-3.5 shadow-sm">
        <h2 className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Executive Highlights & Core Observations
        </h2>
        <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
          {executiveSummary.map((bullet, idx) => (
            <li key={idx} className="flex items-start gap-2.5 bg-slate-50 dark:bg-[#10172a] p-3 rounded-lg border border-slate-200/70 dark:border-slate-800">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Trends & Detected Anomalies Grid */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Market Trends */}
        <div className="rounded-xl border border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#151e32] p-5 space-y-3.5 shadow-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Activity className="h-4 w-4 text-indigo-500" /> Macro Market Trends
          </h3>
          <div className="space-y-2.5">
            {trends.length === 0 ? (
              <p className="text-xs text-slate-400">No trend signals recorded this cycle.</p>
            ) : (
              trends.map((t, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-[#10172a] p-3 rounded-lg border border-slate-200/70 dark:border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-white">{t.metric}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${
                      t.direction === "INCREASING" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" :
                      t.direction === "DECREASING" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" :
                      "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                    }`}>
                      {t.direction}
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">{t.summary}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Operational Bottlenecks & Anomalies */}
        <div className="rounded-xl border border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#151e32] p-5 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Operational Anomalies
            </h3>
            <span className="text-[10px] text-slate-400 font-mono tabular-nums">{anomalies.length} Flagged</span>
          </div>
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1.5 custom-scrollbar">
            {anomalies.length === 0 ? (
              <p className="text-xs text-slate-400">Zero active capacity bottlenecks or critical anomalies detected.</p>
            ) : (
              anomalies.map((a, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-[#10172a] p-3 rounded-lg border border-slate-200/70 dark:border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-white">{a.category}</span>
                    <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-semibold px-2 py-0.5 rounded uppercase">
                      {a.severity}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">{a.description}</p>
                  <p className="text-indigo-600 dark:text-indigo-400 text-[10px] font-medium pt-0.5">Action: {a.suggested_action}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Top Opportunity Markets & Pricing */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Top Opportunity Markets */}
        <div className="rounded-xl border border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#151e32] p-5 space-y-3.5 shadow-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" /> Top Opportunity State Markets
          </h3>
          <div className="space-y-2">
            {topOpportunities.map((opp) => (
              <div key={opp.state} className="bg-slate-50 dark:bg-[#10172a] p-3 rounded-lg border border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white text-sm">{opp.state}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 tabular-nums">
                    Patients: {opp.patient_pop?.toLocaleString() || 0} • Dispensaries: {opp.dispensary_count || 0} • Competitors: {opp.competitor_count || 0}
                  </span>
                </div>
                <div className="text-right tabular-nums">
                  <span className="font-semibold text-slate-900 dark:text-white text-base">{opp.score}</span>
                  <span className="text-[10px] text-slate-400 block">/ 100</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Adjustments */}
        <div className="rounded-xl border border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#151e32] p-5 space-y-3.5 shadow-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Scale className="h-4 w-4 text-indigo-500" /> Competitor Pricing Surveillance
          </h3>
          <div className="space-y-2">
            {pricingChanges.length === 0 ? (
              <div className="bg-slate-50 dark:bg-[#10172a] p-4 rounded-lg border border-slate-200/70 dark:border-slate-800 text-xs text-slate-400 text-center">
                No recent price cuts or promotions detected in tracked competitors.
              </div>
            ) : (
              pricingChanges.map((p, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-[#10172a] p-3 rounded-lg border border-slate-200/70 dark:border-slate-800 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white">{p.competitor_name} ({p.state})</span>
                    {p.promotion && <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block mt-0.5">{p.promotion}</span>}
                  </div>
                  <div className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
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
        <div className="rounded-xl border border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#151e32] p-5 space-y-3.5 shadow-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-500" /> Multi-Source Presence Fusion
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="border-b border-slate-200/80 dark:border-[#29354b] bg-slate-50 dark:bg-[#10172a] text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Entity Name</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Signal Summary</th>
                  <th className="py-2.5 px-3">Confidence</th>
                  <th className="py-2.5 px-3">Fused Sources</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {crossSignals.map((cs, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-[#1c2740]/50 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{cs.entity_name}</td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{cs.city || cs.state || "—"}</td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 text-[11px]">{cs.signal_summary}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
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
      <div className="rounded-xl border border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#151e32] p-5 space-y-3.5 shadow-sm">
        <h2 className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
          <Lightbulb className="h-4 w-4 text-emerald-500" /> Strategic Recommendations
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {recommendedActions.map((rec, idx) => (
            <div key={idx} className="bg-slate-50 dark:bg-[#10172a] p-3.5 rounded-lg border border-slate-200/70 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200 flex items-start gap-2.5 font-medium">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] shrink-0 mt-0.5 border border-indigo-500/20">
                {idx + 1}
              </span>
              <span className="leading-relaxed">{rec}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Provenance Grounding Footer */}
      <div className="rounded-xl border border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#151e32] p-3.5 text-[11px] text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>Strictly grounded in public Surface-Web data: NPI CMS, OpenStreetMap, State Gazettes. Zero PHI.</span>
        </div>
        <span className="font-mono text-[10px] tabular-nums">Audit Fingerprint: {report.generated_at}</span>
      </div>
    </div>
  );
}
