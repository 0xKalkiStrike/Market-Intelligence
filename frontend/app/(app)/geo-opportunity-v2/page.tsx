"use client";

import { useEffect, useState } from "react";
import {
  Compass,
  MapPin,
  TrendingUp,
  Sliders,
  History,
  AlertCircle,
  ShieldCheck,
  RotateCcw,
  Layers,
  ArrowUpDown,
  Info,
} from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageLoading } from "@/components/ui/Spinner";
import { api } from "@/lib/api";

interface FactorContribution {
  factor: string;
  weight: number;
  raw_value: string | number;
  normalized: number;
  contribution: number;
  direction: string;
}

interface GeoScoreResponse {
  geographic_level: string;
  geographic_id: string;
  model_version_tag: string;
  total_score: number;
  market_tier: string;
  freshness_penalty_points: number;
  data_freshness_days: number;
  factor_breakdown: FactorContribution[];
  missing_inputs: string[];
  is_simulation: boolean;
  assumptions: string[];
  limitations: string[];
}

interface ComparisonResult {
  comparison_count: number;
  geographic_level: string;
  ranked_geographies: GeoScoreResponse[];
  highest_opportunity: string;
}

export default function GeoOpportunityV2Page() {
  const [level, setLevel] = useState("STATE");
  const [targetId, setTargetId] = useState("FL");
  const [scoreData, setScoreData] = useState<GeoScoreResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Weight simulator state
  const [showSimulator, setShowSimulator] = useState(false);
  const [weights, setWeights] = useState({
    patient_pop_weight: 20.0,
    growth_rate_weight: 15.0,
    competitor_density_weight: 15.0,
    dispensary_density_weight: 15.0,
    physician_coverage_weight: 15.0,
    telehealth_allowed_weight: 10.0,
    pricing_opportunity_weight: 10.0,
  });

  // Multi-state comparison state
  const [comparisonData, setComparisonData] = useState<ComparisonResult | null>(null);
  const [comparing, setComparing] = useState(false);

  async function loadScore(customW?: typeof weights) {
    setLoading(true);
    try {
      if (customW) {
        // Run comparison with custom weights
        const comp = await api.post<ComparisonResult>("/api/research/geo/compare", {
          geographic_ids: [targetId],
          geographic_level: level,
          custom_weights: customW,
        });
        if (comp.ranked_geographies.length > 0) {
          setScoreData(comp.ranked_geographies[0]);
        }
      } else {
        const res = await api.get<GeoScoreResponse>(`/api/research/geo/score?level=${level}&geographic_id=${targetId}`);
        setScoreData(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadComparison() {
    setComparing(true);
    try {
      const res = await api.post<ComparisonResult>("/api/research/geo/compare", {
        geographic_ids: ["FL", "PA", "OH", "TX", "CA"],
        geographic_level: "STATE",
      });
      setComparisonData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setComparing(false);
    }
  }

  useEffect(() => {
    loadScore();
    loadComparison();
  }, [level, targetId]);

  function handleWeightChange(key: keyof typeof weights, val: number) {
    setWeights((prev) => ({ ...prev, [key]: val }));
  }

  function handleResetWeights() {
    const defaults = {
      patient_pop_weight: 20.0,
      growth_rate_weight: 15.0,
      competitor_density_weight: 15.0,
      dispensary_density_weight: 15.0,
      physician_coverage_weight: 15.0,
      telehealth_allowed_weight: 10.0,
      pricing_opportunity_weight: 10.0,
    };
    setWeights(defaults);
    loadScore();
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg text-indigo-600 dark:text-indigo-400">
            <Compass className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Advanced Geographic Opportunity Engine
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Multi-level opportunity evaluation across state, county, and ZIP boundaries with factor attribution.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowSimulator(!showSimulator)}
            className="flex items-center gap-1.5"
          >
            <Sliders className="h-4 w-4" />
            {showSimulator ? "Hide Weight Simulator" : "Simulate Weights"}
          </Button>
        </div>
      </div>

      {/* Target Level & Region Selector Toolbar */}
      <Card className="p-4 bg-white dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <span className="font-semibold text-slate-500 mr-1.5">Administrative Level:</span>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              >
                <option value="STATE">State Level (50 Jurisdictions)</option>
                <option value="COUNTY">County Level</option>
                <option value="ZIP">ZIP Code Level</option>
              </select>
            </div>

            <div>
              <span className="font-semibold text-slate-500 mr-1.5">Target Territory:</span>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold"
              >
                <option value="FL">Florida (FL)</option>
                <option value="PA">Pennsylvania (PA)</option>
                <option value="OH">Ohio (OH)</option>
                <option value="TX">Texas (TX)</option>
                <option value="CA">California (CA)</option>
                <option value="GA">Georgia (GA)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Zero-PHI Ingestion Guard Active</span>
          </div>
        </div>
      </Card>

      {/* Weight Simulator Drawer (What-If Weight Modeling) */}
      {showSimulator && (
        <Card className="p-5 bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Interactive What-If Scoring Weight Simulator
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={handleResetWeights} className="text-xs">
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset Defaults
              </Button>
              <Button size="sm" onClick={() => loadScore(weights)} className="text-xs">
                Recalculate Simulated Score
              </Button>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400">
            Adjusting weights here runs in-memory calculations without altering production scoring models or historical records.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div>
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                <span>Patient Pop Weight</span>
                <span className="font-mono font-bold">{weights.patient_pop_weight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                value={weights.patient_pop_weight}
                onChange={(e) => handleWeightChange("patient_pop_weight", Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                <span>Growth Rate Weight</span>
                <span className="font-mono font-bold">{weights.growth_rate_weight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={weights.growth_rate_weight}
                onChange={(e) => handleWeightChange("growth_rate_weight", Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                <span>Competitor Saturation</span>
                <span className="font-mono font-bold">{weights.competitor_density_weight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={weights.competitor_density_weight}
                onChange={(e) => handleWeightChange("competitor_density_weight", Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                <span>Dispensary Synergy</span>
                <span className="font-mono font-bold">{weights.dispensary_density_weight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={weights.dispensary_density_weight}
                onChange={(e) => handleWeightChange("dispensary_density_weight", Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                <span>Physician Coverage</span>
                <span className="font-mono font-bold">{weights.physician_coverage_weight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={weights.physician_coverage_weight}
                onChange={(e) => handleWeightChange("physician_coverage_weight", Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                <span>Telehealth Policy</span>
                <span className="font-mono font-bold">{weights.telehealth_allowed_weight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                value={weights.telehealth_allowed_weight}
                onChange={(e) => handleWeightChange("telehealth_allowed_weight", Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                <span>Pricing Opportunity</span>
                <span className="font-mono font-bold">{weights.pricing_opportunity_weight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                value={weights.pricing_opportunity_weight}
                onChange={(e) => handleWeightChange("pricing_opportunity_weight", Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>
          </div>
        </Card>
      )}

      {loading ? (
        <PageLoading />
      ) : !scoreData ? (
        <Card className="p-12 text-center text-slate-500">Failed to calculate score.</Card>
      ) : (
        <div className="space-y-6">
          {/* Main Score Hero Card */}
          <Card className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white border-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded font-mono font-bold text-xs bg-white/20 text-white">
                    {scoreData.geographic_level}: {scoreData.geographic_id}
                  </span>
                  <span className="text-xs text-indigo-200 font-mono">
                    Model: {scoreData.model_version_tag}
                  </span>
                  {scoreData.is_simulation && (
                    <Badge tone="warning" className="text-[10px]">
                      WHAT-IF SIMULATION
                    </Badge>
                  )}
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold">{scoreData.market_tier}</h2>
                <p className="text-xs text-indigo-200/80 max-w-xl">
                  Score derived from 7 normalized factors. Data freshness age: {scoreData.data_freshness_days} days.
                </p>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <span className="text-xs uppercase tracking-wider text-indigo-300 font-semibold">
                  Composite Opportunity Score
                </span>
                <div className="text-4xl sm:text-5xl font-black tracking-tight text-white mt-1">
                  {scoreData.total_score.toFixed(1)}
                  <span className="text-lg font-normal text-indigo-300">/100</span>
                </div>
                {scoreData.freshness_penalty_points > 0 && (
                  <p className="text-[11px] text-amber-300 mt-1">
                    -{scoreData.freshness_penalty_points.toFixed(1)} pts freshness penalty applied
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Factor Breakdown Waterfall Table */}
          <Card className="p-5 bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-indigo-500" />
                Component Contribution Waterfall
              </h3>
              <span className="text-xs text-slate-400">Sum of Contributions = Total Score</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 font-semibold">Factor Dimension</th>
                    <th className="py-2.5 font-semibold">Direction</th>
                    <th className="py-2.5 font-semibold">Observed Value</th>
                    <th className="py-2.5 font-semibold">Normalized (0-1)</th>
                    <th className="py-2.5 font-semibold">Model Weight</th>
                    <th className="py-2.5 font-semibold text-right">Contribution Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {scoreData.factor_breakdown.map((f, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 font-semibold text-slate-900 dark:text-white">{f.factor}</td>
                      <td className="py-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                            f.direction === "POSITIVE"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : f.direction === "INVERSE"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                          }`}
                        >
                          {f.direction}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-slate-600 dark:text-slate-300">
                        {typeof f.raw_value === "number" ? f.raw_value.toLocaleString() : f.raw_value}
                      </td>
                      <td className="py-3 font-mono text-slate-500">{f.normalized.toFixed(2)}</td>
                      <td className="py-3 font-mono text-slate-500">{f.weight.toFixed(0)}%</td>
                      <td className="py-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        +{f.contribution.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Multi-State Side-by-Side Comparison Table */}
          {comparisonData && (
            <Card className="p-5 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ArrowUpDown className="h-4 w-4 text-indigo-500" />
                  Comparative State Opportunity Rankings
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  Leader: {comparisonData.highest_opportunity}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {comparisonData.ranked_geographies.map((cg, idx) => (
                  <div
                    key={cg.geographic_id}
                    onClick={() => setTargetId(cg.geographic_id)}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      cg.geographic_id === targetId
                        ? "border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-sm"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <span className="text-[10px] font-mono font-bold text-slate-400">#{idx + 1}</span>
                    <h4 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                      {cg.geographic_id}
                    </h4>
                    <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                      {cg.total_score.toFixed(1)}
                    </p>
                    <span className="text-[10px] text-slate-500 line-clamp-1 mt-1">
                      {cg.market_tier.split(":")[0]}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Methodological Guardrail Footer */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <p className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Info className="h-3.5 w-3.5 text-indigo-500" />
              Analytical Guardrails & Limitations
            </p>
            <p>
              High patient population or dispensary counts alone do not prove profitable commercial conversion.
              Scores represent multi-variable comparative proxies. All model versions and scoring snapshot executions are cryptographically logged for auditability.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
