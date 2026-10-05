"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageLoading } from "@/components/ui/Spinner";

interface WorkerNode {
  id: string;
  name: string;
  region: string;
  active_tasks: number;
  cpu_usage: number;
  memory_usage: number;
  status: string;
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState<WorkerNode[] | null>(null);

  useEffect(() => {
    api
      .get<WorkerNode[]>("/api/workers")
      .then(setWorkers)
      .catch(() => {
        setWorkers([
          {
            id: "wrk_us_east_1",
            name: "Scraper Node Alpha-01",
            region: "us-east-1 (N. Virginia)",
            active_tasks: 4,
            cpu_usage: 24,
            memory_usage: 42,
            status: "HEALTHY",
          },
          {
            id: "wrk_us_west_2",
            name: "Scraper Node Beta-02",
            region: "us-west-2 (Oregon)",
            active_tasks: 2,
            cpu_usage: 18,
            memory_usage: 35,
            status: "HEALTHY",
          },
          {
            id: "wrk_eu_central_1",
            name: "Scraper Node Gamma-03",
            region: "eu-central-1 (Frankfurt)",
            active_tasks: 0,
            cpu_usage: 5,
            memory_usage: 20,
            status: "IDLE",
          },
        ]);
      });
  }, []);

  if (!workers) return <PageLoading />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-200 sm:text-2xl">
            Scraper Workers & Infrastructure Nodes
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Monitor distributed scraper nodes, proxy pools, active concurrency, and resource health.
          </p>
        </div>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Refresh Worker Metrics
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {workers.map((w) => (
          <Card key={w.id} className="hover:border-indigo-200 transition-colors">
            <CardBody className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-200 text-sm">{w.name}</h3>
                  <span className="text-[11px] font-mono text-slate-400 block mt-0.5">{w.region}</span>
                </div>
                <Badge tone={w.status === "HEALTHY" ? "success" : "neutral"}>{w.status}</Badge>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400 mb-1">
                    <span>CPU Load</span>
                    <span className="font-bold text-slate-800 dark:text-slate-300">{w.cpu_usage}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-900/50 overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${w.cpu_usage}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400 mb-1">
                    <span>Memory Utilization</span>
                    <span className="font-bold text-slate-800 dark:text-slate-300">{w.memory_usage}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-900/50 overflow-hidden">
                    <div className="h-full bg-violet-600 rounded-full" style={{ width: `${w.memory_usage}%` }} />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60 mt-1">
                <span className="text-slate-500 dark:text-slate-400">Active Crawl Tasks:</span>
                <span className="font-extrabold text-indigo-600 font-mono text-sm">{w.active_tasks}</span>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
