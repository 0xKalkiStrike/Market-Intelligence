"use client";

import React, { useState, useEffect } from "react";
import {
  Sliders,
  Play,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Users,
  Building,
  RefreshCw,
  FolderOpen,
  ArrowRight,
  HelpCircle,
  BarChart3,
  Percent,
} from "lucide-react";
import { api } from "@/lib/api";

interface ProbabilisticCase {
  description: string;
  annual_patients: number;
  gross_revenue: number;
  net_margin: number;
  roi_percent: number;
}

interface SensitivityCell {
  conversion_rate: number;
  projected_patients: number;
  projected_net_margin: number;
}

interface SensitivityRow {
  test_price: number;
  outcomes: SensitivityCell[];
}

interface ScenarioResult {
  scenario_name: string;
  scenario_type: string;
  target_state: string;
  evidence_quality_score: number;
  comparison_summary: {
    patient_volume_delta: number;
    gross_revenue_delta: number;
    net_margin_delta: number;
    roi_delta_pct: number;
    strategic_recommendation: string;
  };
  baseline: {
    assumptions: any;
    annual_certified_patients: number;
    gross_revenue: number;
    operating_costs: number;
    net_margin: number;
    roi_percent: number;
  };
  candidate: {
    assumptions: any;
    annual_certified_patients: number;
    capacity_ceiling: number;
    capacity_utilization_pct: number;
    gross_revenue: number;
    operating_costs: number;
    net_margin: number;
    roi_percent: number;
  };
  probabilistic_projections: {
    downside_case: ProbabilisticCase;
    base_case: ProbabilisticCase;
    best_case: ProbabilisticCase;
  };
  sensitivity_matrix: SensitivityRow[];
  limitations: string[];
  zero_mutation_guarantee: string;
  saved_scenario_id?: string;
}

interface SavedScenarioSummary {
  id: string;
  name: string;
  scenario_type: string;
  target_state: string;
  created_at: string;
  created_by: string;
  baseline_assumptions: any;
  candidate_assumptions: any;
  results_summary: any;
}

