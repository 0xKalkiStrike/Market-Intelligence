"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Send,
  Bot,
  User,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  BarChart2,
  Table,
  CheckCircle2,
  HelpCircle,
  FileText,
  Search,
  Database,
  ArrowRight,
  Layers,
} from "lucide-react";
import { api } from "@/lib/api";

interface Citation {
  source_table: string;
  record_id?: string;
  url?: string;
  observation_date?: string;
  metric_name?: string;
  value?: any;
  excerpt?: string;
}

interface Phase7AiResponse {
  query: string;
  intent: string;
  status: string;
  narrative_synthesis: string;
  facts: string[];
  calculations: string[];
  estimates: string[];
  hypotheses: string[];
  recommendations: string[];
  citations: Citation[];
  evidence_gaps: string[];
  limitations: string;
  analytical_run_id?: string;
}

interface Phase4AiResponse {
  question: string;
  answer: string;
  evidence: any[];
  key_changes: string[];
  sources: string[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
  limitations: string;
  intent: string;
  query_summary: string;
  recommended_visualization: string;
  records_retrieved: number;
}

const RESEARCH_QUESTIONS = [
  "Why did Florida's opportunity score change?",
  "Which evidence supports prioritizing Pennsylvania over Ohio?",
  "What changed across our monitored competitors this month?",
  "Where is the data too weak to support an expansion conclusion?",
  "Which research findings need to be revisited?",
  "What evidence contradicts our current pricing hypothesis in Florida?",
  "Which competitors reduced their initial certification prices?",
  "Which geographic areas have high dispensary density but low physician coverage?",
];

export default function AiQueryPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [targetState, setTargetState] = useState("");
  const [engineMode, setEngineMode] = useState<"phase7" | "phase4">("phase7");

