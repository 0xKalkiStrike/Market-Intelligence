"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface ServiceItem {
  service_name: string;
  count: number;
}

export default function ServicesIntelligencePage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityType, setEntityType] = useState("ALL");
  const [stateFilter, setStateFilter] = useState("");

  const fetchServices = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (entityType && entityType !== "ALL") query.append("entity_type", entityType);
      if (stateFilter) query.append("state", stateFilter);

      const data = await apiFetch<{ services: ServiceItem[] }>(`/api/market-intelligence/services?${query.toString()}`);
      setServices(data.services || []);
    } catch (err) {
      console.error("Failed to fetch services taxonomy", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [entityType, stateFilter]);

  const maxCount = services.length > 0 ? Math.max(...services.map((s) => s.count)) : 1;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-400 text-xs font-bold uppercase tracking-wider mb-2">
              Market Intelligence Taxonomy
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Services Intelligence</h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Taxonomy analysis mapping publicly listed offerings, medical specialties, operating services, and business offerings across market entities and geographic areas.
            </p>
          </div>

          <button
            onClick={fetchServices}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition-all self-start md:self-auto"
          >
            Refresh Taxonomy
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-300">Filter By Entity Type:</span>
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Entity Types</option>
            <option value="DOCTOR">Doctors / Providers</option>
            <option value="DISPENSARY">Dispensaries</option>
            <option value="CLINIC">Clinics</option>
            <option value="COMPETITOR">Competitors</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-300">State / Region:</span>
          <input
            type="text"
            placeholder="e.g. CA or NY..."
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Services Frequency Grid */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-6 shadow-xl">
        <h2 className="text-base font-extrabold text-white flex items-center justify-between">
          <span>Most Common Market Services & Offerings</span>
          <span className="text-xs text-indigo-400 font-bold">{services.length} Unique Services</span>
        </h2>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <Loader2 className="inline-block mr-2 h-4 w-4 animate-spin" /> Analyzing service taxonomy distribution...
          </div>
        ) : services.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No service taxonomy records found matching the selected filters.
          </div>
        ) : (
          <div className="space-y-4">
            {services.map((item, idx) => {
              const pct = Math.round((item.count / maxCount) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-white flex items-center gap-2">
                      <span className="text-slate-500 dark:text-slate-400 text-[10px] w-5">#{idx + 1}</span>
                      {item.service_name}
                    </span>
                    <span className="text-indigo-400 font-mono">{item.count} entities</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