export default function ScenarioComparisonPage() {
  const [scenarioName, setScenarioName] = useState("Florida 2026 Expansion Strategy");
  const [scenarioType, setScenarioType] = useState("STATE_EXPANSION");
  const [targetState, setTargetState] = useState("FL");

  // Baseline state
  const [basePrice, setBasePrice] = useState(139);
  const [basePhysicians, setBasePhysicians] = useState(5);
  const [baseMarketing, setBaseMarketing] = useState(5000);
  const [baseConversion, setBaseConversion] = useState(3.5);
  const [baseOverhead, setBaseOverhead] = useState(25000);

  // Candidate state
  const [candPrice, setCandPrice] = useState(129);
  const [candPhysicians, setCandPhysicians] = useState(8);
  const [candMarketing, setCandMarketing] = useState(8000);
  const [candConversion, setCandConversion] = useState(4.5);
  const [candOverhead, setCandOverhead] = useState(35000);
  const [candElasticity, setCandElasticity] = useState(-1.2);

  const [loading, setLoading] = useState(false);
  const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(null);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenarioSummary[]>([]);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Run simulation
  const runSimulation = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const payload = {
        scenario_name: scenarioName,
        scenario_type: scenarioType,
        target_state: targetState,
        baseline_inputs: {
          price: Number(basePrice),
          physician_count: Number(basePhysicians),
          monthly_marketing_spend: Number(baseMarketing),
          expected_conversion_rate: Number(baseConversion) / 100.0,
          price_elasticity: -1.2,
          setup_overhead: Number(baseOverhead),
        },
        candidate_inputs: {
          price: Number(candPrice),
          physician_count: Number(candPhysicians),
          monthly_marketing_spend: Number(candMarketing),
          expected_conversion_rate: Number(candConversion) / 100.0,
          price_elasticity: Number(candElasticity),
          setup_overhead: Number(candOverhead),
        },
        save_definition: true,
      };

      const res = await api.post<ScenarioResult>("/api/research/scenarios/compare", payload);
      setScenarioResult(res);
      fetchSavedScenarios();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to execute scenario simulation");
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedScenarios = async () => {
    try {
      const res = await api.get<{ scenarios: SavedScenarioSummary[] }>("/api/research/scenarios");
      setSavedScenarios(res.scenarios || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSavedScenarios();
    // Auto-run first simulation
    runSimulation();
  }, []);

  const loadSavedScenario = (sc: SavedScenarioSummary) => {
    setScenarioName(sc.name);
    setScenarioType(sc.scenario_type);
    setTargetState(sc.target_state);

    if (sc.baseline_assumptions) {
      setBasePrice(sc.baseline_assumptions.price ?? 139);
      setBasePhysicians(sc.baseline_assumptions.physician_count ?? 5);
      setBaseMarketing(sc.baseline_assumptions.monthly_marketing_spend ?? 5000);
      setBaseConversion((sc.baseline_assumptions.expected_conversion_rate ?? 0.035) * 100);
      setBaseOverhead(sc.baseline_assumptions.setup_overhead ?? 25000);
    }

    if (sc.candidate_assumptions) {
      setCandPrice(sc.candidate_assumptions.price ?? 129);
      setCandPhysicians(sc.candidate_assumptions.physician_count ?? 8);
      setCandMarketing(sc.candidate_assumptions.monthly_marketing_spend ?? 8000);
      setCandConversion((sc.candidate_assumptions.expected_conversion_rate ?? 0.045) * 100);
      setCandOverhead(sc.candidate_assumptions.setup_overhead ?? 35000);
      setCandElasticity(sc.candidate_assumptions.price_elasticity ?? -1.2);
    }

    setShowSavedModal(false);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-950/80 px-3 py-0.5 text-xs font-bold text-emerald-300 border border-emerald-800/50 mb-2">
            <ShieldCheck className="h-3.5 w-3.5" /> ZERO-MUTATION ISOLATED WORKSPACE
          </div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5 sm:text-3xl">
            <Sliders className="h-7 w-7 text-emerald-400" /> Scenario Studio & Strategy Comparison
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Evaluate strategic expansions, promotional price points, and physician coverage allocations with probabilistic 3-case projections and multi-dimensional sensitivity analysis. Simulations remain strictly isolated from production records.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSavedModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <FolderOpen className="h-4 w-4 text-slate-400" /> Saved Scenarios ({savedScenarios.length})
          </button>
          <button
            onClick={runSimulation}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-lg transition-colors disabled:opacity-50"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-white" />}
            Run Simulation
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Scenario Metadata Bar */}
        <div className="lg:col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Scenario Name
              </label>
              <input
                type="text"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Strategy Domain
              </label>
              <select
                value={scenarioType}
                onChange={(e) => setScenarioType(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="STATE_EXPANSION">Geographic State Expansion</option>
                <option value="PRICING">Pricing & Discount Strategy</option>
                <option value="PHYSICIAN_CAPACITY">Physician Coverage & Capacity</option>
                <option value="MULTI_STRATEGY">Multi-Variable Strategy</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Target Market / Region
              </label>
              <select
                value={targetState}
                onChange={(e) => setTargetState(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="FL">Florida (FL)</option>
                <option value="PA">Pennsylvania (PA)</option>
                <option value="OH">Ohio (OH)</option>
                <option value="TX">Texas (TX)</option>
                <option value="NY">New NY</option>
                <option value="CA">California (CA)</option>
                <option value="IL">Illinois (IL)</option>
                <option value="MI">Michigan (MI)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Baseline Inputs Card */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-extrabold text-slate-200">Baseline Assumptions</h2>
              <p className="text-[11px] text-slate-400">Current observed status quo operations</p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
              STATUS QUO
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">Consultation Price ($)</label>
              <input
                type="number"
                value={basePrice}
                onChange={(e) => setBasePrice(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">Active Physicians</label>
              <input
                type="number"
                value={basePhysicians}
                onChange={(e) => setBasePhysicians(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">Monthly Marketing ($)</label>
              <input
                type="number"
                value={baseMarketing}
                onChange={(e) => setBaseMarketing(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">Conversion Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={baseConversion}
                onChange={(e) => setBaseConversion(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white font-mono"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] text-slate-400 font-medium block mb-1">Setup / Overhead Capital ($)</label>
              <input
                type="number"
                value={baseOverhead}
                onChange={(e) => setBaseOverhead(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Candidate Strategy Inputs Card */}
        <div className="lg:col-span-6 rounded-2xl border border-emerald-900/60 bg-emerald-950/20 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-900/40 pb-3">
            <div>
              <h2 className="text-sm font-extrabold text-emerald-300">Candidate Strategy Model</h2>
              <p className="text-[11px] text-emerald-400/70">Hypothetical parameters under test</p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-900/60 text-emerald-300 border border-emerald-700/60">
              SIMULATION CANDIDATE
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-emerald-300/80 font-medium block mb-1">Candidate Price ($)</label>
              <input
                type="number"
                value={candPrice}
                onChange={(e) => setCandPrice(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-950 border border-emerald-800/80 px-3 py-2 text-xs text-emerald-100 font-mono focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[11px] text-emerald-300/80 font-medium block mb-1">Target Physicians</label>
              <input
                type="number"
                value={candPhysicians}
                onChange={(e) => setCandPhysicians(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-950 border border-emerald-800/80 px-3 py-2 text-xs text-emerald-100 font-mono focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[11px] text-emerald-300/80 font-medium block mb-1">Monthly Marketing ($)</label>
              <input
                type="number"
                value={candMarketing}
                onChange={(e) => setCandMarketing(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-950 border border-emerald-800/80 px-3 py-2 text-xs text-emerald-100 font-mono focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[11px] text-emerald-300/80 font-medium block mb-1">Conversion Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={candConversion}
                onChange={(e) => setCandConversion(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-950 border border-emerald-800/80 px-3 py-2 text-xs text-emerald-100 font-mono focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[11px] text-emerald-300/80 font-medium block mb-1">Setup / Capital ($)</label>
              <input
                type="number"
                value={candOverhead}
                onChange={(e) => setCandOverhead(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-950 border border-emerald-800/80 px-3 py-2 text-xs text-emerald-100 font-mono focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[11px] text-emerald-300/80 font-medium block mb-1">Price Elasticity (β)</label>
              <input
                type="number"
                step="0.1"
                value={candElasticity}
                onChange={(e) => setCandElasticity(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-950 border border-emerald-800/80 px-3 py-2 text-xs text-emerald-100 font-mono focus:border-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Simulation Results Display */}
      {scenarioResult && (
        <div className="space-y-6">
          {/* Executive Delta Summary Banner */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  STRATEGIC DELTA OVERVIEW
                </span>
                <h3 className="text-lg font-extrabold text-white">
                  {scenarioResult.comparison_summary.strategic_recommendation}
                </h3>
                <p className="text-xs text-slate-400">
                  Evidence Quality Score:{" "}
                  <span className="font-bold text-emerald-400">
                    {Math.round(scenarioResult.evidence_quality_score * 100)}%
                  </span>{" "}
                  • Target: <span className="font-semibold text-white">{scenarioResult.target_state}</span>
                </p>
              </div>

              {/* KPI Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Net Margin Δ</span>
                  <span
                    className={`text-base font-extrabold font-mono ${
                      scenarioResult.comparison_summary.net_margin_delta >= 0
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }`}
                  >
                    {scenarioResult.comparison_summary.net_margin_delta >= 0 ? "+" : ""}
                    ${scenarioResult.comparison_summary.net_margin_delta.toLocaleString()}
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Revenue Δ</span>
                  <span
                    className={`text-base font-extrabold font-mono ${
                      scenarioResult.comparison_summary.gross_revenue_delta >= 0
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }`}
                  >
                    {scenarioResult.comparison_summary.gross_revenue_delta >= 0 ? "+" : ""}
                    ${scenarioResult.comparison_summary.gross_revenue_delta.toLocaleString()}
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Patient Volume Δ</span>
                  <span
                    className={`text-base font-extrabold font-mono ${
                      scenarioResult.comparison_summary.patient_volume_delta >= 0
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }`}
                  >
                    {scenarioResult.comparison_summary.patient_volume_delta >= 0 ? "+" : ""}
                    {scenarioResult.comparison_summary.patient_volume_delta.toLocaleString()}
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">ROI Δ</span>
                  <span
                    className={`text-base font-extrabold font-mono ${
                      scenarioResult.comparison_summary.roi_delta_pct >= 0
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }`}
                  >
                    {scenarioResult.comparison_summary.roi_delta_pct >= 0 ? "+" : ""}
                    {scenarioResult.comparison_summary.roi_delta_pct}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Side by Side Detailed Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Baseline Detail */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Building className="h-4 w-4 text-slate-400" /> Baseline Status Quo Output
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Annual Certified Patients:</span>
                  <span className="font-mono font-bold text-white">
                    {scenarioResult.baseline.annual_certified_patients.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Annual Gross Revenue:</span>
                  <span className="font-mono font-bold text-white">
                    ${scenarioResult.baseline.gross_revenue.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Annual Operating Costs:</span>
                  <span className="font-mono font-bold text-slate-300">
                    ${scenarioResult.baseline.operating_costs.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Annual Net Margin:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    ${scenarioResult.baseline.net_margin.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Return on Investment (ROI):</span>
                  <span className="font-mono font-bold text-white">
                    {scenarioResult.baseline.roi_percent}%
                  </span>
                </div>
              </div>
            </div>

            {/* Candidate Detail */}
            <div className="rounded-2xl border border-emerald-800/60 bg-emerald-950/20 p-5 space-y-3">
              <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" /> Candidate Strategy Output
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-emerald-900/40">
                  <span className="text-slate-400">Annual Certified Patients:</span>
                  <span className="font-mono font-bold text-emerald-300">
                    {scenarioResult.candidate.annual_certified_patients.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-emerald-900/40">
                  <span className="text-slate-400">Physician Capacity Ceiling:</span>
                  <span className="font-mono text-slate-300">
                    {scenarioResult.candidate.capacity_ceiling.toLocaleString()} pts/yr ({scenarioResult.candidate.capacity_utilization_pct}% utilized)
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-emerald-900/40">
                  <span className="text-slate-400">Annual Gross Revenue:</span>
                  <span className="font-mono font-bold text-white">
                    ${scenarioResult.candidate.gross_revenue.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-emerald-900/40">
                  <span className="text-slate-400">Annual Operating Costs:</span>
                  <span className="font-mono font-bold text-slate-300">
                    ${scenarioResult.candidate.operating_costs.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-emerald-900/40">
                  <span className="text-slate-400">Annual Net Margin:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    ${scenarioResult.candidate.net_margin.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Return on Investment (ROI):</span>
                  <span className="font-mono font-bold text-emerald-300">
                    {scenarioResult.candidate.roi_percent}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Probabilistic 3-Case Projections */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-400" /> Probabilistic Range (Downside, Base, Best Case)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Downside Case */}
              <div className="rounded-2xl border border-rose-900/60 bg-rose-950/20 p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-rose-900/40 pb-2">
                  <span className="text-xs font-extrabold text-rose-300">Downside Case</span>
                  <TrendingDown className="h-4 w-4 text-rose-400" />
                </div>
                <p className="text-[11px] text-rose-400/80">
                  {scenarioResult.probabilistic_projections.downside_case.description}
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Patients:</span>
                    <span className="font-mono font-bold text-white">
                      {scenarioResult.probabilistic_projections.downside_case.annual_patients.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Revenue:</span>
                    <span className="font-mono font-bold text-white">
                      ${scenarioResult.probabilistic_projections.downside_case.gross_revenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Net Margin:</span>
                    <span className="font-mono font-bold text-rose-400">
                      ${scenarioResult.probabilistic_projections.downside_case.net_margin.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ROI:</span>
                    <span className="font-mono font-bold text-rose-300">
                      {scenarioResult.probabilistic_projections.downside_case.roi_percent}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Base Case */}
              <div className="rounded-2xl border border-indigo-900/60 bg-indigo-950/20 p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-indigo-900/40 pb-2">
                  <span className="text-xs font-extrabold text-indigo-300">Expected Base Case</span>
                  <CheckCircle2 className="h-4 w-4 text-indigo-400" />
                </div>
                <p className="text-[11px] text-indigo-400/80">
                  {scenarioResult.probabilistic_projections.base_case.description}
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Patients:</span>
                    <span className="font-mono font-bold text-white">
                      {scenarioResult.probabilistic_projections.base_case.annual_patients.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Revenue:</span>
                    <span className="font-mono font-bold text-white">
                      ${scenarioResult.probabilistic_projections.base_case.gross_revenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Net Margin:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      ${scenarioResult.probabilistic_projections.base_case.net_margin.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ROI:</span>
                    <span className="font-mono font-bold text-indigo-300">
                      {scenarioResult.probabilistic_projections.base_case.roi_percent}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Best Case */}
              <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/20 p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-900/40 pb-2">
                  <span className="text-xs font-extrabold text-emerald-300">Best Case</span>
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="text-[11px] text-emerald-400/80">
                  {scenarioResult.probabilistic_projections.best_case.description}
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Patients:</span>
                    <span className="font-mono font-bold text-white">
                      {scenarioResult.probabilistic_projections.best_case.annual_patients.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Revenue:</span>
                    <span className="font-mono font-bold text-white">
                      ${scenarioResult.probabilistic_projections.best_case.gross_revenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Net Margin:</span>
                    <span className="font-mono font-bold text-emerald-300">
                      ${scenarioResult.probabilistic_projections.best_case.net_margin.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ROI:</span>
                    <span className="font-mono font-bold text-emerald-300">
                      {scenarioResult.probabilistic_projections.best_case.roi_percent}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Multi-Dimensional Sensitivity Analysis Matrix */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Percent className="h-4 w-4 text-emerald-400" /> Multi-Dimensional Sensitivity Matrix
              </h3>
              <span className="text-[10px] text-slate-500">
                Evaluating Price Variances vs Conversion Volatility
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Price Test Point</th>
                    <th className="py-2.5 px-3">Low Conversion (-20%)</th>
                    <th className="py-2.5 px-3">Base Conversion</th>
                    <th className="py-2.5 px-3">High Conversion (+20%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {scenarioResult.sensitivity_matrix.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-900/40">
                      <td className="py-3 px-3 font-bold text-white font-sans">
                        ${row.test_price.toFixed(2)}
                      </td>
                      {row.outcomes.map((cell, cIdx) => (
                        <td key={cIdx} className="py-3 px-3">
                          <div className="flex flex-col">
                            <span
                              className={`font-bold ${
                                cell.projected_net_margin >= 0
                                  ? "text-emerald-400"
                                  : "text-rose-400"
                              }`}
                            >
                              ${cell.projected_net_margin.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-slate-500 font-sans">
                              {cell.projected_patients.toLocaleString()} pts @ {(cell.conversion_rate * 100).toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Model Limitations & Zero-Mutation Disclosure */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Model Limitations & Zero-Mutation Disclosure
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-slate-400">
              <div className="space-y-1.5">
                <span className="font-semibold text-slate-300 block">Analytical Limitations:</span>
                <ul className="list-disc list-inside space-y-1">
                  {scenarioResult.limitations.map((lim, lIdx) => (
                    <li key={lIdx}>{lim}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-1.5 border-l border-slate-800/80 pl-4">
                <span className="font-semibold text-slate-300 block">Audit & Governance:</span>
                <p className="italic text-emerald-400/90">
                  {scenarioResult.zero_mutation_guarantee}
                </p>
                {scenarioResult.saved_scenario_id && (
                  <p className="text-[10px] font-mono text-slate-500 mt-2">
                    Scenario Definition ID: {scenarioResult.saved_scenario_id}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saved Scenarios Modal */}
      {showSavedModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-emerald-400" /> Saved Strategy Scenarios
              </h3>
              <button
                onClick={() => setShowSavedModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕ Close
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
              {savedScenarios.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">No saved scenarios yet.</p>
              ) : (
                savedScenarios.map((sc) => (
                  <div
                    key={sc.id}
                    onClick={() => loadSavedScenario(sc)}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-700/80 hover:bg-slate-900 cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white">{sc.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {sc.scenario_type} • State: {sc.target_state} • {new Date(sc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-500" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
