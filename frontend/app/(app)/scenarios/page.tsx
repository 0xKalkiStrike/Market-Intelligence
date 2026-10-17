"use client";

import { useEffect, useState } from "react";
import { Target, Calculator, DollarSign, MapPin, RefreshCw, AlertCircle, CheckCircle2, TrendingUp, Sparkles } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";

interface Simulation {
  id: string;
  name: string;
  scenario_type: string;
  target_state: string;
  results: unknown;
  assumptions: string;
  created_at: string;
}

interface PriceSimulationResult {
  projected_volume_change_pct: number;
  estimated_annual_revenue: number;
  competitive_position: string;
  assumptions: string[];
}

interface ExpansionSimulationResult {
  addressable_patient_population: number;
  projected_year1_revenue: number;
  estimated_payback_period_months: number;
  assumptions: string[];
}

export default function ScenariosPage() {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);

  // Price Simulation State
  const [priceState, setPriceState] = useState("FL");
  const [newPrice, setNewPrice] = useState(129.0);
  const [priceResult, setPriceResult] = useState<PriceSimulationResult | null>(null);
  const [priceSimulating, setPriceSimulating] = useState(false);

  // Expansion Simulation State
  const [expState, setExpState] = useState("TX");
  const [setupCost, setSetupCost] = useState(45000.0);
  const [expResult, setExpResult] = useState<ExpansionSimulationResult | null>(null);
  const [expSimulating, setExpSimulating] = useState(false);

  async function fetchSimulations() {
    setLoading(true);
    try {
      const json = await api.get<{ simulations: Simulation[] }>("/api/market-intelligence/ai/scenarios");
      setSimulations(json.simulations || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSimulations();
  }, []);

  async function handlePriceSimulate() {
    setPriceSimulating(true);
    try {
      const json = await api.post<PriceSimulationResult>("/api/market-intelligence/ai/scenarios/price-change", {
        state: priceState,
        new_price: Number(newPrice),
      });
      setPriceResult(json);
      fetchSimulations();
    } catch (e) {
      console.error(e);
    } finally {
      setPriceSimulating(false);
    }
  }

  async function handleExpSimulate() {
    setExpSimulating(true);
    try {
      const json = await api.post<ExpansionSimulationResult>("/api/market-intelligence/ai/scenarios/state-expansion", {
        state: expState,
        estimated_setup_cost: Number(setupCost),
      });
      setExpResult(json);
      fetchSimulations();
    } catch (e) {
      console.error(e);
    } finally {
      setExpSimulating(false);
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-14">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-950/80 px-3 py-0.5 text-xs font-bold text-indigo-300 border border-indigo-800/50 mb-1.5">
            DECISION-SUPPORT SCENARIO ENGINE
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5 sm:text-3xl">
            <Target className="h-7 w-7 text-indigo-400" /> Scenario Modeling & What-If Simulations
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Model &ldquo;What-If&rdquo; market scenarios for price changes and state expansions with explicit assumptions, elasticity estimates, and payback timelines.
          </p>
        </div>

        <button
          onClick={fetchSimulations}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors self-start md:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Models
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price Change Simulation Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 shadow-xl">
          <div className="border-b border-slate-800/80 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-400" /> Price Elasticity Simulator
            </h2>
            <span className="text-[10px] text-slate-400 font-mono">Elasticity: -1.2 MMJ</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Target State</label>
              <input
                type="text"
                value={priceState}
                onChange={(e) => setPriceState(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1">Proposed Price ($)</label>
              <input
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            onClick={handlePriceSimulate}
            disabled={priceSimulating}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white hover:from-emerald-500 hover:to-teal-500 shadow-md transition-all flex items-center justify-center gap-2"
          >
            {priceSimulating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
            {priceSimulating ? "Calculating Elasticity..." : "Run Price Change Simulation"}
          </button>

          {priceResult && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5 text-xs">
              <div className="flex items-center justify-between font-bold text-slate-200">
                <span>Simulated Volume Change:</span>
                <span className="text-emerald-400 text-sm font-extrabold">{priceResult.projected_volume_change_pct}</span>
              </div>
              <div className="flex items-center justify-between font-bold text-slate-200">
                <span>Est. Annual Revenue:</span>
                <span className="text-indigo-400 text-sm font-extrabold">${priceResult.estimated_annual_revenue?.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between font-bold text-slate-200">
                <span>Market Position:</span>
                <span className="text-amber-400 font-semibold">{priceResult.competitive_position}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                <span className="font-bold block text-slate-300">Model Assumptions:</span>
                {priceResult.assumptions?.map((a: string, i: number) => (
                  <div key={i}>• {a}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* State Expansion Simulation Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 shadow-xl">
          <div className="border-b border-slate-800/80 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-indigo-400" /> New State Expansion Simulator
            </h2>
            <span className="text-[10px] text-slate-400 font-mono">Penetration: 1.0% Y1</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Target Expansion State</label>
              <input
                type="text"
                value={expState}
                onChange={(e) => setExpState(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1">Est. Setup Cost ($)</label>
              <input
                type="number"
                value={setupCost}
                onChange={(e) => setSetupCost(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            onClick={handleExpSimulate}
            disabled={expSimulating}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:from-indigo-500 hover:to-violet-500 shadow-md transition-all flex items-center justify-center gap-2"
          >
            {expSimulating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
            {expSimulating ? "Modeling Expansion..." : "Run State Expansion Simulation"}
          </button>

          {expResult && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5 text-xs">
              <div className="flex items-center justify-between font-bold text-slate-200">
                <span>Addressable Patient Pop:</span>
                <span className="text-blue-400 text-sm font-extrabold">{expResult.addressable_patient_population?.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between font-bold text-slate-200">
                <span>Projected Year 1 Revenue:</span>
                <span className="text-emerald-400 text-sm font-extrabold">${expResult.projected_year1_revenue?.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between font-bold text-slate-200">
                <span>Est. Payback Period:</span>
                <span className="text-amber-400 font-extrabold">{expResult.estimated_payback_period_months} months</span>
              </div>
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                <span className="font-bold block text-slate-300">Model Assumptions:</span>
                {expResult.assumptions?.map((a: string, i: number) => (
                  <div key={i}>• {a}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Saved Simulations History */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 shadow-xl">
        <div className="border-b border-slate-800/80 pb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-400" /> Historical Scenario Models ({simulations.length})
          </h2>
          <span className="text-[10px] text-slate-400 font-mono">TAGGED: SIMULATION / ESTIMATE</span>
        </div>

        {simulations.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">No scenario simulations saved yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {simulations.map((sim) => (
              <div key={sim.id} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{sim.name}</span>
                  <span className="bg-indigo-950 text-indigo-300 text-[9px] font-mono px-2 py-0.5 rounded border border-indigo-800 font-bold uppercase">
                    {sim.scenario_type}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Target State: <strong className="text-white">{sim.target_state}</strong> • Logged: {new Date(sim.created_at).toLocaleDateString()}
                </div>
                {sim.assumptions && (
                  <p className="text-[10px] text-slate-500 italic bg-slate-900/50 p-2 rounded border border-slate-800/60">
                    {sim.assumptions}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
