"use client";

import { useEffect, useState } from "react";
import {
  Swords,
  TrendingDown,
  Sparkles,
  MapPin,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertTriangle,
  Info,
  Calendar,
  Layers,
} from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PageLoading } from "@/components/ui/Spinner";
import { api } from "@/lib/api";

interface PatternRecord {
  id: string;
  pattern_type: string;
  competitor_name: string;
  state: string;
  title: string;
  description: string;
  observation_count: number;
  time_horizon_days: number;
  confidence_score: number;
  is_sustained: boolean;
  supporting_records: string[];
  is_dismissed: boolean;
  dismissal_reason?: string;
  dismissed_by?: string;
  dismissed_at?: string;
  detected_at?: string;
}

export default function CompetitivePatternsPage() {
  const [patterns, setPatterns] = useState<PatternRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stateFilter, setStateFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [includeDismissed, setIncludeDismissed] = useState(false);
  const [timeHorizon, setTimeHorizon] = useState("90");

  const [dismissModal, setDismissModal] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<PatternRecord | null>(null);
  const [dismissReason, setDismissReason] = useState("");

  async function loadPatterns() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (stateFilter !== "ALL") params.append("state", stateFilter);
      params.append("include_dismissed", String(includeDismissed));
      params.append("time_horizon_days", timeHorizon);

      const res = await api.get<{ patterns: PatternRecord[] }>(`/api/research/competitive/patterns?${params.toString()}`);
      setPatterns(res.patterns || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPatterns();
  }, [stateFilter, includeDismissed, timeHorizon]);

  async function handleDismiss() {
    if (!selectedPattern || !dismissReason.trim()) return;
    try {
      await api.post(`/api/research/competitive/patterns/${selectedPattern.id}/dismiss`, {
        reason: dismissReason,
      });
      setDismissModal(false);
      setDismissReason("");
      setSelectedPattern(null);
      loadPatterns();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleRestore(patternId: string) {
    try {
      await api.post(`/api/research/competitive/patterns/${patternId}/restore`, {});
      loadPatterns();
    } catch (err) {
      console.error(err);
    }
  }

  const filteredPatterns = patterns.filter((p) => {
    if (typeFilter !== "ALL" && p.pattern_type !== typeFilter) return false;
    return true;
  });

  const sustainedCount = patterns.filter((p) => p.is_sustained && !p.is_dismissed).length;
  const promoCount = patterns.filter((p) => p.pattern_type === "PROMOTION_SURGE" && !p.is_dismissed).length;
  const dismissedCount = patterns.filter((p) => p.is_dismissed).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg text-indigo-600 dark:text-indigo-400">
            <Swords className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Competitive Intelligence Pattern Analysis
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Distinguishing sustained strategic market movements from temporary promotional noise.
            </p>
          </div>
        </div>

        <Button size="sm" variant="secondary" onClick={loadPatterns} className="flex items-center gap-1.5 self-start sm:self-auto">
          <Clock className="h-4 w-4" />
          Refresh Detection
        </Button>
      </div>

      {/* Compliance & Methodology Alert */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300 flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            Surface-Web Empirical Observation Standard
          </p>
          <p>
            Patterns are synthesized from publicly observable website updates, advertised price menus, and Department of Health announcements.
            <strong> Critical Rule:</strong> A competitor’s advertised price does not equal its actual realized transaction price (phone vouchers, referral discounts, and seasonal coupons may vary).
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 bg-white/70 dark:bg-slate-900/60 backdrop-blur">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Patterns Identified</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{patterns.length}</p>
        </Card>
        <Card className="p-4 bg-white/70 dark:bg-slate-900/60 backdrop-blur">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Sustained Market Shifts</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{sustainedCount}</p>
        </Card>
        <Card className="p-4 bg-white/70 dark:bg-slate-900/60 backdrop-blur">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Promotion Surges</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{promoCount}</p>
        </Card>
        <Card className="p-4 bg-white/70 dark:bg-slate-900/60 backdrop-blur">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">False-Positives Dismissed</p>
          <p className="text-2xl font-bold text-slate-500 dark:text-slate-400 mt-1">{dismissedCount}</p>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-3.5 bg-white dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <span className="font-semibold text-slate-500 mr-1.5">State:</span>
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="ALL">All States</option>
                <option value="FL">Florida (FL)</option>
                <option value="PA">Pennsylvania (PA)</option>
                <option value="CA">California (CA)</option>
                <option value="TX">Texas (TX)</option>
                <option value="OH">Ohio (OH)</option>
              </select>
            </div>

            <div>
              <span className="font-semibold text-slate-500 mr-1.5">Type:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="ALL">All Pattern Types</option>
                <option value="SUSTAINED_PRICE_DROP">Sustained Price Drop</option>
                <option value="PROMOTION_SURGE">Promotion Surge</option>
                <option value="GEOGRAPHIC_EXPANSION">Geographic Expansion</option>
                <option value="PRICE_INCREASE">Price Increase</option>
              </select>
            </div>

            <div>
              <span className="font-semibold text-slate-500 mr-1.5">Time Horizon:</span>
              <select
                value={timeHorizon}
                onChange={(e) => setTimeHorizon(e.target.value)}
                className="p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="30">30 Days</option>
                <option value="60">60 Days</option>
                <option value="90">90 Days</option>
                <option value="180">180 Days</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              checked={includeDismissed}
              onChange={(e) => setIncludeDismissed(e.target.checked)}
              className="rounded text-indigo-600"
            />
            <span>Show Dismissed False-Positives</span>
          </label>
        </div>
      </Card>

      {/* Pattern Cards Feed */}
      {loading ? (
        <PageLoading />
      ) : filteredPatterns.length === 0 ? (
        <Card className="p-12 text-center text-slate-500">
          No competitor patterns detected matching the selected criteria.
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPatterns.map((p) => (
            <Card
              key={p.id}
              className={`p-5 transition-all ${
                p.is_dismissed
                  ? "opacity-60 bg-slate-50/80 dark:bg-slate-900/40 border-dashed"
                  : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-base">
                      {p.competitor_name}
                    </span>
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {p.state}
                    </span>
                    <Badge tone={p.pattern_type.includes("DROP") ? "danger" : p.pattern_type.includes("PROMO") ? "warning" : "info"}>
                      {p.pattern_type}
                    </Badge>
                    <Badge tone={p.is_sustained ? "success" : "neutral"} className="text-[10px]">
                      {p.is_sustained ? "Sustained Trend" : "Temporary Spike"}
                    </Badge>
                    {p.is_dismissed && (
                      <Badge tone="danger" className="text-[10px]">
                        DISMISSED FALSE-POSITIVE
                      </Badge>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white pt-1">
                    {p.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
                    {p.description}
                  </p>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5 shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                      {(p.confidence_score * 100).toFixed(0)}% Confidence
                    </span>
                    <p className="text-[11px] text-slate-400">
                      {p.observation_count} Supporting Records
                    </p>
                  </div>

                  <div className="pt-2">
                    {p.is_dismissed ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRestore(p.id)}
                        className="text-xs flex items-center gap-1"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restore Pattern
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setSelectedPattern(p);
                          setDismissModal(true);
                        }}
                        className="text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Dismiss False-Positive
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Dismissal Reason Callout */}
              {p.is_dismissed && p.dismissal_reason && (
                <div className="mt-3 p-2.5 rounded bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-900 dark:text-rose-200">
                  <strong>Dismissal Rationale:</strong> {p.dismissal_reason} (By: {p.dismissed_by || "Analyst"})
                </div>
              )}

              {/* Strategic Context Footer */}
              <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <Info className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Observed over {p.time_horizon_days}-day temporal window.</span>
                </div>
                <span>Detected: {p.detected_at ? new Date(p.detected_at).toLocaleDateString() : "Recent"}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* False-Positive Dismissal Modal */}
      {dismissModal && selectedPattern && (
        <Modal
          open={dismissModal}
          onClose={() => setDismissModal(false)}
          title={`Dismiss False-Positive: ${selectedPattern.competitor_name}`}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Please document why this detected movement is a false-positive or non-material noise
              (e.g., temporary promotional voucher, scraper parsing glitch, or test menu listing).
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Reason for Dismissal
              </label>
              <textarea
                value={dismissReason}
                onChange={(e) => setDismissReason(e.target.value)}
                rows={3}
                placeholder="Document analytical rationale for audit log..."
                className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setDismissModal(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleDismiss} className="bg-rose-600 hover:bg-rose-500 text-white border-0">
                Confirm Dismissal
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
