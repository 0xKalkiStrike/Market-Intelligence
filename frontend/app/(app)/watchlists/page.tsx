"use client";

import { useEffect, useState } from "react";
import { Eye, Plus, ShieldCheck, Sliders, Trash2, Zap } from "lucide-react";
import { api } from "@/lib/api";

export default function WatchlistsPage() {
  const [watchlists, setWatchlists] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Competitor");
  const [description, setDescription] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [resW, resR] = await Promise.all([
        api.get<any[]>("/api/phase4/watchlists"),
        api.get<any[]>("/api/phase4/monitoring-rules")
      ]);
      setWatchlists(resW);
      setRules(resR);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    try {
      await api.post("/api/phase4/watchlists", { name, category, description });
      setName("");
      setDescription("");
      loadData();
    } catch (err) {
      console.error(err);
    }
  };
  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/phase4/watchlists/${id}`);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-white">Continuous Intelligence Watchlists & Monitoring Rules</h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure real-time monitoring targets, custom trigger conditions, and intelligent multi-factor alert prioritization
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Create & Active Watchlists */}
        <div className="lg:col-span-2 space-y-6">
          {/* Create Watchlist Form */}
          <form onSubmit={handleCreateWatchlist} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Plus className="h-4 w-4 text-indigo-400" />
              Create Intelligence Watchlist
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Watchlist Name</label>
                <input
                  type="text"
                  placeholder="e.g. Top 20 Competitors FL"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-1.5 text-xs text-white"
                >
                  <option value="Competitor">Competitors</option>
                  <option value="State">State Expansion</option>
                  <option value="Pricing">Pricing Changes</option>
                  <option value="Regulatory">Regulatory Rules</option>
                  <option value="Dispensary">Dispensary Partners</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
              <input
                type="text"
                placeholder="Brief notes regarding monitoring objective..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                Create Watchlist
              </button>
            </div>
          </form>

          {/* Active Watchlists List */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Eye className="h-4 w-4 text-indigo-400" />
              Active Intelligence Watchlists ({watchlists.length})
            </h2>
            <div className="space-y-3">
              {watchlists.map((w: any) => (
                <div key={w.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{w.name}</span>
                      <span className="text-[10px] bg-slate-800 text-indigo-300 px-2 py-0.5 rounded font-mono">
                        {w.category}
                      </span>
                    </div>
                    {w.description && <p className="text-xs text-slate-400 mt-1">{w.description}</p>}
                    <div className="text-[11px] text-slate-500 mt-2">
                      {w.items_count} Target Items Monitored • Created by {w.created_by || "Admin"}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(w.id)}
                    className="p-2 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Monitoring Rules */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="h-4 w-4 text-emerald-400" />
              Configured Monitoring Rules
            </h2>
            <div className="space-y-3">
              {rules.map((r: any) => (
                <div key={r.id} className="p-3 rounded-lg border border-slate-800 bg-slate-950/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">{r.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      r.priority === "CRITICAL" ? "bg-red-950 text-red-300" : "bg-indigo-950 text-indigo-300"
                    }`}>
                      {r.priority}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-1">
                    IF {r.trigger_event} {r.condition_operator} {r.condition_value} → {r.action_type}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
