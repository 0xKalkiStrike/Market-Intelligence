"use client";

import { useEffect, useState } from "react";
import { Settings2, ShieldCheck, Activity, Cpu, Play, CheckCircle2, AlertTriangle, RefreshCw, BarChart3, Database } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function AiAdminPage() {
  const [activeConfig, setActiveConfig] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [evalSummary, setEvalSummary] = useState<any>(null);
  const [benchmarks, setBenchmarks] = useState<any[]>([]);
  const [workloadStatus, setWorkloadStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [runningEval, setRunningEval] = useState(false);

  // Provider config edit state
  const [providerName, setProviderName] = useState("OpenAI");
  const [modelName, setModelName] = useState("gpt-4o");
  const [maxTokens, setMaxTokens] = useState(2048);
  const [temperature, setTemperature] = useState(0.2);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  async function fetchAdminData() {
    setLoading(true);
    try {
      const [cfgRes, auditRes, workRes] = await Promise.all([
        fetch(`${API_BASE}/api/market-intelligence/ai/admin/config`),
        fetch(`${API_BASE}/api/market-intelligence/ai/admin/audit-logs`),
        fetch(`${API_BASE}/api/market-intelligence/ai/admin/workload-status`),
      ]);

      if (cfgRes.ok) {
        const json = await cfgRes.json();
        setActiveConfig(json.active_config);
        if (json.active_config) {
          setProviderName(json.active_config.provider_name);
          setModelName(json.active_config.model_name);
          setMaxTokens(json.active_config.max_tokens);
          setTemperature(json.active_config.temperature);
        }
      }
      if (auditRes.ok) {
        const json = await auditRes.json();
        setAuditLogs(json.audit_logs || []);
      }
      if (workRes.ok) {
        const json = await workRes.json();
        setWorkloadStatus(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAdminData();
  }, []);

  async function handleSaveConfig() {
    try {
      const res = await fetch(`${API_BASE}/api/market-intelligence/ai/admin/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_name: providerName,
          model_name: modelName,
          max_tokens: Number(maxTokens),
          temperature: Number(temperature),
        }),
      });
      if (res.ok) {
        alert("AI Provider Config updated successfully!");
        fetchAdminData();
      }
    } catch (e) {
      alert("Config update error");
    }
  }

  async function handleRunEval() {
    setRunningEval(true);
    try {
      const res = await fetch(`${API_BASE}/api/market-intelligence/ai/admin/eval-suite`);
      if (res.ok) {
        const json = await res.json();
        setEvalSummary(json.eval_summary);
        setBenchmarks(json.benchmark_results || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRunningEval(false);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-950/80 px-3 py-0.5 text-xs font-bold text-indigo-300 border border-indigo-800/50 mb-1">
          AI ADMINISTRATION & OBSERVABILITY CONTROL PANEL
        </div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2 sm:text-3xl">
          <Settings2 className="h-7 w-7 text-indigo-400" /> AI System Administration
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure multi-LLM provider routing, monitor token costs and latency audit logs, execute quality benchmark evaluation suites, and inspect internal workload orchestrator queue metrics.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Provider Settings Panel */}
        <Card className="bg-slate-900 border border-slate-800 lg:col-span-1">
          <CardHeader className="bg-slate-950/60 border-b border-slate-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-indigo-400" /> LLM Provider Routing Config
            </h2>
          </CardHeader>
          <CardBody className="p-5 space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Provider Adapter</label>
              <select
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white font-bold"
              >
                <option value="Mock">Grounded Engine (Deterministic Mock)</option>
                <option value="OpenAI">OpenAI (GPT-4o / GPT-4 Turbo)</option>
                <option value="Anthropic">Anthropic (Claude 3.5 Sonnet)</option>
                <option value="Gemini">Google Gemini (Gemini 1.5 Pro)</option>
                <option value="Local">Local LLM Model</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Model ID Name</label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-300 block mb-1">Max Tokens</label>
                <input
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-300 block mb-1">Temperature</label>
                <input
                  type="number"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white font-bold"
                />
              </div>
            </div>

            <Button onClick={handleSaveConfig} variant="gradient" className="w-full font-bold">
              Save Provider Configuration
            </Button>
          </CardBody>
        </Card>

        {/* Quality Evaluation Benchmark Suite */}
        <Card className="bg-slate-900 border border-slate-800 lg:col-span-2">
          <CardHeader className="bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Groundedness & Quality Evaluation Suite
            </h2>
            <Button size="sm" variant="gradient" onClick={handleRunEval} disabled={runningEval}>
              {runningEval ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
              Run Evaluation Suite
            </Button>
          </CardHeader>
          <CardBody className="p-5 space-y-4 text-xs">
            {evalSummary && (
              <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Pass Rate</span>
                  <span className="text-lg font-extrabold text-emerald-400">{evalSummary.pass_rate_percentage}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Groundedness Score</span>
                  <span className="text-lg font-extrabold text-indigo-400">{evalSummary.average_groundedness_score} / 1.0</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Hallucination Rate</span>
                  <span className="text-lg font-extrabold text-emerald-400">{evalSummary.hallucination_rate_percentage}%</span>
                </div>
              </div>
            )}

            {benchmarks.length > 0 && (
              <div className="space-y-2">
                <span className="font-bold text-slate-300 block">Benchmark Query Test Results:</span>
                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                  {benchmarks.map((b) => (
                    <div key={b.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-[11px]">
                      <div>
                        <div className="font-bold text-white">"{b.question}"</div>
                        <div className="text-slate-400 text-[10px]">Intent: {b.actual_intent} • Latency: {b.latency_ms}ms</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-emerald-400 font-bold">Score: {b.score}</span>
                        <span className="bg-emerald-950 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-800">
                          {b.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Internal Workload Orchestrator Status */}
      {workloadStatus && (
        <Card className="bg-slate-900 border border-slate-800">
          <CardHeader className="bg-slate-950/60 border-b border-slate-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-400" /> Internal Workload Orchestrator Queue Metrics
            </h2>
          </CardHeader>
          <CardBody className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Queued Jobs</span>
                <span className="text-xl font-extrabold text-amber-400">{workloadStatus.queue_metrics.queued}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Active Worker Pools</span>
                <span className="text-xl font-extrabold text-indigo-400">{workloadStatus.active_worker_pools.length} Pools</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Completed Jobs</span>
                <span className="text-xl font-extrabold text-emerald-400">{workloadStatus.queue_metrics.completed}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Max Concurrency</span>
                <span className="text-xl font-extrabold text-blue-400">{workloadStatus.max_concurrency} Workers</span>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* AI Request Audit Logs */}
      <Card className="bg-slate-900 border border-slate-800">
        <CardHeader className="bg-slate-950/60 border-b border-slate-800">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">AI Request Audit Trail</h2>
        </CardHeader>
        <CardBody className="p-4">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Question</th>
                  <th className="py-3 px-4">Intent</th>
                  <th className="py-3 px-4">Model</th>
                  <th className="py-3 px-4">Tokens</th>
                  <th className="py-3 px-4">Latency</th>
                  <th className="py-3 px-4">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-medium text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-950/40">
                    <td className="py-2.5 px-4">{log.user_email}</td>
                    <td className="py-2.5 px-4 font-bold text-white max-w-xs truncate">"{log.question}"</td>
                    <td className="py-2.5 px-4 font-mono text-indigo-300">{log.intent}</td>
                    <td className="py-2.5 px-4 font-mono">{log.model_used}</td>
                    <td className="py-2.5 px-4 font-mono">{log.tokens}</td>
                    <td className="py-2.5 px-4 font-mono">{log.latency_ms} ms</td>
                    <td className="py-2.5 px-4 font-bold text-emerald-400">{log.confidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
