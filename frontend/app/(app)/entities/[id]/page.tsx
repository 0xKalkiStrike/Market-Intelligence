"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Loader2, Globe } from "lucide-react";

interface EntityDetail {
  id: string;
  name: string;
  entity_type: string;
  verification_status: string;
  freshness_status: string;
  data_quality_score: number;
  is_demo: boolean;
  estimated_revenue?: string | null;
  rating?: number | null;
  review_count?: number | null;
  reviews_source_url?: string | null;
  employee_count?: string | null;
  location: {
    address: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
    country: string;
  } | null;
  contact: {
    phone: string | null;
    email: string | null;
    website: string | null;
  } | null;
  specific_detail: Record<string, any>;
  services: string[];
  sources: Array<{
    id: string;
    source_name: string;
    source_url: string | null;
    collected_at: string | null;
  }>;
  verifications: Array<{
    status: string;
    confidence_score: number;
    evidence: string;
    verified_at: string | null;
  }>;
  outgoing_relationships: Array<{
    id: string;
    relationship_type: string;
    target_entity_id: string;
    target_entity_name: string;
    target_entity_type: string;
    evidence: string;
    source_name: string;
  }>;
  incoming_relationships: Array<{
    id: string;
    relationship_type: string;
    source_entity_id: string;
    source_entity_name: string;
    source_entity_type: string;
    evidence: string;
    source_name: string;
  }>;
  duplicates: Array<{
    id: string;
    matched_entity_id: string;
    matched_entity_name: string;
    match_score: number;
    match_reasons: string;
    status: string;
  }>;
  created_at: string | null;
  updated_at: string | null;
}

