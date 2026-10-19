"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { PageLoading } from "@/components/ui/Spinner";

interface EntityItem {
  id: string;
  name: string;
  entity_type: string;
  verification_status: string;
  freshness_status: string;
  data_quality_score: number;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  source_name: string;
  source_url: string | null;
  created_at: string;
}

interface EntityDetail extends EntityItem {
  location: { address: string | null; city: string | null; state: string | null; zip_code: string | null; country: string } | null;
  contact: { phone: string | null; email: string | null; website: string | null } | null;
  specific_detail: Record<string, unknown>;
  sources: { id: string; source_name: string; source_url: string; collected_at: string }[];
  verifications: { status: string; confidence_score: number; evidence: string; verified_at: string }[];
  duplicates: { id: string; matched_entity_name: string; match_score: number; match_reasons: string; status: string }[];
}

export default function MarketExplorerPage() {
  const [entities, setEntities] = useState<EntityItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [entityType, setEntityType] = useState("ALL");
  const [stateFilter, setStateFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("ALL");
  const [freshnessStatus, setFreshnessStatus] = useState("ALL");
  const [search, setSearch] = useState("");

  // Detail Modal State
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [detail, setDetail] = useState<EntityDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchEntities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (entityType !== "ALL") params.set("entity_type", entityType);
      if (stateFilter) params.set("state", stateFilter);
      if (cityFilter) params.set("city", cityFilter);
      if (verificationStatus !== "ALL") params.set("verification_status", verificationStatus);
      if (freshnessStatus !== "ALL") params.set("freshness_status", freshnessStatus);
      if (search) params.set("search", search);

      const res = await api.get<{ items: EntityItem[]; total: number }>(`/api/market-intelligence/entities?${params.toString()}`);
      setEntities(res.items || []);
      setTotal(res.total || 0);
    } catch {
      setEntities([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntities();
  }, [entityType, stateFilter, cityFilter, verificationStatus, freshnessStatus]);

  const handleOpenDetail = async (id: string) => {
    setSelectedEntityId(id);
    setDetailLoading(true);
    try {
      const res = await api.get<EntityDetail>(`/api/market-intelligence/entities/${id}`);
      setDetail(res);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExport = (fmt: string) => {
    const params = new URLSearchParams();
    params.set("format", fmt);
    if (entityType !== "ALL") params.set("entity_type", entityType);
    if (stateFilter) params.set("state", stateFilter);
    if (verificationStatus !== "ALL") params.set("verification_status", verificationStatus);

    window.open(`/api/market-intelligence/export?${params.toString()}`, "_blank");
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 dark:border-[#29354b] pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-md bg-indigo-500/10 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 mb-1">
            PUBLIC MARKET EXPLORER
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight sm:text-3xl">
            Market Intelligence Explorer
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Search, filter, and inspect verified public market entities collected across surface web directories & registries.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleExport("csv")}>
            Export CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleExport("json")}>
            Export JSON
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardBody className="p-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 flex-1">
            {/* Search */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">Search Entity</label>
              <Input
                placeholder="Name, Phone, City, Website..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchEntities()}
                className="text-xs rounded-lg border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#18233a]"
              />
            </div>

            {/* Entity Type */}
            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">Entity Type</label>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="w-full rounded-lg border border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#18233a] px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value="ALL">All Entity Types</option>
                <option value="DOCTOR">Doctor / Physician</option>
                <option value="PROVIDER">Healthcare Provider</option>
                <option value="DISPENSARY">Dispensary</option>
                <option value="CLINIC">Clinic</option>
                <option value="COMPETITOR">Market Competitor</option>
                <option value="COMPANY">Company / Organization</option>
              </select>
            </div>

            {/* State */}
            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">State / Geography</label>
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#18233a] px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value="">All States</option>
                <option value="CA">California (CA)</option>
                <option value="OH">Ohio (OH)</option>
                <option value="NY">New York (NY)</option>
                <option value="TX">Texas (TX)</option>
                <option value="FL">Florida (FL)</option>
              </select>
            </div>

            {/* Verification Status */}
            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">Verification</label>
              <select
                value={verificationStatus}
                onChange={(e) => setVerificationStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#18233a] px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value="ALL">All Verification Statuses</option>
                <option value="VERIFIED">Verified Only</option>
                <option value="PARTIALLY_VERIFIED">Partially Verified</option>
                <option value="UNVERIFIED">Unverified</option>
                <option value="NEEDS_REVIEW">Needs Review</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end lg:self-center pt-2 lg:pt-0">
            <Button variant="indigo" size="sm" onClick={fetchEntities} isLoading={loading}>
              Apply Filters
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Main Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-[#29354b] py-3.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 dark:text-slate-200 text-xs uppercase tracking-wider">Discovered Market Entities</span>
            <Badge tone="indigo">{total} Records</Badge>
          </div>
        </CardHeader>
        <CardBody className="p-0 overflow-x-auto custom-scrollbar">
          {loading ? (
            <PageLoading />
          ) : entities.length === 0 ? (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-[#18233a] text-indigo-500 text-2xl mx-auto mb-3 border border-slate-200/80 dark:border-[#29354b]">
                <Search className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200">No Market Entities Found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                No surface-web market entities match your selected criteria. Trigger a Data Collection run to gather public records!
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
              <thead className="border-b border-slate-200 dark:border-[#29354b] bg-slate-50/80 dark:bg-[#18233a] text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Entity Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Public Phone</th>
                  <th className="px-4 py-3">Source Provenance</th>
                  <th className="px-4 py-3">Quality Score</th>
                  <th className="px-4 py-3">Verification</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#29354b]">
                {entities.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/80 dark:hover:bg-[#1c2740]/60 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-200">
                      <button onClick={() => handleOpenDetail(e.id)} className="text-indigo-600 dark:text-indigo-400 hover:underline text-left">
                        {e.name}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={e.entity_type === "DOCTOR" ? "indigo" : e.entity_type === "DISPENSARY" ? "cyan" : e.entity_type === "COMPETITOR" ? "warning" : "neutral"}>
                        {e.entity_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                      {e.city && e.state ? `${e.city}, ${e.state}` : (e.state || "N/A")}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{e.phone || "—"}</td>
                    <td className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">{e.source_name}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{e.data_quality_score}%</td>
                    <td className="px-4 py-3">
                      <Badge tone={e.verification_status === "VERIFIED" ? "success" : e.verification_status === "NEEDS_REVIEW" ? "warning" : "neutral"}>
                        {e.verification_status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="secondary" size="xs" onClick={() => handleOpenDetail(e.id)}>
                          Quick View
                        </Button>
                        <Link
                          href={`/entities/${e.id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 hover:text-indigo-400 px-2 py-1 font-semibold transition-all text-[11px] border border-indigo-500/20"
                        >
                          Dossier ↗
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {/* Entity Inspect Modal */}
      <Modal open={!!selectedEntityId} onClose={() => setSelectedEntityId(null)} title={detail?.name || "Inspect Entity Record"} maxWidth="2xl">
        {detailLoading ? (
          <PageLoading />
        ) : detail ? (
          <div className="flex flex-col gap-4 text-xs">
            {/* Header Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3.5">
              <div>
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400 block">Entity Type</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge tone={detail.entity_type === "DOCTOR" ? "info" : detail.entity_type === "DISPENSARY" ? "success" : "purple"}>
                    {detail.entity_type}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={detail.verification_status === "VERIFIED" ? "success" : detail.verification_status === "NEEDS_REVIEW" ? "warning" : "neutral"}>
                  {detail.verification_status}
                </Badge>
                <Badge tone="info">Quality Score: {detail.data_quality_score}%</Badge>
              </div>
            </div>

            {/* Location Details Card */}
            {detail.location && (
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
                <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Location Details
                </span>
                <p className="font-bold text-slate-900 dark:text-slate-100 text-xs leading-relaxed">
                  {detail.location.address || "Address details on record"}, {detail.location.city || ""}, {detail.location.state || ""} {detail.location.zip_code || ""}
                </p>
              </div>
            )}

            {/* Contact Details Card */}
            {detail.contact && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Public Phone
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs font-mono">
                    {detail.contact.phone || "Not Listed"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Public Website / URL
                  </span>
                  {detail.contact.website ? (
                    <a
                      href={detail.contact.website.startsWith("http") ? detail.contact.website : `https://${detail.contact.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 truncate block hover:underline text-xs flex items-center gap-1.5"
                    >
                      <span className="truncate max-w-[220px]">{detail.contact.website}</span>
                      <span className="text-[10px] font-extrabold text-indigo-500">↗</span>
                    </a>
                  ) : (
                    <span className="font-medium text-slate-400 text-xs">Not Listed</span>
                  )}
                </div>
              </div>
            )}

            {/* Source Provenance Card */}
            {detail.sources && detail.sources.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Source Traceability & Provenance
                </span>
                <div className="space-y-2">
                  {detail.sources.map((s) => (
                    <div key={s.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800/80 gap-2">
                      <span className="font-bold text-slate-900 dark:text-slate-200 text-xs">{s.source_name}</span>
                      {s.source_url ? (
                        <a
                          href={s.source_url.startsWith("http") ? s.source_url : `https://${s.source_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 hover:underline text-xs truncate max-w-xs flex items-center gap-1"
                        >
                          <span className="truncate">{s.source_url}</span>
                          <span className="text-[10px] font-extrabold">↗</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs font-mono">Directory Record</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Specific Detail (Doctor/Dispensary/Competitor) */}
            {detail.specific_detail && Object.keys(detail.specific_detail).length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 space-y-2">
                <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Category Attributes & Intelligence
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {Object.entries(detail.specific_detail).map(([key, val]) => (
                    val ? (
                      <div key={key} className="flex flex-col">
                        <span className="text-[10px] text-slate-400 capitalize font-medium">{key.replace("_", " ")}</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{String(val)}</span>
                      </div>
                    ) : null
                  ))}
                </div>
              </div>
            )}

            {/* Modal Action Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 font-mono">Entity ID: {detail.id}</span>
              <Link
                href={`/entities/${detail.id}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 text-xs shadow-md shadow-indigo-600/30 transition-all"
              >
                Open Full Executive Dossier ↗
              </Link>
            </div>
          </div>
        ) : (
          <p className="text-slate-500 dark:text-slate-400">Failed to load entity details.</p>
        )}
      </Modal>
    </div>
  );
}
