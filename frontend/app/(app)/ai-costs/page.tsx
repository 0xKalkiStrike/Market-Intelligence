"use client";

import { useEffect, useState } from "react";
import { Cpu, DollarSign, Layers, RefreshCw } from "lucide-react";

interface AiCostLogEntry {
  id: string;
  feature: string;
  model: string;
  provider: string;
  tokens: number;
  cost_usd: number;
}

interface AiCostDashboard {
  total_cost_usd: number;
  total_tokens: number;
  total_requests: number;
  cost_by_feature: Record<string, number>;
  recent_logs: AiCostLogEntry[];
}

export default function AiCostsPage() {
  const [data, setData] = useState<AiCostDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/phase4/ai-costs");
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">AI Cost & Observability Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">
            Task-based LLM Router token accounting, cost optimization, and inference performance tracking
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Cost Dashboard
        </button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total AI Cost (USD)</span>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            ${data?.total_cost_usd || "0.0000"}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Cumulative LLM spending</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total Tokens Consumed</span>
            <Cpu className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {data?.total_tokens?.toLocaleString() || 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Input + Output token accounting</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total Requests Handled</span>
            <Layers className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {data?.total_requests || 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Routed AI model requests</p>
        </div>
      </div>

      {/* Recent Logs Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <h2 className="text-sm font-bold text-white">Recent LLM Cost Audit Log</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-2.5">Feature</th>
                <th className="p-2.5">Model</th>
                <th className="p-2.5">Provider</th>
                <th className="p-2.5">Tokens</th>
                <th className="p-2.5 text-right">Cost (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {data?.recent_logs?.map((l) => (
                <tr key={l.id} className="hover:bg-slate-800/30">
                  <td className="p-2.5 font-sans font-medium text-white">{l.feature}</td>
                  <td className="p-2.5 text-indigo-300">{l.model}</td>
                  <td className="p-2.5 text-slate-400">{l.provider}</td>
                  <td className="p-2.5">{l.tokens}</td>
                  <td className="p-2.5 text-right font-bold text-emerald-400">${l.cost_usd}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
