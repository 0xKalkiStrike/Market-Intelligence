"use client";

import { useState } from "react";
import { Sparkles, Send, Bot, User, ShieldCheck, AlertTriangle, ExternalLink, RefreshCw, BarChart2, Table, Timeline } from "lucide-react";

interface AiResponse {
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

const MANAGEMENT_QUESTIONS = [
  "Which competitors changed their pricing this month?",
  "What changed in Florida this week?",
  "Which competitors reduced their initial certification price?",
  "Which states have the largest opportunity signals?",
  "Why did the opportunity score for Texas change?",
  "Which dispensaries have not been contacted?",
  "Where do we have high dispensary density but low patient volume?",
  "Which competitors are expanding?",
  "What regulatory changes happened recently?",
  "Which markets have low physician coverage?",
];

export default function AiQueryPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<AiResponse[]>([]);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  async function handleSend(qText?: string) {
    const textToSend = qText || query;
    if (!textToSend.trim() || loading) return;

    setLoading(true);
    setQuery("");
    try {
      const res = await fetch(`${API_BASE}/api/market-intelligence/ai/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: textToSend }),
      });

      if (res.ok) {
        const data: AiResponse = await res.json();
        setChatHistory((prev) => [data, ...prev]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Page Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-950/80 px-3 py-0.5 text-xs font-bold text-indigo-300 border border-indigo-800/50 mb-1">
          GROUNDED DECISION-SUPPORT ENGINE
        </div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2 sm:text-3xl">
          <Sparkles className="h-7 w-7 text-indigo-400" /> AI Market Intelligence Assistant
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Ask natural language market questions directly to the database. Every response is strictly grounded in verified database records, with zero hallucinations, complete evidence tables, and transparent confidence ratings.
        </p>
      </div>

      {/* Management Question Engine Presets */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Management Question Engine Presets</h3>
        <div className="flex flex-wrap gap-2">
          {MANAGEMENT_QUESTIONS.map((sq, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(sq)}
              className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left font-medium"
            >
              💬 {sq}
            </button>
          ))}
        </div>
      </div>

      {/* Query Input Box */}
      <div className="relative">
        <input
          type="text"
          placeholder="Ask management intelligence question (e.g. Which competitors reduced prices in Florida?)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="w-full rounded-2xl bg-slate-900 border border-slate-700 pl-4 pr-12 py-3.5 text-xs text-white placeholder-slate-500 shadow-2xl focus:border-indigo-500 focus:outline-none font-medium"
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !query.trim()}
          className="absolute right-2.5 top-2.5 rounded-xl bg-indigo-600 p-2 text-white hover:bg-indigo-500 disabled:opacity-40 shadow-md transition-colors"
        >
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>

      {/* Grounded Response Feed */}
      <div className="space-y-6">
        {chatHistory.map((item, idx) => (
          <div key={idx} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4 shadow-xl">
            {/* Query & Badges Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                <User className="h-4 w-4 text-indigo-400" />
                <span>Query: "{item.question}"</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase border ${
                  item.confidence === "HIGH" ? "bg-emerald-950 text-emerald-300 border-emerald-800" :
                  item.confidence === "MEDIUM" ? "bg-amber-950 text-amber-300 border-amber-800" : "bg-rose-950 text-rose-300 border-rose-800"
                }`}>
                  CONFIDENCE: {item.confidence}
                </span>
                <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 border border-slate-700">
                  {item.intent}
                </span>
              </div>
            </div>

            {/* Factual Answer Explanation */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Answer</h4>
              <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                {item.answer}
              </p>
            </div>

            {/* Key Changes */}
            {item.key_changes && item.key_changes.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Key Observed Changes</h4>
                <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                  {item.key_changes.map((kc, kIdx) => (
                    <li key={kIdx} className="font-medium text-slate-300">{kc}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Evidence Data Table */}
            {item.evidence && item.evidence.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Retrieved Ground-Truth Evidence ({item.evidence.length} records)</h4>
                  <span className="text-[10px] text-slate-500 font-mono">SQL: {item.query_summary}</span>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 custom-scrollbar">
                  <table className="w-full text-left text-[11px] text-slate-300">
                    <thead className="bg-slate-900/90 uppercase text-[9px] font-bold text-slate-400 border-b border-slate-800">
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
                            <td key={cIdx} className="py-2 px-3">{String(val ?? "N/A")}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sources & Limitations Footer */}
            <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
              <div>
                <span className="font-bold text-slate-400 block mb-1">Supporting Sources:</span>
                <div className="flex flex-wrap gap-1.5">
                  {item.sources && item.sources.map((s, sIdx) => (
                    <span key={sIdx} className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-indigo-300 font-mono text-[10px]">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-400 block mb-1">Confidence & Limitations:</span>
                <p className="text-slate-400 text-[10px] italic">
                  {item.limitations}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