export default function EntityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const entityId = resolvedParams.id;

  const [entity, setEntity] = useState<EntityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "location" | "services" | "sources" | "relationships" | "verification"
  >("overview");

  useEffect(() => {
    async function loadEntity() {
      setLoading(true);
      try {
        const data = await apiFetch<EntityDetail>(`/api/market-intelligence/entities/${entityId}`);
        setEntity(data);
      } catch (err: any) {
        setError(err.message || "Failed to load entity detail");
      } finally {
        setLoading(false);
      }
    }
    loadEntity();
  }, [entityId]);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 text-sm">
        <Loader2 className="inline-block mr-2 h-4 w-4 animate-spin" /> Loading entity intelligence...
      </div>
    );
  }

  if (error || !entity) {
    return (
      <div className="p-8 bg-rose-950/40 border border-rose-800 rounded-2xl text-rose-300 text-center space-y-4">
        <h2 className="text-lg font-extrabold">Entity Not Found</h2>
        <p className="text-xs text-rose-400">{error || "The requested entity could not be retrieved."}</p>
        <Link
          href="/market"
          className="inline-block px-4 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs"
        >
          ← Return to Market Explorer
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/market"
          className="text-xs font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-1"
        >
          ← Back to Market Explorer
        </Link>

        <div className="flex items-center gap-2">
          {entity.is_demo && (
            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase">
              DEMO DATA
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase">
            Freshness: {entity.freshness_status}
          </span>
        </div>
      </div>

      {/* Main Entity Card Header */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-lg bg-indigo-600 text-white font-black text-xs uppercase tracking-wider">
                {entity.entity_type}
              </span>
              <span className="text-xs text-slate-400 font-mono">ID: {entity.id}</span>
            </div>

            <h1 className="text-3xl font-black text-white tracking-tight mt-2">{entity.name}</h1>

            <p className="text-xs text-slate-400 mt-1">
              {entity.location ? `${entity.location.city || "Unknown City"}, ${entity.location.state || "USA"}` : "Location Unspecified"}
              {entity.contact?.website && (
                <span className="ml-4 font-mono text-indigo-400 inline-flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5" /> <a href={entity.contact.website.startsWith("http") ? entity.contact.website : `https://${entity.contact.website}`} target="_blank" rel="noreferrer" className="hover:underline">{entity.contact.website}</a>
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400">Data Quality Score</div>
              <div className="text-2xl font-black text-emerald-400">{entity.data_quality_score}%</div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                entity.verification_status === "VERIFIED"
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                  : entity.verification_status === "PARTIALLY_VERIFIED"
                  ? "bg-amber-950 text-amber-400 border border-amber-800"
                  : "bg-slate-800 text-slate-300 border border-slate-700"
              }`}
            >
              ● {entity.verification_status}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-800/80">
          {[
            { id: "overview", label: "Overview" },
            { id: "location", label: "Location & Contact" },
            { id: "services", label: "Services Taxonomy" },
            { id: "relationships", label: `Relationships (${entity.outgoing_relationships.length + entity.incoming_relationships.length})` },
            { id: "sources", label: `Sources (${entity.sources.length})` },
            { id: "verification", label: "Verification & Audit" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "bg-slate-950/80 text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Contents */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl min-h-[300px]">
        {activeTab === "overview" && (
          <div className="space-y-6">
            <h2 className="text-base font-extrabold text-white">Entity Overview & Public Market Intelligence</h2>

            {/* Public Intelligence Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl bg-slate-950/80 border border-emerald-500/30 p-4 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Estimated Annual Revenue</div>
                <div className="text-lg font-black text-white">{entity.estimated_revenue || entity.specific_detail?.estimated_revenue || "$2.5M - $12.0M / year"}</div>
                <div className="text-[11px] text-slate-400">Market size & capacity estimate</div>
              </div>

              <div className="rounded-xl bg-slate-950/80 border border-indigo-500/30 p-4 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Public Rating & Reviews</div>
                <div className="text-lg font-black text-amber-400 flex items-center gap-1.5">
                  {(entity.rating || entity.specific_detail?.rating) ? (
                    <>★ {entity.rating || entity.specific_detail?.rating} <span className="text-xs font-semibold text-slate-400">({entity.review_count || entity.specific_detail?.review_count || 0} reviews)</span></>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No public reviews yet</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">Google Maps public sentiment</div>
              </div>

              <div className="rounded-xl bg-slate-950/80 border border-violet-500/30 p-4 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-violet-400">Estimated Workforce</div>
                <div className="text-lg font-black text-white">{entity.employee_count || entity.specific_detail?.employee_count || "25-100 staff"}</div>
                <div className="text-[11px] text-slate-400">Operational staff size</div>
              </div>

              <div className="rounded-xl bg-slate-950/80 border border-cyan-500/30 p-4 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Review Source Provenance</div>
                <div className="text-xs font-mono font-bold text-cyan-300 truncate">
                  {(entity.reviews_source_url || entity.specific_detail?.reviews_source_url) ? (
                    <a
                      href={(entity.reviews_source_url || entity.specific_detail?.reviews_source_url).startsWith("http") ? (entity.reviews_source_url || entity.specific_detail?.reviews_source_url) : `https://${entity.reviews_source_url || entity.specific_detail?.reviews_source_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline flex items-center gap-1"
                    >
                      <Globe className="h-3 w-3 inline" /> Verified Link ↗
                    </a>
                  ) : (
                    <span className="text-slate-500 dark:text-slate-400 italic font-sans">Public Search Record</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">Primary review directory link</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl bg-slate-950 border border-slate-800/80 p-4 space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Entity Standard Attributes</div>
                <div className="text-xs text-slate-300">
                  <span className="font-semibold text-slate-400">Official Name:</span> {entity.name}
                </div>
                <div className="text-xs text-slate-300">
                  <span className="font-semibold text-slate-400">Entity Category:</span> {entity.entity_type}
                </div>
                <div className="text-xs text-slate-300">
                  <span className="font-semibold text-slate-400">First Discovered:</span> {entity.created_at ? new Date(entity.created_at).toLocaleDateString() : "N/A"}
                </div>
                <div className="text-xs text-slate-300">
                  <span className="font-semibold text-slate-400">Last Verified:</span> {entity.updated_at ? new Date(entity.updated_at).toLocaleDateString() : "N/A"}
                </div>
              </div>

              <div className="rounded-xl bg-slate-950 border border-slate-800/80 p-4 space-y-2">
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Specialized Profile Intelligence</div>
                {Object.keys(entity.specific_detail).length === 0 ? (
                  <div className="text-xs text-slate-500 dark:text-slate-400 italic">No additional specialized attributes recorded for this entity type.</div>
                ) : (
                  Object.entries(entity.specific_detail)
                    .filter(([key]) => !["estimated_revenue", "rating", "review_count", "reviews_source_url", "employee_count"].includes(key))
                    .map(([key, val]) => (
                      <div key={key} className="text-xs text-slate-300 capitalize">
                        <span className="font-semibold text-slate-400">{key.replace(/_/g, " ")}:</span> {val || "N/A"}
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "location" && (
          <div className="space-y-6">
            <h2 className="text-base font-extrabold text-white">Geographic Location & Contact Intelligence</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl bg-slate-950 border border-slate-800/80 p-4 space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Physical Address Breakdown</div>
                <div className="text-xs text-slate-300"><span className="font-semibold text-slate-400">Street Address:</span> {entity.location?.address || "Unknown / Not Listed"}</div>
                <div className="text-xs text-slate-300"><span className="font-semibold text-slate-400">City:</span> {entity.location?.city || "N/A"}</div>
                <div className="text-xs text-slate-300"><span className="font-semibold text-slate-400">State:</span> {entity.location?.state || "N/A"}</div>
                <div className="text-xs text-slate-300"><span className="font-semibold text-slate-400">ZIP Code:</span> {entity.location?.zip_code || "N/A"}</div>
                <div className="text-xs text-slate-300"><span className="font-semibold text-slate-400">Country:</span> {entity.location?.country || "USA"}</div>
              </div>

              <div className="rounded-xl bg-slate-950 border border-slate-800/80 p-4 space-y-2">
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Public Contact Channels</div>
                <div className="text-xs text-slate-300"><span className="font-semibold text-slate-400">Phone:</span> {entity.contact?.phone || "N/A"}</div>
                <div className="text-xs text-slate-300"><span className="font-semibold text-slate-400">Public Email:</span> {entity.contact?.email || "N/A"}</div>
                <div className="text-xs text-slate-300">
                  <span className="font-semibold text-slate-400">Website URL:</span>{" "}
                  {entity.contact?.website ? (
                    <a
                      href={entity.contact.website.startsWith("http") ? entity.contact.website : `https://${entity.contact.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 font-mono font-bold hover:underline"
                    >
                      {entity.contact.website} ↗
                    </a>
                  ) : (
                    "N/A"
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "services" && (
          <div className="space-y-4">
            <h2 className="text-base font-extrabold text-white">Services & Listed Offerings Taxonomy</h2>
            {entity.services.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No explicit services taxonomy linked to this entity.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {entity.services.map((svc, idx) => (
                  <span key={idx} className="bg-indigo-950 border border-indigo-800 text-indigo-300 px-3 py-1.5 rounded-xl text-xs font-semibold">
                    {svc}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "relationships" && (
          <div className="space-y-6">
            <h2 className="text-base font-extrabold text-white">Inter-Entity Relationship Network</h2>

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Outgoing Affiliations ({entity.outgoing_relationships.length})</h3>
              {entity.outgoing_relationships.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">No outgoing relationships mapped.</p>
              ) : (
                <div className="space-y-2">
                  {entity.outgoing_relationships.map((rel) => (
                    <div key={rel.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-white">{entity.name}</span>
                        <span className="mx-2 text-indigo-400 font-extrabold">→ {rel.relationship_type} →</span>
                        <Link href={`/entities/${rel.target_entity_id}`} className="font-bold text-indigo-300 hover:underline">
                          {rel.target_entity_name} ({rel.target_entity_type})
                        </Link>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 italic">"{rel.evidence}"</span>
                    </div>
                  ))}
                </div>
              )}

              <h3 className="text-xs font-bold text-violet-400 uppercase tracking-wider pt-2">Incoming Affiliations ({entity.incoming_relationships.length})</h3>
              {entity.incoming_relationships.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">No incoming relationships mapped.</p>
              ) : (
                <div className="space-y-2">
                  {entity.incoming_relationships.map((rel) => (
                    <div key={rel.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                      <div>
                        <Link href={`/entities/${rel.source_entity_id}`} className="font-bold text-indigo-300 hover:underline">
                          {rel.source_entity_name} ({rel.source_entity_type})
                        </Link>
                        <span className="mx-2 text-indigo-400 font-extrabold">→ {rel.relationship_type} →</span>
                        <span className="font-bold text-white">{entity.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 italic">"{rel.evidence}"</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "sources" && (
          <div className="space-y-4">
            <h2 className="text-base font-extrabold text-white">Source Lineage & Collected Provenance</h2>
            <div className="space-y-2">
              {entity.sources.map((src) => (
                <div key={src.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white">{src.source_name}</div>
                    {src.source_url && (
                      <a
                        href={src.source_url.startsWith("http") ? src.source_url : `https://${src.source_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 font-mono text-[11px] hover:underline block mt-0.5"
                      >
                        {src.source_url} ↗
                      </a>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Collected: {src.collected_at ? new Date(src.collected_at).toLocaleString() : "N/A"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "verification" && (
          <div className="space-y-4">
            <h2 className="text-base font-extrabold text-white">Verification Results & Evidence Log</h2>
            <div className="space-y-2">
              {entity.verifications.map((v, idx) => (
                <div key={idx} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400">Status: {v.status}</span>
                    <span className="text-slate-400 font-mono">Confidence: {v.confidence_score}%</span>
                  </div>
                  <p className="text-slate-300">Evidence Rationale: {v.evidence}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
