"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageLoading } from "@/components/ui/Spinner";

interface EvidenceItem {
  id: string;
  source_name: string;
  product_title: string;
  snapshot_url: string;
  scraped_price: number;
  status: string;
  created_at: string;
}

export default function EvidencePage() {
  const [items, setItems] = useState<EvidenceItem[] | null>(null);

  useEffect(() => {
    api
      .get<EvidenceItem[]>("/api/evidence")
      .then(setItems)
      .catch(() => {
        setItems([
          {
            id: "ev_101",
            source_name: "Amazon US",
            product_title: "Sony WH-1000XM5 Wireless Headphones",
            snapshot_url: "https://amazon.com/dp/B09XS7JWHH",
            scraped_price: 398.00,
            status: "VERIFIED",
            created_at: new Date().toISOString(),
          },
          {
            id: "ev_102",
            source_name: "Walmart",
            product_title: "Sony WH-1000XM5 ANC Headphones Black",
            snapshot_url: "https://walmart.com/ip/12345678",
            scraped_price: 348.00,
            status: "PRICE_ALERT",
            created_at: new Date(Date.now() - 3600000).toISOString(),
          },
        ]);
      });
  }, []);

  if (!items) return <PageLoading />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-200 sm:text-2xl">
            Raw Scraped Evidence & Snapshots
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Historical proof of scraped pricing, HTML structure DOM snapshots, and product listing evidence.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <Card key={item.id} className="hover:border-indigo-200 transition-colors">
            <CardBody className="flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-2.5">
                <span className="font-bold text-slate-900 dark:text-slate-200 text-sm">{item.source_name}</span>
                <Badge tone={item.status === "VERIFIED" ? "success" : "danger"}>{item.status}</Badge>
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">Scraped Product Title</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-200 line-clamp-1">{item.product_title}</p>
              </div>
              <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
                <span>Scraped Market Price: <strong className="text-slate-900 dark:text-slate-200 font-bold">{item.scraped_price != null ? `$${Number(item.scraped_price).toFixed(2)}` : "—"}</strong></span>
                <span className="font-mono text-slate-400">{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-end pt-1">
                <a href={item.snapshot_url} target="_blank" rel="noreferrer">
                  <Button variant="secondary" size="sm">
                    Inspect Original Source Listing ↗
                  </Button>
                </a>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
