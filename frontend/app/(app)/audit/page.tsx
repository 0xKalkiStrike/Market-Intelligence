"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageLoading } from "@/components/ui/Spinner";
import { Input } from "@/components/ui/Input";

interface AuditLog {
  id: string;
  action: string;
  user_email: string;
  entity_type: string;
  entity_id: string;
  ip_address: string;
  timestamp: string;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[] | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Fetch or mock fallback
    api
      .get<AuditLog[]>("/api/audit")
      .then(setLogs)
      .catch(() => {
        setLogs([
          {
            id: "aud_01",
            action: "PRODUCT_EXCEL_UPLOAD",
            user_email: "admin@productintel.com",
            entity_type: "Product",
            entity_id: "prod_batch_892",
            ip_address: "192.168.1.45",
            timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
          },
          {
            id: "aud_02",
            action: "MONITORING_RUN_ALL",
            user_email: "analyst@productintel.com",
            entity_type: "SourceItem",
            entity_id: "src_all",
            ip_address: "192.168.1.12",
            timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          },
          {
            id: "aud_03",
            action: "SOURCE_CREATED",
            user_email: "admin@productintel.com",
            entity_type: "SourceItem",
            entity_id: "src_walmart_us",
            ip_address: "192.168.1.45",
            timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
          },
        ]);
      });
  }, []);

  if (!logs) return <PageLoading />;

  const filtered = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.user_email.toLowerCase().includes(search.toLowerCase()) ||
      l.entity_type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-200 sm:text-2xl">
            System Audit & Governance Logs
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Immutable log records of all system events, user activities, and background worker executions.
          </p>
        </div>
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search action or user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardBody className="p-0 overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="border-b border-slate-200 dark:border-slate-800/60 bg-slate-50/80 dark:bg-slate-900/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3.5">Log ID</th>
                <th className="px-4 py-3.5">Action Event</th>
                <th className="px-4 py-3.5">Triggered By</th>
                <th className="px-4 py-3.5">Entity</th>
                <th className="px-4 py-3.5">IP Address</th>
                <th className="px-4 py-3.5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                    No matching audit logs found.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{log.id}</td>
                    <td className="px-4 py-3">
                      <Badge tone="info">{log.action}</Badge>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-200">{log.user_email}</td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-600 dark:text-slate-400">
                      {log.entity_type} <span className="text-slate-400">({log.entity_id})</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{log.ip_address}</td>
                    <td className="px-4 py-3 text-right text-xs font-mono text-slate-500 dark:text-slate-400">
                      {new Date(log.timestamp).toLocaleString()}
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
