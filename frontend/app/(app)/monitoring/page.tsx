"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { ProductComparison } from "@/lib/types";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageLoading } from "@/components/ui/Spinner";

interface MonitoringTask {
  id: string;
  source_id?: string;
  target: string;
  source_type?: string;
  base_url?: string;
  status: string;
  interval: string;
  products_count?: number;
  last_run: string;
}

export default function MonitoringPage() {
  const [tasks, setTasks] = useState<MonitoringTask[] | null>(null);
  const [comparisons, setComparisons] = useState<ProductComparison[]>([]);
  const [running, setRunning] = useState(false);
  const [runSummary, setRunSummary] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [tList, cList] = await Promise.all([
        api.get<MonitoringTask[]>("/api/monitoring").catch(() => []),
        api.get<ProductComparison[]>("/api/monitoring/comparisons").catch(() => []),
      ]);
      setTasks(tList || []);
      setComparisons(cList || []);
    } catch {
      setTasks([]);
      setComparisons([]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunAll = async () => {
    setRunning(true);
    setRunSummary(null);
    try {
      const res: any = await api.post("/api/monitoring/run-all");
      setRunSummary(
        `Successfully monitored ${res.products_monitored} products across ${res.sources_count} target sources (Generated ${res.total_comparisons_generated} comparison records)!`
      );
      await loadData();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to run monitoring");
    } finally {
      setRunning(false);
    }
  };

  if (!tasks) return <PageLoading />;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-200 sm:text-2xl">
            Real-Time Product Monitoring Engine
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Monitor and track all Excel products across all configured target sources in real-time.
          </p>
        </div>
        <Button variant="gradient" onClick={handleRunAll} isLoading={running} className="shadow-md shadow-indigo-600/30">
          Run All Cross-Source Monitoring
        </Button>
      </div>

      {runSummary && (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-200 shadow-2xs">
          {runSummary}
        </div>
      )}

      {/* Active Tasks / Target Sources Grid */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
          Active Target Source Scrapers ({tasks.length})
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <Card key={task.id} className="hover:border-indigo-200 transition-colors">
              <CardBody className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 dark:text-slate-200 text-sm">{task.target}</span>
                  <Badge tone={task.status === "active" ? "success" : "neutral"}>{task.status}</Badge>
                </div>
                {task.base_url && (
                  <p className="text-xs font-mono text-slate-400 truncate">{task.base_url}</p>
                )}
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
                  <span>Products Tracked: <strong className="text-slate-900 dark:text-slate-200 font-bold">{task.products_count ?? 0}</strong></span>
                  <span>Sync Rate: <strong className="text-slate-900 dark:text-slate-200 font-bold">{task.interval}</strong></span>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>

      {/* Monitored Products Comparison Feed */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
          Latest Product Monitoring Feed ({comparisons.length})
        </h2>

        {comparisons.length === 0 ? (
          <Card>
            <CardBody className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              <div className="max-w-md mx-auto flex flex-col items-center gap-2">
                <Zap className="h-8 w-8 text-slate-400" />
                <p className="font-extrabold text-slate-800 dark:text-slate-300">No comparison records generated yet</p>
                <p className="text-xs text-slate-400">
                  Click <strong>"Run All Cross-Source Monitoring"</strong> above to monitor your products across target sources.
                </p>
              </div>
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody className="p-0 overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                <thead className="border-b border-slate-200 dark:border-slate-800/60 bg-slate-50/80 dark:bg-slate-900/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3.5">Source Site</th>
                    <th className="px-4 py-3.5 min-w-[200px]">Matched Product Title</th>
                    <th className="px-4 py-3.5">Monitored Price</th>
                    <th className="px-4 py-3.5">Price Variance</th>
                    <th className="px-4 py-3.5">Availability</th>
                    <th className="px-4 py-3.5">Rating</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Site Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                  {comparisons.slice(0, 25).map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-slate-200">{c.source_name}</td>
                      <td className="px-4 py-3.5 font-medium text-slate-900 dark:text-slate-200 max-w-xs truncate">
                        {c.source_product_title}
                      </td>
                      <td className="px-4 py-3.5 font-black text-slate-900 dark:text-slate-200">
                        {c.price != null ? `$${Number(c.price).toFixed(2)}` : "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        {c.price_diff != null ? (
                          <span className={`font-bold text-xs px-2.5 py-0.5 rounded-full ${c.price_diff <= 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
                            {c.price_diff >= 0 ? "+" : ""}${Number(c.price_diff).toFixed(2)}
                            {c.price_diff_percent != null ? ` (${Number(c.price_diff_percent).toFixed(1)}%)` : ""}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-bold text-slate-700 dark:text-slate-300">{c.availability}</td>
                      <td className="px-4 py-3.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                        {c.rating ? `${c.rating}` : "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge tone={c.match_status === "exact_match" ? "success" : c.match_status === "price_alert" ? "danger" : "warning"}>
                          {c.match_status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {c.source_product_url && (
                          <a
                            href={c.source_product_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
                          >
                            View Site ↗
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}

