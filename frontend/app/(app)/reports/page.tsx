"use client";

import { useState } from "react";
import { BarChart3, Tag, Zap } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function ReportsPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleExport = (format: string) => {
    setDownloading(format);
    setTimeout(() => {
      alert(`Report generated in ${format.toUpperCase()} format. Downloading...`);
      setDownloading(null);
    }, 800);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-200 sm:text-2xl">
          Export Market & Pricing Intelligence Reports
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Generate comprehensive analytics, price comparison summaries, and GTIN verification reports.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="hover:border-indigo-300 transition-colors">
          <CardBody className="flex flex-col gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 shadow-2xs">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-200 text-base">Full Product Catalog Export</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Includes SKU, Title, Base Price, Target Price, parsed specifications, and active source counts.
              </p>
            </div>
            <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800/60 flex gap-2">
              <Button size="sm" variant="secondary" className="flex-1" onClick={() => handleExport("csv")} isLoading={downloading === "csv"}>
                Export CSV
              </Button>
              <Button size="sm" variant="indigo" className="flex-1" onClick={() => handleExport("xlsx")} isLoading={downloading === "xlsx"}>
                Export Excel
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card className="hover:border-indigo-300 transition-colors">
          <CardBody className="flex flex-col gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 shadow-2xs">
              <Tag className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-200 text-base">Cross-Source Price Variance Matrix</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Detailed comparison table of product prices across Amazon, Walmart, BestBuy, eBay side-by-side.
              </p>
            </div>
            <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800/60 flex gap-2">
              <Button size="sm" variant="secondary" className="flex-1" onClick={() => handleExport("matrix-csv")} isLoading={downloading === "matrix-csv"}>
                Export CSV
              </Button>
              <Button size="sm" variant="indigo" className="flex-1" onClick={() => handleExport("matrix-xlsx")} isLoading={downloading === "matrix-xlsx"}>
                Export Excel
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card className="hover:border-indigo-300 transition-colors">
          <CardBody className="flex flex-col gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 shadow-2xs">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-200 text-base">Price Variance & Alert Summary</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Highlights products where competitor source prices fall below target price thresholds.
              </p>
            </div>
            <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800/60 flex gap-2">
              <Button size="sm" variant="secondary" className="flex-1" onClick={() => handleExport("alerts-csv")} isLoading={downloading === "alerts-csv"}>
                Export CSV
              </Button>
              <Button size="sm" variant="indigo" className="flex-1" onClick={() => handleExport("alerts-pdf")} isLoading={downloading === "alerts-pdf"}>
                Export PDF
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
