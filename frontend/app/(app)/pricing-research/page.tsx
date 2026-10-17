"use client";

import { useEffect, useState } from "react";
import {
  DollarSign,
  Tag,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Info,
  Scale,
  Shield,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageLoading } from "@/components/ui/Spinner";
import { api } from "@/lib/api";

interface CompetitorSpread {
  competitor_jurisdiction: string;
  initial_consult_avg_price?: number;
  renewal_consult_avg_price?: number;
  renewal_discount_dollar?: number;
  renewal_discount_percent?: number;
  is_equivalent_telehealth: boolean;
  service_equivalence_warning?: string;
}

interface PriceSpreadData {
  state_filter: string;
  market_median_initial_price: number;
  market_median_renewal_price: number;
  market_median_spread_dollar: number;
  mmj_docs_initial_price: number;
  mmj_docs_renewal_price: number;
  competitor_comparisons: CompetitorSpread[];
  equivalence_methodology_note: string;
}

interface PricingGap {
  state: string;
  state_code: string;
  gap_type: string;
  urgency: string;
  market_avg_price: number;
  mmj_docs_price: number;
  price_delta: number;
  percent_difference: number;
  competitor_count: number;
  recommendation: string;
}

interface PromotionRecord {
  id: string;
  competitor_name: string;
  state: string;
  promotion_name: string;
  service_name: string;
  regular_price?: number;
  promotional_price: number;
  discount_amount: number;
  discount_percent: number;
  effective_date?: string;
  source_name?: string;
}