  const [phase7History, setPhase7History] = useState<Phase7AiResponse[]>([]);
  const [phase4History, setPhase4History] = useState<Phase4AiResponse[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSend(qText?: string) {
    const textToSend = qText || query;
    if (!textToSend.trim() || loading) return;

    setLoading(true);
    setErrorMsg(null);
    if (!qText) setQuery("");

    try {
      if (engineMode === "phase7") {
        const payload: any = { query: textToSend };
        if (targetState) payload.target_state = targetState;

        const data = await api.post<Phase7AiResponse>("/api/research/ai/query", payload);
        setPhase7History((prev) => [data, ...prev]);
      } else {
        const data = await api.post<Phase4AiResponse>("/api/market-intelligence/ai/ask", {
          query: textToSend,
        });
        setPhase4History((prev) => [data, ...prev]);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "Failed to process query");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Page Header */}
      <div className="border-b border-slate-800 pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-950/80 px-3 py-0.5 text-xs font-bold text-indigo-300 border border-indigo-800/50 mb-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" /> EVIDENCE-GROUNDED RESEARCH COPILOT (PHASE 7)
          </div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5 sm:text-3xl">
            <Sparkles className="h-7 w-7 text-indigo-400" /> AI Market Intelligence & Research Assistant
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Ask rigorous market intelligence questions. In Phase 7 mode, every answer enforces strict ontological separation between Facts, Calculations, Estimates, Hypotheses, and Recommendations, complete with structured database citations and data gap disclosures.
          </p>
        </div>

        {/* Engine Switcher */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl self-start md:self-auto">
          <button
            onClick={() => setEngineMode("phase7")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              engineMode === "phase7"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Phase 7 Grounded AI
          </button>
          <button
            onClick={() => setEngineMode("phase4")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              engineMode === "phase4"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Phase 4 Quick Copilot
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Preset Research Questions */}
      <div className="space-y-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Executive Research Inquiries
        </h3>
        <div className="flex flex-wrap gap-2">
          {RESEARCH_QUESTIONS.map((sq, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(sq)}
              disabled={loading}
              className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-700 transition-colors text-left font-medium disabled:opacity-50"
            >
              💬 {sq}
            </button>
          ))}
        </div>
      </div>

      {/* Input Controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={targetState}
          onChange={(e) => setTargetState(e.target.value)}
          className="sm:w-36 rounded-2xl bg-slate-900 border border-slate-700 px-3 py-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
        >
          <option value="">All States</option>
          <option value="FL">Florida (FL)</option>
          <option value="PA">Pennsylvania (PA)</option>
          <option value="OH">Ohio (OH)</option>
          <option value="TX">Texas (TX)</option>
          <option value="NY">New York (NY)</option>
          <option value="CA">California (CA)</option>
        </select>

        <div className="relative flex-1">
          <input
            type="text"
            placeholder={
              engineMode === "phase7"
                ? "Ask an evidence-backed market research question (e.g. Why did Florida's opportunity score change?)..."
                : "Ask a general market query..."
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={loading}
            className="w-full rounded-2xl bg-slate-900 border border-slate-700 pl-4 pr-12 py-3.5 text-xs text-white placeholder-slate-500 shadow-xl focus:border-indigo-500 focus:outline-none font-medium"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !query.trim()}
            className="absolute right-2.5 top-2.5 rounded-xl bg-indigo-600 p-2 text-white hover:bg-indigo-500 disabled:opacity-40 shadow-md transition-colors"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Phase 7 Grounded AI Feed */}
      {engineMode === "phase7" && (
        <div className="space-y-6">
          {phase7History.length === 0 && !loading && (
            <div className="rounded-2xl border border-dashed border-slate-800 p-10 text-center space-y-2">
              <Bot className="h-8 w-8 text-indigo-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-300">Evidence-Grounded Assistant Ready</p>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                Submit an inquiry above or select a preset prompt. The engine performs live database aggregations, statistical checks, and generates auditable citations.
              </p>
            </div>
          )}

          {phase7History.map((item, idx) => (
            <div key={idx} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-5 shadow-xl">
              {/* Question & Intent Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                  <User className="h-4 w-4 text-indigo-400" />
                  <span>"{item.query}"</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                      item.status === "ANSWERED"
                        ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                        : "bg-amber-950 text-amber-300 border-amber-800"
                    }`}
                  >
                    STATUS: {item.status}
                  </span>
                  <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 border border-slate-700">
                    INTENT: {item.intent}
                  </span>
                  {item.analytical_run_id && (
                    <span className="text-[10px] font-mono text-slate-500">
                      RUN #{item.analytical_run_id.slice(-6)}
                    </span>
                  )}
                </div>
              </div>

              {/* Narrative Synthesis */}
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Executive Research Synthesis
                </h4>
                <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line bg-slate-950/80 p-4 rounded-xl border border-slate-800/80">
                  {item.narrative_synthesis}
                </div>
              </div>

              {/* Five-Fold Ontological Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Verified Facts */}
                <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-3.5 space-y-2">
                  <span className="text-[11px] font-extrabold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Verified Observations & Facts ({item.facts.length})
                  </span>
                  {item.facts.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic">No direct factual observations.</p>
                  ) : (
                    <ul className="list-disc list-inside space-y-1 text-xs text-emerald-200/90 font-medium">
                      {item.facts.map((f, fIdx) => (
                        <li key={fIdx}>{f}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* 2. Statistical Calculations */}
                <div className="rounded-xl border border-cyan-900/50 bg-cyan-950/20 p-3.5 space-y-2">
                  <span className="text-[11px] font-extrabold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                    <BarChart2 className="h-3.5 w-3.5" /> Quantitative Calculations ({item.calculations.length})
                  </span>
                  {item.calculations.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic">No quantitative calculations generated.</p>
                  ) : (
                    <ul className="list-disc list-inside space-y-1 text-xs text-cyan-200/90 font-medium font-mono">
                      {item.calculations.map((c, cIdx) => (
                        <li key={cIdx}>{c}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* 3. Estimates & Proxies */}
                <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-3.5 space-y-2">
                  <span className="text-[11px] font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <HelpCircle className="h-3.5 w-3.5" /> Modeled Estimates & Proxies ({item.estimates.length})
                  </span>
                  {item.estimates.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic">No synthetic estimates generated.</p>
                  ) : (
                    <ul className="list-disc list-inside space-y-1 text-xs text-amber-200/90 font-medium">
                      {item.estimates.map((e, eIdx) => (
                        <li key={eIdx}>{e}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* 4. Strategic Hypotheses */}
                <div className="rounded-xl border border-purple-900/50 bg-purple-950/20 p-3.5 space-y-2">
                  <span className="text-[11px] font-extrabold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" /> Hypotheses & Inferences ({item.hypotheses.length})
                  </span>
                  {item.hypotheses.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic">No untested hypotheses declared.</p>
                  ) : (
                    <ul className="list-disc list-inside space-y-1 text-xs text-purple-200/90 font-medium">
                      {item.hypotheses.map((h, hIdx) => (
                        <li key={hIdx}>{h}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* 5. Recommended Next Investigations */}
                <div className="md:col-span-2 rounded-xl border border-indigo-900/50 bg-indigo-950/20 p-3.5 space-y-2">
                  <span className="text-[11px] font-extrabold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowRight className="h-3.5 w-3.5" /> Recommended Investigations ({item.recommendations.length})
                  </span>
                  {item.recommendations.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic">No further investigation recommended.</p>
                  ) : (
                    <ul className="list-disc list-inside space-y-1 text-xs text-indigo-200 font-medium">
                      {item.recommendations.map((r, rIdx) => (
                        <li key={rIdx}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Citations & Evidence Records */}
              {item.citations && item.citations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5 text-indigo-400" /> Audited Database Citations ({item.citations.length})
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-900 uppercase text-[9px] font-bold text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-2 px-3">Source Table</th>
                          <th className="py-2 px-3">Metric Name</th>
                          <th className="py-2 px-3">Value</th>
                          <th className="py-2 px-3">Observation Date</th>
                          <th className="py-2 px-3">Excerpt / Context</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                        {item.citations.map((c, cIdx) => (
                          <tr key={cIdx} className="hover:bg-slate-900/40">
                            <td className="py-2 px-3 text-indigo-300 font-bold">{c.source_table}</td>
                            <td className="py-2 px-3 font-sans text-slate-200">{c.metric_name || "—"}</td>
                            <td className="py-2 px-3 text-emerald-400 font-bold">{String(c.value ?? "—")}</td>
                            <td className="py-2 px-3 text-slate-400">{c.observation_date ? new Date(c.observation_date).toLocaleDateString() : "Live Snapshot"}</td>
                            <td className="py-2 px-3 font-sans text-slate-400 text-[10px] truncate max-w-xs">{c.excerpt || "Database record"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Evidence Gaps & Explicit Limitations */}
              <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-bold text-amber-400 block mb-1 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> Disclosed Evidence Gaps:
                  </span>
                  {item.evidence_gaps && item.evidence_gaps.length > 0 ? (
                    <ul className="list-disc list-inside text-slate-400 space-y-0.5 text-[11px]">
                      {item.evidence_gaps.map((gap, gIdx) => (
                        <li key={gIdx}>{gap}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">No significant data gaps identified.</p>
                  )}
                </div>

                <div>
                  <span className="font-bold text-slate-400 block mb-1">
                    Methodology & Grounding Limitations:
                  </span>
                  <p className="text-slate-400 text-[11px] italic bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    {item.limitations || "Strict SQL query grounding without LLM unverified extrapolation."}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Phase 4 Quick Copilot Feed */}
      {engineMode === "phase4" && (
        <div className="space-y-6">
          {phase4History.length === 0 && !loading && (
            <div className="rounded-2xl border border-dashed border-slate-800 p-10 text-center space-y-2">
              <Bot className="h-8 w-8 text-indigo-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-300">Phase 4 Quick Copilot Ready</p>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                Ask broad questions to inspect tabular records across pricing and dispensaries.
              </p>
            </div>
          )}

          {phase4History.map((item, idx) => (
            <div key={idx} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                  <User className="h-4 w-4 text-indigo-400" />
                  <span>"{item.question}"</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border bg-indigo-950 text-indigo-300 border-indigo-800">
                  CONFIDENCE: {item.confidence}
                </span>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Answer</h4>
                <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
                  {item.answer}
                </p>
              </div>

              {item.evidence && item.evidence.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Retrieved Evidence ({item.evidence.length} records)
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
                    <table className="w-full text-left text-[11px] text-slate-300">
                      <thead className="bg-slate-900 uppercase text-[9px] font-bold text-slate-400 border-b border-slate-800">
                        <tr>
                          {Object.keys(item.evidence[0]).slice(0, 6).map((k) => (
                            <th key={k} className="py-2.5 px-3">{k.replace("_", " ")}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-medium">
                        {item.evidence.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-900/40">
                            {Object.values(row).slice(0, 6).map((val: any, cIdx) => (
                              <td key={cIdx} className="py-2 px-3">{String(val ?? "—")}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
