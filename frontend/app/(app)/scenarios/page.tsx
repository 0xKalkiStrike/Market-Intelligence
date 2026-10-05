"use client";

import { useEffect, useState } from "react";
import { Target, Calculator, DollarSign, MapPin, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface Simulation {
  id: string;
  name: string;
  scenario_type: string;
  target_state: string;
  results: any;
  assumptions: string[];
  created_at: string;
}

export default function ScenariosPage() {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);

  // Price Simulation State
  const [priceState, setPriceState] = useState("FL");
  const [newPrice, setNewPrice] = useState(129.0);
  const [priceResult, setPriceResult] = useState<any>(null);

  // Expansion Simulation State
  const [expState, setExpState] = useState("TX");
  const [setupCost, setSetupCost] = useState(45000.0);
  const [expResult, setExpResult] = useState<any>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  async function fetchSimulations() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/market-intelligence/ai/scenarios`);
      if (res.ok) {
        const json = await res.json();
        setSimulations(json.simulations || []);
      }
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
    try {
      const res = await fetch(`${API_BASE}/api/market-intelligence/ai/scenarios/price-change`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: priceState, new_price: Number(newPrice) }),
      });
      if (res.ok) {
        const json = await res.json();
        setPriceResult(json);
        fetchSimulations();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleExpSimulate() {
    try {
      const res = await fetch(`${API_BASE}/api/market-intelligence/ai/scenarios/state-expansion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: expState, estimated_setup_cost: Number(setupCost) }),
      });
      if (res.ok) {
        const json = await res.json();
        setExpResult(json);
        fetchSimulations();
      }
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-950/80 px-3 py-0.5 text-xs font-bold text-indigo-300 border border-indigo-800/50 mb-1">
          DECISION-SUPPORT SCENARIO ENGINE
        </div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2 sm:text-3xl">
          <Target className="h-7 w-7 text-indigo-400" /> Scenario Analysis & Modeling
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Model "What-If" market scenarios for price changes and state expansions with explicit assumptions, elasticity estimates, and payback timelines.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price Change Simulation Card */}
        <Card className="bg-slate-900 border border-slate-800">
          <CardHeader className="bg-slate-950/60 border-b border-slate-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-400" /> Price Change Elasticity Simulator
            </h2>
          </CardHeader>
          <CardBody className="p-5 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-300 block mb-1">Target State</label>
                <input
                  type="text"
                  value={priceState}
                  onChange={(e) => setPriceState(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-300 block mb-1">Proposed Certification Price ($)</label>
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white font-bold"
                />
              </div>
            </div>

            <Button onClick={handlePriceSimulate} variant="gradient" className="w-full font-bold">
              Run Price Change Simulation
            </Button>

            {priceResult && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 mt-4">
                <div className="flex items-center justify-between font-bold text-slate-200">
                  <span>Simulated Volume Change:</span>
                  <span className="text-emerald-400">{priceResult.projected_volume_change_pct}</span>
                </div>
                <div className="flex items-center justify-between font-bold text-slate-200">
                  <span>Est. Annual Revenue:</span>
                  <span className="text-indigo-400">${priceResult.estimated_annual_revenue?.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between font-bold text-slate-200">
                  <span>Market Position:</span>
                  <span className="text-amber-400">{priceResult.competitive_position}</span>
                </div>
                <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 space-y-1">
                  <span className="font-bold block text-slate-300">Explicit Model Assumptions:</span>
                  {priceResult.assumptions?.map((a: string, i: number) => (
                    <div key={i}>• {a}</div>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* State Expansion Simulation Card */}
        <Card className="bg-slate-900 border border-slate-800">
          <CardHeader className="bg-slate-950/60 border-b border-slate-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-indigo-400" /> New State Expansion Simulator
            </h2>
          </CardHeader>
          <CardBody className="p-5 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-300 block mb-1">Target Expansion State</label>
                <input
                  type="text"
                  value={expState}
                  onChange={(e) => setExpState(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-300 block mb-1">Est. Setup Cost ($)</label>
                <input
                  type="number"
                  value={setupCost}
                  onChange={(e) => setSetupCost(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white font-bold"
                />
              </div>
            </div>

            <Button onClick={handleExpSimulate} variant="gradient" className="w-full font-bold">
              Run State Expansion Simulation
            </Button>

            {expResult && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 mt-4">
                <div className="flex items-center justify-between font-bold text-slate-200">
                  <span>Addressable Patient Pop:</span>
                  <span className="text-blue-400">{expResult.addressable_patient_population?.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between font-bold text-slate-200">
                  <span>Projected Year 1 Revenue:</span>
                  <span className="text-emerald-400">${expResult.projected_year1_revenue?.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between font-bold text-slate-200">
                  <span>Est. Payback Period:</span>
                  <span className="text-amber-400">{expResult.estimated_payback_period_months} months</span>
                </div>
                <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 space-y-1">
                  <span className="font-bold block text-slate-300">Explicit Model Assumptions:</span>
                  {expResult.assumptions?.map((a: string, i: number) => (
                    <div key={i}>• {a}</div>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Saved Simulations History */}
      <Card className="bg-slate-900 border border-slate-800">
        <CardHeader className="bg-slate-950/60 border-b border-slate-800">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Saved Scenario Simulations</h2>
        </CardHeader>
        <CardBody className="p-4">
          {simulations.length === 0 ? (
            <p className="text-xs text-slate-500">No scenarios simulated yet.</p>
          ) : (
            <div className="space-y-3">
              {simulations.map((sim) => (
                <div key={sim.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white">{sim.name}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Type: {sim.scenario_type} • State: {sim.target_state}</div>
                  </div>
                  <span className="bg-indigo-950 text-indigo-300 text-[10px] font-mono px-2 py-1 rounded border border-indigo-800 font-bold">
                    LABELS: SCENARIO / ESTIMATE
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