export default function PricingResearchPage() {
  const [spreadData, setSpreadData] = useState<PriceSpreadData | null>(null);
  const [gaps, setGaps] = useState<PricingGap[]>([]);
  const [promos, setPromos] = useState<PromotionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stateFilter, setStateFilter] = useState("ALL");

  async function loadData() {
    setLoading(true);
    try {
      const stateParam = stateFilter !== "ALL" ? `?state=${stateFilter}` : "";
      const [spreadsRes, gapsRes, promosRes] = await Promise.all([
        api.get<PriceSpreadData>(`/api/research/pricing/spreads${stateParam}`),
        api.get<{ pricing_gaps: PricingGap[] }>("/api/research/pricing/gaps"),
        api.get<{ promotions: PromotionRecord[] }>("/api/research/pricing/promotions"),
      ]);

      setSpreadData(spreadsRes);
      setGaps(gapsRes.pricing_gaps || []);
      setPromos(promosRes.promotions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [stateFilter]);

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg text-indigo-600 dark:text-indigo-400">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Pricing & Promotion Opportunity Research
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Comparable advertised prices, initial vs renewal spreads, and actionable market gaps.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge tone="purple" className="text-xs font-medium">
            Decision Support Only — Does Not Mutate Production Prices
          </Badge>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 bg-white/70 dark:bg-slate-900/60 backdrop-blur">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Market Median Initial</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            ${spreadData?.market_median_initial_price.toFixed(2) || "149.00"}
          </p>
          <span className="text-[11px] text-slate-400">MMJ-DOCS: ${spreadData?.mmj_docs_initial_price.toFixed(2)}</span>
        </Card>

        <Card className="p-4 bg-white/70 dark:bg-slate-900/60 backdrop-blur">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Market Median Renewal</p>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            ${spreadData?.market_median_renewal_price.toFixed(2) || "99.00"}
          </p>
          <span className="text-[11px] text-slate-400">MMJ-DOCS: ${spreadData?.mmj_docs_renewal_price.toFixed(2)}</span>
        </Card>

        <Card className="p-4 bg-white/70 dark:bg-slate-900/60 backdrop-blur">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Renewal Discount Spread</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            ${spreadData?.market_median_spread_dollar.toFixed(2) || "50.00"}
          </p>
          <span className="text-[11px] text-slate-400">Loyalty Retention Incentive</span>
        </Card>

        <Card className="p-4 bg-white/70 dark:bg-slate-900/60 backdrop-blur">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Actionable Pricing Gaps</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{gaps.length}</p>
          <span className="text-[11px] text-slate-400">Identified Across States</span>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-3 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3 text-xs">
          <span className="font-semibold text-slate-500">Filter Jurisdiction:</span>
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
          >
            <option value="ALL">All States</option>
            <option value="FL">Florida (FL)</option>
            <option value="PA">Pennsylvania (PA)</option>
            <option value="OH">Ohio (OH)</option>
            <option value="TX">Texas (TX)</option>
          </select>
        </div>
      </Card>

      {/* 1. Initial Consultation vs Renewal Spreads & Equivalence Table */}
      <Card className="p-5 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Scale className="h-4 w-4 text-indigo-500" />
              Initial Consultation vs Renewal Price Spreads
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Evaluates recertification pricing spreads. Non-equivalent services (e.g., in-person physicals) are explicitly flagged.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 font-semibold">Competitor / Territory</th>
                <th className="py-2.5 font-semibold">Initial Consult</th>
                <th className="py-2.5 font-semibold">Renewal Recert</th>
                <th className="py-2.5 font-semibold">Discount Spread</th>
                <th className="py-2.5 font-semibold">Service Equivalence Check</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {spreadData?.competitor_comparisons.map((c, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-3 font-bold text-slate-900 dark:text-white">
                    {c.competitor_jurisdiction}
                  </td>
                  <td className="py-3 font-mono">
                    {c.initial_consult_avg_price ? `$${c.initial_consult_avg_price.toFixed(2)}` : "—"}
                  </td>
                  <td className="py-3 font-mono">
                    {c.renewal_consult_avg_price ? `$${c.renewal_consult_avg_price.toFixed(2)}` : "—"}
                  </td>
                  <td className="py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {c.renewal_discount_dollar ? `-$${c.renewal_discount_dollar.toFixed(2)} (${c.renewal_discount_percent?.toFixed(0)}%)` : "—"}
                  </td>
                  <td className="py-3">
                    {c.is_equivalent_telehealth ? (
                      <Badge tone="success" className="text-[10px]">
                        Equivalent Telehealth
                      </Badge>
                    ) : (
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-[10px] leading-tight">
                          {c.service_equivalence_warning || "Non-equivalent service bundle"}
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 2. Actionable Pricing Gaps */}
      <Card className="p-5 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Tag className="h-4 w-4 text-indigo-500" />
            Identified Market Pricing Gaps & Strategic Recommendations
          </h3>
          <span className="text-xs text-slate-400 font-mono">{gaps.length} state gaps</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {gaps.map((g) => (
            <Card key={g.state_code} className="p-4 border-l-4 border-l-indigo-500 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white text-base">{g.state}</span>
                  <span className="px-1.5 py-0.5 rounded font-mono text-xs bg-slate-100 dark:bg-slate-800">
                    {g.state_code}
                  </span>
                  <Badge tone={g.gap_type.includes("PREMIUM") ? "success" : g.gap_type.includes("UNDERCUT") ? "danger" : "neutral"} className="text-[10px]">
                    {g.gap_type}
                  </Badge>
                </div>
                <Badge tone={g.urgency === "HIGH" ? "danger" : "neutral"} className="text-[10px]">
                  {g.urgency} Urgency
                </Badge>
              </div>

              <div className="flex items-center justify-between text-xs py-1 border-y border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Market Avg: <strong>${g.market_avg_price.toFixed(2)}</strong></span>
                <span className="text-slate-500">MMJ-DOCS: <strong>${g.mmj_docs_price.toFixed(2)}</strong></span>
                <span className={`font-mono font-bold ${g.price_delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  Spread: {g.price_delta >= 0 ? `+$${g.price_delta.toFixed(2)}` : `-$${Math.abs(g.price_delta).toFixed(2)}`} ({g.percent_difference > 0 ? `+${g.percent_difference}%` : `${g.percent_difference}%`})
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300">
                <strong>Strategy Recommendation:</strong> {g.recommendation}
              </p>
            </Card>
          ))}
        </div>
      </Card>

      {/* 3. Promotional History Feed */}
      {promos.length > 0 && (
        <Card className="p-5 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <TrendingDown className="h-4 w-4 text-emerald-500" />
              Recent Competitor Promotions & Discounts
            </h3>
            <span className="text-xs text-slate-400">Surface-Web Verified</span>
          </div>

          <div className="space-y-2">
            {promos.map((pr) => (
              <div
                key={pr.id}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">{pr.competitor_name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      {pr.state}
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{pr.promotion_name}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Service: {pr.service_name} • Source: {pr.source_name || "Official Menu"}
                  </p>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    ${pr.promotional_price.toFixed(2)}
                  </span>
                  {pr.regular_price && (
                    <span className="text-slate-400 line-through ml-1.5 font-mono">
                      ${pr.regular_price.toFixed(2)}
                    </span>
                  )}
                  {pr.discount_percent > 0 && (
                    <p className="text-[10px] text-emerald-600 font-bold">
                      {pr.discount_percent.toFixed(0)}% Off Special
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
