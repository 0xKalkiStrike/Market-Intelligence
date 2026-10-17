"use client";

import { useEffect, useState } from "react";
import { BarChart3, Search, TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react";
import { API_BASE } from "@/lib/api";

interface KeywordItem {
  keyword_id: string;
  keyword: string;
  search_query: string;
  category: string;
  state: string;
  mmj_position: number | null;
  prev_position: number | null;
  position_change: number;
  landing_page: string | null;
  competitor_positions: Array<{ name: string; position: number }>;
}

export default function SeoPage() {
  const [keywords, setKeywords] = useState<KeywordItem[]>([]);
  const [loading, setLoading] = useState(true);


  async function fetchSeoData() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/market-intelligence/seo/rankings`);
      if (res.ok) {
        const data = await res.json();
        setKeywords(data.keywords || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSeoData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-400" /> Surface-Web SEO Intelligence
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track MMJ-DOCS search engine rankings against key market competitors.
          </p>
        </div>
      </div>

      {/* Keywords Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Target Keyword</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">MMJ-DOCS Rank</th>
                <th className="px-4 py-3">Rank Shift</th>
                <th className="px-4 py-3">Competitor Visibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {keywords.map((kw) => (
                <tr key={kw.keyword_id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-medium text-white">
                    <div>{kw.keyword}</div>
                    <span className="text-[10px] text-slate-500 font-mono">{kw.search_query}</span>
                  </td>
                  <td className="px-4 py-3 font-bold">{kw.state}</td>
                  <td className="px-4 py-3">
                    {kw.mmj_position ? (
                      <span className="font-bold text-indigo-400 text-sm">#{kw.mmj_position}</span>
                    ) : (
                      <span className="text-slate-500">Unranked</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {kw.position_change > 0 ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-medium text-[11px]">
                        <TrendingUp className="h-3 w-3" /> +{kw.position_change}
                      </span>
                    ) : kw.position_change < 0 ? (
                      <span className="flex items-center gap-1 text-rose-400 font-medium text-[11px]">
                        <TrendingDown className="h-3 w-3" /> {kw.position_change}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-500 text-[11px]">
                        <Minus className="h-3 w-3" /> No Change
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {kw.competitor_positions.map((cp, idx) => (
                        <span key={`${cp.name}-${idx}`} className="bg-slate-950 px-2 py-0.5 rounded text-[10px] border border-slate-800 text-slate-300">
                          {cp.name}: <strong className="text-white">#{cp.position}</strong>
                        </span>
                      ))}
                    </div>
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
