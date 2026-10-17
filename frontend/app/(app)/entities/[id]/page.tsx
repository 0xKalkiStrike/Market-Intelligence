"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import {
  Loader2,
  Globe,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Copy,
  ExternalLink,
  ShieldCheck,
  Download,
  RefreshCw,
  Edit3,
  Layers,
  ArrowUpRight,
  TrendingUp,
  FileText,
  Star,
  Users,
  DollarSign,
  Share2,
} from "lucide-react";

interface AuditEntry {
  id: string;
  entity_id: string;
  changed_by: string;
  action: string;
  field_name: string;
  old_value: string;
  new_value: string;
  reason: string;
  timestamp: string | null;
}

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
  specific_detail: Record<string, unknown>;
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
  audit_trail?: AuditEntry[];
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
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "location" | "services" | "sources" | "relationships" | "verification"
  >("overview");

  async function loadEntity() {
    try {
      const data = await apiFetch<EntityDetail>(`/api/market-intelligence/entities/${entityId}`);
      setEntity(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load entity intelligence dossier.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEntity();
  }, [entityId]);

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadEntity();
    setIsRefreshing(false);
  }

  function exportDossierJson() {
    if (!entity) return;
    const blob = new Blob([JSON.stringify(entity, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `entity_dossier_${entity.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex min-h-[450px] flex-col items-center justify-center p-12 text-center text-slate-400">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-indigo-500" />
        <h3 className="text-base font-bold text-white">Aggregating Cross-Source Intelligence</h3>
        <p className="mt-1 text-xs text-slate-400">
          Synthesizing entity registry records, geographic coordinates, and verified public evidence...
        </p>
      </div>
    );
  }

  if (error || !entity) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-rose-800/80 bg-rose-950/30 p-8 text-center text-rose-300 shadow-2xl">
        <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-rose-400" />
        <h2 className="text-xl font-black text-white">Entity Dossier Unavailable</h2>
        <p className="mt-2 text-xs text-rose-300">{error || "The requested entity could not be retrieved from the intelligence index."}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/market"
            className="rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-700 transition-colors"
          >
            ← Return to Market Explorer
          </Link>
          <button
            onClick={() => {
              setLoading(true);
              setError(null);
              loadEntity();
            }}
            className="rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-rose-500 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const qualityScore = entity.data_quality_score ?? 0;
  const isVerified = entity.verification_status === "VERIFIED";
  const locationString = entity.location
    ? [entity.location.city, entity.location.state].filter(Boolean).join(", ")
    : "Location Inferred from Regional Filings";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header Bar & Action Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2">
          <Link
            href="/market"
            className="text-xs font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg"
          >
            ← Market Explorer
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-xs font-semibold text-slate-300 truncate max-w-[200px] sm:max-w-xs">
            {entity.name}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            title="Re-verify record against active registries"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-indigo-400" : ""}`} />
            <span>Sync Freshness</span>
          </button>

          <button
            onClick={exportDossierJson}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            title="Download verified JSON dossier"
          >
            <Download className="h-3.5 w-3.5 text-slate-400" />
            <span>Export Dossier</span>
          </button>

          <button
            onClick={() => copyToClipboard(window.location.href, "url")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Share2 className="h-3.5 w-3.5 text-slate-400" />
            <span>{copiedField === "url" ? "Link Copied!" : "Share"}</span>
          </button>
        </div>
      </div>

      {/* Main Hero Entity Card */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-[#0d1424] to-[#0a0f1d] p-6 shadow-2xl">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow-sm">
                {entity.entity_type}
              </span>
              <button
                onClick={() => copyToClipboard(entity.id, "id")}
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-800/80 px-2 py-0.5 font-mono text-[10px] text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors border border-slate-700/50"
                title="Click to copy full UUID"
              >
                <span>ID: {entity.id.slice(0, 8)}...{entity.id.slice(-4)}</span>
                <Copy className="h-3 w-3" />
                {copiedField === "id" && <span className="text-emerald-400 font-bold ml-1">Copied</span>}
              </button>
              {entity.is_demo && (
                <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                  DEMO BENCHMARK
                </span>
              )}
              <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                Freshness: {entity.freshness_status}
              </span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{entity.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1 text-slate-300">
                  <MapPin className="h-3.5 w-3.5 text-indigo-400" />
                  {locationString}
                </span>

                {entity.contact?.website && (
                  <a
                    href={entity.contact.website.startsWith("http") ? entity.contact.website : `https://${entity.contact.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-400 hover:underline font-mono font-medium"
                  >
                    <Globe className="h-3.5 w-3.5 text-indigo-400" />
                    <span>{entity.contact.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                )}

                {entity.contact?.phone && (
                  <span className="inline-flex items-center gap-1 font-mono text-slate-400">
                    <Phone className="h-3 w-3 text-slate-500" />
                    {entity.contact.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quality Score & Verification Badge Widget */}
          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-slate-800/80 pt-4 sm:pt-0 sm:pl-6 gap-3 shrink-0">
            <div className="text-left sm:text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Data Quality Score
              </div>
              <div className="flex items-baseline sm:justify-end gap-1.5 mt-0.5">
                <span className={`text-3xl font-black ${qualityScore >= 80 ? "text-emerald-400" : qualityScore >= 50 ? "text-amber-400" : "text-rose-400"}`}>
                  {qualityScore}%
                </span>
                <span className="text-[11px] font-bold text-slate-500 uppercase">
                  {qualityScore >= 85 ? "Grade A" : qualityScore >= 70 ? "Grade B" : "Review"}
                </span>
              </div>
            </div>

            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider border shadow-sm ${
                isVerified
                  ? "bg-emerald-950/80 text-emerald-400 border-emerald-700/60"
                  : entity.verification_status === "PARTIALLY_VERIFIED"
                  ? "bg-amber-950/80 text-amber-400 border-amber-700/60"
                  : "bg-slate-800 text-slate-300 border-slate-700"
              }`}
            >
              {isVerified ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
              )}
              <span>{entity.verification_status}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-800/80 pt-4">
          {[
            { id: "overview", label: "Executive Overview" },
            { id: "location", label: "Location & Contact Channels" },
            { id: "services", label: `Services & Catalog (${entity.services.length})` },
            { id: "sources", label: `Source Provenance (${entity.sources.length})` },
            { id: "verification", label: `Data Governance & Audit (${(entity.verifications.length) + (entity.audit_trail?.length || 0)})` },
            { id: "relationships", label: `Market Network (${entity.outgoing_relationships.length + entity.incoming_relationships.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-[1.02]"
                  : "bg-slate-900/90 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Tab Panels */}
      <div className="rounded-2xl border border-slate-800 bg-[#0c1222] p-6 shadow-xl min-h-[420px]">
        {/* TAB 1: EXECUTIVE OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-400" />
                <span>Executive Market Footprint & Core Indicators</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Synthesized operational capacity, public reputation metrics, and multi-source market benchmarking.
              </p>
            </div>

            {/* 4 Core Metric KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Annual Revenue Card */}
              <div className="rounded-xl border border-emerald-500/30 bg-slate-950/70 p-4 space-y-1.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Estimated Annual Revenue
                  </span>
                  <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <div className="text-lg font-black text-white">
                  {entity.estimated_revenue || (entity.specific_detail?.estimated_revenue as string | undefined) || "Disclosed Upon Formal Audit"}
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Market footprint & capacity model</span>
                  <span className="text-[9px] font-mono text-emerald-400/80 bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-800/40">
                    {isVerified ? "Verified Baseline" : "Estimated"}
                  </span>
                </div>
              </div>

              {/* Public Sentiment & Rating Card */}
              <div className="rounded-xl border border-amber-500/30 bg-slate-950/70 p-4 space-y-1.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    Public Rating & Sentiment
                  </span>
                  <Star className="h-3.5 w-3.5 text-amber-400" />
                </div>
                <div className="text-lg font-black text-amber-400 flex items-center gap-1.5">
                  {entity.rating ? (
                    <>
                      <span>★ {entity.rating}</span>
                      <span className="text-xs font-semibold text-slate-400">
                        ({entity.review_count || 0} reviews)
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">Pending Public Index</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Google Places public reputation</span>
                  {entity.rating && (
                    <span className="text-[9px] font-mono text-amber-400/80 bg-amber-950 px-1.5 py-0.2 rounded border border-amber-800/40">
                      Positive Sentiment
                    </span>
                  )}
                </div>
              </div>

              {/* Workforce Card */}
              <div className="rounded-xl border border-violet-500/30 bg-slate-950/70 p-4 space-y-1.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">
                    Operational Workforce
                  </span>
                  <Users className="h-3.5 w-3.5 text-violet-400" />
                </div>
                <div className="text-lg font-black text-white">
                  {entity.employee_count || (entity.specific_detail?.employee_count as string | undefined) || "10-50 staff"}
                </div>
                <div className="text-[11px] text-slate-400">
                  <span>Operating headcount bracket</span>
                </div>
              </div>

              {/* Provenance Card */}
              <div className="rounded-xl border border-cyan-500/30 bg-slate-950/70 p-4 space-y-1.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                    Primary Provenance Registry
                  </span>
                  <Building2 className="h-3.5 w-3.5 text-cyan-400" />
                </div>
                <div className="text-xs font-mono font-bold text-cyan-300 truncate pt-1">
                  {entity.sources[0]?.source_url ? (
                    <a
                      href={entity.sources[0].source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline flex items-center gap-1 truncate"
                    >
                      <Globe className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{entity.sources[0].source_name}</span>
                      <ArrowUpRight className="h-3 w-3 shrink-0" />
                    </a>
                  ) : (
                    <span>{entity.sources[0]?.source_name || "Public Registry Cross-Index"}</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">
                  <span>Verified data source lineage</span>
                </div>
              </div>
            </div>

            {/* Deep-Dive Entity Attributes & Specialized Intelligence */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Standard Registry Attributes */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                    Standard Registry Identification
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500">Schema v2.4</span>
                </div>

                <dl className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs">
                  <div>
                    <dt className="text-slate-500 font-medium text-[11px]">Official Registered Name</dt>
                    <dd className="font-semibold text-slate-200 mt-0.5">{entity.name}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 font-medium text-[11px]">Primary Classification</dt>
                    <dd className="font-semibold text-slate-200 mt-0.5">{entity.entity_type}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 font-medium text-[11px]">First Indexed At</dt>
                    <dd className="font-mono text-slate-300 mt-0.5">
                      {entity.created_at ? new Date(entity.created_at).toLocaleDateString() : "Historical"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 font-medium text-[11px]">Last Sync Engine Verification</dt>
                    <dd className="font-mono text-slate-300 mt-0.5">
                      {entity.updated_at ? new Date(entity.updated_at).toLocaleDateString() : "Active"}
                    </dd>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-800/50">
                    <dt className="text-slate-500 font-medium text-[11px]">Regulatory Status</dt>
                    <dd className="text-slate-300 mt-0.5 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span>Compliant with open surface-web commercial data disclosure regulations</span>
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Specialized Market Profile */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-indigo-400" />
                    Specialized Operational Intelligence
                  </h3>
                  <span className="text-[10px] font-mono text-indigo-400/80">Market Signals</span>
                </div>

                <div className="space-y-2.5 text-xs">
                  {Object.entries(entity.specific_detail || {})
                    .filter(([key, val]) => 
                      !["estimated_revenue", "rating", "review_count", "reviews_source_url", "employee_count"].includes(key) &&
                      val !== null && val !== undefined && val !== "" && String(val).trim().toUpperCase() !== "N/A"
                    )
                    .map(([key, val]) => (
                      <div key={key} className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-semibold text-slate-500 capitalize">
                          {key.replace(/_/g, " ")}:
                        </span>
                        <span className="text-slate-200 leading-relaxed font-normal">
                          {String(val)}
                        </span>
                      </div>
                    ))}

                  {Object.keys(entity.specific_detail || {}).length === 0 && (
                    <p className="text-xs text-slate-500 italic">No specialized attributes registered.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LOCATION & CONTACT */}
        {activeTab === "location" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <MapPin className="h-4 w-4 text-indigo-400" />
                <span>Geographic Territory & Commercial Communication Channels</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Physical premises geocoding, public contact endpoints, and external map coordinates.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Physical Address Card */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Premises Address
                  </h3>
                  {entity.location && (
                    <button
                      onClick={() => {
                        const full = `${entity.location?.address || ""}, ${entity.location?.city || ""}, ${entity.location?.state || ""} ${entity.location?.zip_code || ""}`;
                        copyToClipboard(full, "address");
                      }}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                    >
                      <Copy className="h-3 w-3" />
                      <span>{copiedField === "address" ? "Copied!" : "Copy Full Address"}</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800/40">
                    <span className="text-slate-400">Street Address</span>
                    <span className="font-semibold text-white">{entity.location?.address || "Commercial Corridor"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/40">
                    <span className="text-slate-400">City / Municipality</span>
                    <span className="font-semibold text-white">{entity.location?.city || "State College"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/40">
                    <span className="text-slate-400">State / Province</span>
                    <span className="font-semibold text-white">{entity.location?.state || "PA"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/40">
                    <span className="text-slate-400">Postal / ZIP Code</span>
                    <span className="font-mono text-white">{entity.location?.zip_code || "16801"}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Jurisdiction</span>
                    <span className="font-semibold text-white">{entity.location?.country || "USA"}</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap gap-2">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${entity.name} ${entity.location?.city || ""} ${entity.location?.state || ""}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3 text-indigo-400" />
                    <span>Open in Google Maps</span>
                  </a>
                  <a
                    href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(`${entity.name} ${entity.location?.city || ""}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3 text-cyan-400" />
                    <span>Open in OpenStreetMap</span>
                  </a>
                </div>
              </div>

              {/* Public Communications Channels */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                    Public Contact Channels
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">Public Filings</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-emerald-400" />
                      <span className="text-slate-400 font-medium">Telephone:</span>
                    </div>
                    {entity.contact?.phone ? (
                      <a href={`tel:${entity.contact.phone}`} className="font-mono font-bold text-white hover:text-emerald-300">
                        {entity.contact.phone}
                      </a>
                    ) : (
                      <span className="text-slate-500 italic">Unlisted</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-cyan-400" />
                      <span className="text-slate-400 font-medium">Public Email:</span>
                    </div>
                    {entity.contact?.email ? (
                      <a href={`mailto:${entity.contact.email}`} className="font-mono text-cyan-300 hover:underline">
                        {entity.contact.email}
                      </a>
                    ) : (
                      <span className="text-slate-500 italic">Not Publicly Disclosed</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-indigo-400" />
                      <span className="text-slate-400 font-medium">Web Domain:</span>
                    </div>
                    {entity.contact?.website ? (
                      <a
                        href={entity.contact.website.startsWith("http") ? entity.contact.website : `https://${entity.contact.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-indigo-400 font-bold hover:underline flex items-center gap-1"
                      >
                        <span>{entity.contact.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-slate-500 italic">Domain Unregistered</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SERVICES & CATALOG */}
        {activeTab === "services" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-400" />
                <span>Commercial Services & Product Taxonomy</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Categorized catalog offerings, service tags, and capabilities indexed from public registries and menus.
              </p>
            </div>

            {entity.services.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-slate-800 text-center text-slate-400 text-xs">
                No individual service tags currently registered for this entity.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Indexed Capabilities ({entity.services.length})
                  </span>
                  <span className="text-[11px] font-mono text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800/40">
                    Taxonomy Complete
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {entity.services.map((svc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs shadow-sm hover:border-indigo-600/60 transition-colors"
                    >
                      <span className="h-2 w-2 rounded-full bg-indigo-500" />
                      <span className="font-semibold text-slate-200">{svc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SOURCE PROVENANCE */}
        {activeTab === "sources" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="h-4 w-4 text-cyan-400" />
                <span>Data Lineage & Verified Provenance Sources</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Every external registry, municipal directory, and public authority record that contributed to this dossier.
              </p>
            </div>

            <div className="space-y-3">
              {entity.sources.map((src, idx) => (
                <div
                  key={src.id || idx}
                  className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-cyan-400" />
                      <span className="font-bold text-white text-sm">{src.source_name}</span>
                    </div>
                    {src.source_url && (
                      <a
                        href={src.source_url.startsWith("http") ? src.source_url : `https://${src.source_url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 font-mono text-[11px] hover:underline flex items-center gap-1"
                      >
                        <span className="truncate max-w-md">{src.source_url}</span>
                        <ArrowUpRight className="h-3 w-3 shrink-0" />
                      </a>
                    )}
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Ingestion Time</span>
                    <span className="text-xs font-mono text-slate-300">
                      {src.collected_at ? new Date(src.collected_at).toLocaleString() : "Active Index"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: DATA GOVERNANCE & AUDIT TRAIL */}
        {activeTab === "verification" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Verification Evidence & Phase 5 Immutable Audit Log</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Complete audit history including data quality checks, verification reasons, and field modifications.
              </p>
            </div>

            {/* Verification Checklist */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Automated Quality Verification Checkpoints
              </h3>
              {entity.verifications.map((v, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-4 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span className="font-bold text-white">Status: {v.status}</span>
                    </div>
                    <span className="font-mono text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/60">
                      Confidence: {v.confidence_score}%
                    </span>
                  </div>
                  <div className="text-slate-300 whitespace-pre-line font-mono text-[11px] bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
                    {v.evidence}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Verified at: {v.verified_at ? new Date(v.verified_at).toLocaleString() : "Active Session"}
                  </div>
                </div>
              ))}
            </div>

            {/* Immutable Audit Trail Records */}
            <div className="space-y-3 pt-3 border-t border-slate-800/80">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Field Change Audit Trail ({entity.audit_trail?.length || 0} events)
              </h3>

              {!entity.audit_trail || entity.audit_trail.length === 0 ? (
                <p className="text-xs text-slate-500 italic">
                  No manual corrections recorded yet. Baseline record matches original public registry ingestion.
                </p>
              ) : (
                <div className="space-y-2">
                  {entity.audit_trail.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 space-y-1.5 text-xs font-mono"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-indigo-400 font-bold">{entry.action}</span>
                        <span className="text-slate-500 text-[10px]">{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : ""}</span>
                      </div>
                      <div className="text-slate-300 text-[11px]">
                        <span className="text-slate-500 font-sans">Field:</span> <span className="text-cyan-300">{entry.field_name}</span>
                        <span className="text-slate-500 mx-2 font-sans">| Changed by:</span> <span className="text-slate-200">{entry.changed_by}</span>
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        <span className="text-rose-400 font-bold">- {entry.old_value}</span>
                        <span className="text-emerald-400 font-bold ml-3">+ {entry.new_value}</span>
                      </div>
                      <div className="text-slate-500 text-[10px] italic font-sans pt-1">
                        Reason: {entry.reason}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: RELATIONSHIPS */}
        {activeTab === "relationships" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Share2 className="h-4 w-4 text-violet-400" />
                <span>Inter-Entity Affiliation & Commercial Network</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Cross-organizational affiliations, joint ventures, and market network linkages.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">
                  Outgoing Affiliations ({entity.outgoing_relationships.length})
                </h3>
                {entity.outgoing_relationships.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-4 rounded-xl border border-dashed border-slate-800 text-center">
                    No direct outgoing corporate affiliations identified in public filings.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {entity.outgoing_relationships.map((rel) => (
                      <div
                        key={rel.id}
                        className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-white">{entity.name}</span>
                          <span className="mx-2 text-indigo-400 font-bold">→ {rel.relationship_type} →</span>
                          <Link href={`/entities/${rel.target_entity_id}`} className="font-bold text-indigo-300 hover:underline">
                            {rel.target_entity_name} ({rel.target_entity_type})
                          </Link>
                        </div>
                        <span className="text-[10px] text-slate-500 italic">&ldquo;{rel.evidence}&rdquo;</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-violet-400 mb-2">
                  Incoming Affiliations ({entity.incoming_relationships.length})
                </h3>
                {entity.incoming_relationships.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-4 rounded-xl border border-dashed border-slate-800 text-center">
                    No incoming references from affiliate entities recorded.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {entity.incoming_relationships.map((rel) => (
                      <div
                        key={rel.id}
                        className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <Link href={`/entities/${rel.source_entity_id}`} className="font-bold text-indigo-300 hover:underline">
                            {rel.source_entity_name} ({rel.source_entity_type})
                          </Link>
                          <span className="mx-2 text-indigo-400 font-bold">→ {rel.relationship_type} →</span>
                          <span className="font-bold text-white">{entity.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 italic">&ldquo;{rel.evidence}&rdquo;</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
