"use client";

import { useEffect, useState } from "react";
import { Map, MapPin, Building2, Users, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";

export default function GeoOptimizationPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState("FL");

  const loadData = async () => {
    setLoading(true);
    try {
      const json = await api.get<any>(`/api/phase4/geo-optimization?state=${state}`);
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [state]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Geographic Optimization & Spatial Opportunity Grid</h1>
          <p className="text-xs text-slate-400 mt-1">
            ZIP Code, County, and State spatial demand clustering combining population, competitor density, and dispensary presence
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs font-medium text-white"
          >
            <option value="FL">Florida (FL)</option>
            <option value="TX">Texas (TX)</option>
            <option value="PA">Pennsylvania (PA)</option>
          </select>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Geo Grid
          </button>
        </div>
      </div>

      {/* ZIP Code Spatial Grid */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <MapPin className="h-4 w-4 text-indigo-400" />
          ZIP Code Opportunity Grid ({data?.zip_grid?.length || 0} Key Regions)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data?.zip_grid?.map((item: any) => (
            <div key={item.zip_code} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-white">{item.city}, {state}</span>
                  <span className="ml-2 text-xs text-slate-400 font-mono">ZIP {item.zip_code}</span>
                </div>
                <span className="text-sm font-extrabold text-emerald-400">{item.opportunity_score}</span>
              </div>
              <div className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded border border-slate-800 space-y-1">
                <div>County: <strong>{item.county}</strong></div>
                <div>Population: <strong>{item.population.toLocaleString()}</strong></div>
                <div>Dispensaries: <strong>{item.dispensaries}</strong> • Competitors: <strong>{item.competitors}</strong></div>
              </div>
              <div className="text-[11px] text-indigo-300 font-semibold bg-indigo-950/40 p-2 rounded border border-indigo-900/40">
                Signal: {item.signal}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
