"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface EntityRelationshipItem {
  id: string;
  relationship_type: string;
  source: { id: string; name: string; type: string };
  target: { id: string; name: string; type: string };
  evidence: string;
  source_name: string;
  discovered_at: string;
}

export default function RelationshipsPage() {
  const [relationships, setRelationships] = useState<EntityRelationshipItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");

  const fetchRelationships = async () => {
    setLoading(true);
    try {
      const query = typeFilter ? `?relationship_type=${encodeURIComponent(typeFilter)}` : "";
      const data = await apiFetch<{ relationships: EntityRelationshipItem[] }>(`/api/market-intelligence/relationships${query}`);
      setRelationships(data.relationships || []);
    } catch (err) {
      console.error("Failed to fetch entity relationships", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRelationships();
  }, [typeFilter]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
              Entity Network & Affiliations
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Entity Relationship Mapping</h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Factual inter-entity relationships (e.g. Doctor → Works At → Clinic, Dispensary → Located In → City, Competitor → Operates In → Market Area) supported by public evidence.
            </p>
          </div>

          <button
            onClick={fetchRelationships}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition-all self-start md:self-auto"
          >
            Refresh Mappings
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-300">Relationship Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Relationship Types</option>
            <option value="Works At">Works At</option>
            <option value="Associated With">Associated With</option>
            <option value="Located In">Located In</option>
            <option value="Operates In">Operates In</option>
            <option value="Competes With">Competes With</option>
          </select>
        </div>

        <span className="text-xs text-slate-400 font-semibold">
          {relationships.length} Relationships Mapped
        </span>
      </div>

      {/* Relationships Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <Loader2 className="inline-block mr-2 h-4 w-4 animate-spin" /> Querying relationship network...
          </div>
        ) : relationships.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No inter-entity relationships recorded yet. Relationships are established automatically during multi-source collection runs when doctors list clinics, or entities share physical operating hubs.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4">Source Entity</th>
                  <th className="py-3.5 px-4 text-center">Relationship Type</th>
                  <th className="py-3.5 px-4">Target Entity / Location</th>
                  <th className="py-3.5 px-4">Supporting Evidence</th>
                  <th className="py-3.5 px-4">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {relationships.map((rel) => (
                  <tr key={rel.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/entities/${rel.source.id}`}
                        className="font-bold text-white hover:text-indigo-400 transition-colors flex items-center gap-2"
                      >
                        {rel.source.name}
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                          {rel.source.type}
                        </span>
                      </Link>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 font-extrabold text-[11px]">
                        → {rel.relationship_type} →
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <Link
                        href={`/entities/${rel.target.id}`}
                        className="font-bold text-white hover:text-indigo-400 transition-colors flex items-center gap-2"
                      >
                        {rel.target.name}
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                          {rel.target.type}
                        </span>
                      </Link>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 italic">
                      "{rel.evidence || "Verified public association"}"
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {rel.source_name || "Public Registry"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
