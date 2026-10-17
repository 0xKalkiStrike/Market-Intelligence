"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageLoading } from "@/components/ui/Spinner";
import { Map, MapPin, Building2, Users, RefreshCw, TrendingUp, Sparkles, Navigation } from "lucide-react";

interface GeoState {
  metrics: {
    entities_by_state: { state: string; count: number }[];
    summary: {
      total_entities: number;
      doctors: number;
      dispensaries: number;
      competitors: number;
      states_covered: number;
      cities_covered: number;
    };
  };
}

interface ZipGridItem {
  zip_code: string;
  city: string;
  county: string;
  population: number;
  dispensaries: number;
  competitors: number;
  opportunity_score: number;
  signal: string;
}

export default function GeographicIntelligencePage() {
  const [data, setData] = useState<GeoState | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"states" | "zip_grid">("states");

  // ZIP Code Grid State
  const [selectedState, setSelectedState] = useState("FL");
  const [gridData, setGridData] = useState<{ zip_grid?: ZipGridItem[]; opportunity_clusters?: unknown[] } | null>(null);
  const [gridLoading, setGridLoading] = useState(false);

  useEffect(() => {
    api.get<GeoState>("/api/market-intelligence/dashboard")
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const loadGridData = async (st: string) => {
    setGridLoading(true);
    try {
      const json = await api.get<{ zip_grid?: ZipGridItem[]; opportunity_clusters?: unknown[] }>(`/api/phase4/geo-optimization?state=${st}`);
      setGridData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setGridLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "zip_grid" || !gridData) {
      loadGridData(selectedState);
    }
  }, [selectedState, activeTab]);

  if (loading || !data) return <PageLoading />;

  const { entities_by_state, summary } = data.metrics;

  return (
    <div className="flex flex-col gap-6 pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-950/80 px-3 py-0.5 text-xs font-bold text-indigo-300 border border-indigo-800/60 mb-1">
            GEOSPATIAL MARKET INTELLIGENCE & DEMAND GRID
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Geographic Density & Territorial Opportunity
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Macro state distribution and micro ZIP Code spatial clustering combining demographic volume, competitor saturation, and dispensary partner presence.
          </p>
        </div>

        {/* View Toggle Tabs */}
        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab("states")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
              activeTab === "states"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            State Macro Matrix
          </button>
          <button
            onClick={() => setActiveTab("zip_grid")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
              activeTab === "zip_grid"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            ZIP Code Spatial Grid
          </button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Entities Indexed</p>
          <p className="text-2xl font-black text-white">{summary.total_entities?.toLocaleString()}</p>
          <p className="text-[11px] text-slate-500">Cross-verified public records</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">States Covered</p>
          <p className="text-2xl font-black text-indigo-400">{summary.states_covered || entities_by_state.length}</p>
          <p className="text-[11px] text-slate-500">Active regional licensing zones</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Clinical Providers</p>
          <p className="text-2xl font-black text-emerald-400">{summary.doctors?.toLocaleString()}</p>
          <p className="text-[11px] text-slate-500">Registered certifying physicians</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Market Competitors</p>
          <p className="text-2xl font-black text-purple-400">{summary.competitors?.toLocaleString()}</p>
          <p className="text-[11px] text-slate-500">Commercial competitors mapped</p>
        </div>
      </div>

      {/* TAB 1: STATE MACRO BREAKDOWN */}
      {activeTab === "states" && (
        <Card className="bg-[#0c1222] border-slate-800">
          <CardHeader className="bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              State Macro Concentration & Market Share
            </h2>
            <Badge tone="info">{entities_by_state.length} High-Volume Markets</Badge>
          </CardHeader>
          <CardBody className="space-y-3 p-5">
            {entities_by_state.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <p className="text-xs">No geographic market data available yet.</p>
              </div>
            ) : (
              entities_by_state.map((st) => {
                const percentage = Math.round((st.count / (summary.total_entities || 1)) * 1000) / 10;
                return (
                  <div key={st.state} className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2 hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="h-3 w-3 rounded-full bg-indigo-500" />
                        <span className="font-bold text-white text-sm">{st.state}</span>
                      </div>
                      <span className="font-mono font-bold text-indigo-400 text-xs">
                        {st.count.toLocaleString()} Entities ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(percentage, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardBody>
        </Card>
      )}

      {/* TAB 2: MICRO ZIP CODE SPATIAL GRID */}
      {activeTab === "zip_grid" && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-indigo-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Select State Territory Filter:</span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-1.5 text-xs font-bold text-white focus:outline-hidden focus:border-indigo-500"
              >
                <option value="FL">Florida (FL)</option>
                <option value="PA">Pennsylvania (PA)</option>
                <option value="TX">Texas (TX)</option>
                <option value="CA">California (CA)</option>
              </select>

              <button
                onClick={() => loadGridData(selectedState)}
                disabled={gridLoading}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${gridLoading ? "animate-spin" : ""}`} />
                <span>Refresh Grid</span>
              </button>
            </div>
          </div>

          {gridLoading ? (
            <PageLoading />
          ) : !gridData?.zip_grid || gridData.zip_grid.length === 0 ? (
            <div className="p-12 text-center text-slate-400 rounded-xl border border-dashed border-slate-800 bg-slate-900/40">
              No ZIP Code spatial clusters mapped for {selectedState}.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {gridData.zip_grid.map((item) => (
                <div
                  key={item.zip_code}
                  className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3 shadow-sm hover:border-indigo-600/60 transition-all group"
                >
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <div>
                      <span className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {item.city}, {selectedState}
                      </span>
                      <span className="ml-2 font-mono text-[11px] text-slate-400">ZIP {item.zip_code}</span>
                    </div>
                    <span className="text-base font-black text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded-md">
                      {item.opportunity_score}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 bg-slate-900/70 p-3 rounded-lg border border-slate-800/60 space-y-1.5 font-medium">
                    <div className="flex justify-between">
                      <span className="text-slate-400">County:</span>
                      <span className="font-semibold text-white">{item.county}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Population:</span>
                      <span className="font-mono font-semibold text-white">{item.population.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Dispensaries:</span>
                      <span className="text-cyan-400 font-bold">{item.dispensaries}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Competitors:</span>
                      <span className="text-rose-400 font-bold">{item.competitors}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-indigo-300 font-semibold bg-indigo-950/60 p-2 rounded-lg border border-indigo-900/50 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">Signal: {item.signal}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
