"use client";

import { useEffect, useState } from "react";
import { Bell, Filter, Calendar, Tag, ExternalLink } from "lucide-react";
import { API_BASE } from "@/lib/api";

interface IntelEvent {
  id: string;
  event_type: string;
  entity_name: string;
  entity_type: string;
  state: string;
  description: string;
  previous_value: string | null;
  new_value: string | null;
  importance: string;
  source_name: string;
  source_url: string | null;
  detected_at: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<IntelEvent[]>([]);
  const [importanceFilter, setImportanceFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);


  async function fetchEvents() {
    setLoading(true);
    try {
      const url = new URL(`${API_BASE}/api/market-intelligence/events`);
      if (importanceFilter !== "ALL") url.searchParams.append("importance", importanceFilter);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEvents();
  }, [importanceFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Bell className="h-6 w-6 text-indigo-400" /> Universal Intelligence Events
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Centralized timeline tracking price shifts, competitor location openings, regulatory updates, and market opportunities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={importanceFilter}
            onChange={(e) => setImportanceFilter(e.target.value)}
            className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white"
          >
            <option value="ALL">All Importance</option>
            <option value="CRITICAL">Critical Priority</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>
        </div>
      </div>

      {/* Events Timeline */}
      <div className="space-y-3">
        {events.map((e) => (
          <div
            key={e.id}
            className={`rounded-xl border p-4 backdrop-blur-xs transition-colors ${
              e.importance === "CRITICAL"
                ? "bg-rose-950/20 border-rose-900/50"
                : e.importance === "HIGH"
                ? "bg-amber-950/20 border-amber-900/50"
                : "bg-slate-900/50 border-slate-800"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2 mb-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">{e.entity_name}</span>
                <span className="rounded bg-indigo-950 px-2 py-0.5 text-[10px] font-semibold text-indigo-300 border border-indigo-800">
                  {e.event_type.replace(/_/g, " ")}
                </span>
                <span className="font-semibold text-slate-400">[{e.state}]</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {new Date(e.detected_at).toLocaleString()}
                </span>
                <span
                  className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                    e.importance === "CRITICAL"
                      ? "bg-rose-900 text-rose-200"
                      : e.importance === "HIGH"
                      ? "bg-amber-900 text-amber-200"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {e.importance}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{e.description}</p>

            {(e.previous_value || e.new_value) && (
              <div className="mt-2 text-[11px] bg-slate-950 p-2 rounded border border-slate-800/80 font-mono text-slate-400">
                {e.previous_value && <span>Prev: <strong className="text-rose-400">{e.previous_value}</strong> → </span>}
                {e.new_value && <span>New: <strong className="text-emerald-400">{e.new_value}</strong></span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
