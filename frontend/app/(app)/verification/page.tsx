"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageLoading } from "@/components/ui/Spinner";

interface VerificationItem {
  id: string;
  sku: string;
  title: string;
  match_confidence: number;
  status: string;
}

export default function VerificationPage() {
  const [items, setItems] = useState<VerificationItem[] | null>(null);

  useEffect(() => {
    api.get<VerificationItem[]>("/api/verification").then(setItems).catch(() => setItems([]));
  }, []);

  if (!items) return <PageLoading />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-200 sm:text-2xl">
          Automated Verification Engine
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Automated GTIN, Model SKU, and Title match confidence scoring across target sources.
        </p>
      </div>

      <Card>
        <CardBody className="p-0 overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="border-b border-slate-200 dark:border-slate-800/60 bg-slate-50/80 dark:bg-slate-900/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3.5">Verification ID</th>
                <th className="px-4 py-3.5">SKU / Model</th>
                <th className="px-4 py-3.5">Product Title</th>
                <th className="px-4 py-3.5 min-w-[180px]">Match Confidence</th>
                <th className="px-4 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                    No verification records available.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const percent = Math.round(item.match_confidence * 100);
                  const isHigh = percent >= 80;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-500 dark:text-slate-400">{item.id}</td>
                      <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-900 dark:text-slate-200">{item.sku}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-slate-200">{item.title}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-24 rounded-full bg-slate-100 dark:bg-slate-900/50 overflow-hidden shrink-0">
                            <div
                              className={`h-full rounded-full ${isHigh ? "bg-emerald-500" : "bg-amber-500"}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="font-extrabold text-xs text-slate-900 dark:text-slate-200 font-mono">{percent}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge tone={item.status === "VERIFIED" ? "success" : "danger"}>{item.status}</Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}

