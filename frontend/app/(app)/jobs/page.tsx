"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { JobItem } from "@/lib/types";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageLoading } from "@/components/ui/Spinner";

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobItem[] | null>(null);

  useEffect(() => {
    api.get<JobItem[]>("/api/jobs").then(setJobs).catch(() => setJobs([]));
  }, []);

  if (!jobs) return <PageLoading />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-200 sm:text-2xl">
          Jobs & Background Executions
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Asynchronous crawl execution logs, background excel processing, and batch sync jobs.
        </p>
      </div>

      <Card>
        <CardBody className="p-0 overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="border-b border-slate-200 dark:border-slate-800/60 bg-slate-50/80 dark:bg-slate-900/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3.5">Job ID</th>
                <th className="px-4 py-3.5">Job Name</th>
                <th className="px-4 py-3.5">Execution Details</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                    No background jobs executed yet.
                  </td>
                </tr>
              ) : (
                jobs.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-900 dark:text-slate-200">{j.id}</td>
                    <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-slate-200">{j.job_name}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">{j.details || "—"}</td>
                    <td className="px-4 py-3.5">
                      <Badge tone={j.status === "completed" ? "success" : j.status === "failed" ? "danger" : "warning"}>
                        {j.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs font-mono text-slate-500 dark:text-slate-400">
                      {new Date(j.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}

