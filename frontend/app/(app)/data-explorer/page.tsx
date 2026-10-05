"use client";

import { useEffect, useState } from "react";
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
  is_demo: boolean;
}

interface EntityDetail extends EntityItem {
  location: { address: string | null; city: string | null; state: string | null; zip_code: string | null; country: string } | null;
  contact: { phone: string | null; email: string | null; website: string | null } | null;
  specific_detail: Record<string, any>;
  sources: { id: string; source_name: string; source_url: string; collected_at: string }[];
  verifications: { status: string; confidence_score: number; evidence: string; verified_at: string }[];
  duplicates: { id: string; matched_entity_name: string; match_score: number; match_reasons: string; status: string }[];
}


export default function DataExplorerPage() {
  const [entities, setEntities] = useState<EntityItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [entityType, setEntityType] = useState("ALL");
  const [stateFilter, setStateFilter] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("ALL");
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
      if (verificationStatus !== "ALL") params.set("verification_status", verificationStatus);
      if (search) params.set("search", search);

      const res = await api.get<{ items: EntityItem[]; total: number }>(`/api/market-intelligence/entities?${params.toString()}`);
      setEntities(res.items);
      setTotal(res.total);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntities();
  }, [entityType, stateFilter, verificationStatus]);

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

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Page Title & Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800/60 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 dark:bg-indigo-900/50 px-3 py-0.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1">
            PHASE 1 MASTER DATASET
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-200 sm:text-3xl">Market Data Explorer</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Browse, filter, inspect evidence, and export verified surface-web entity records ({total} total).
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a href="http://localhost:8000/api/market-intelligence/export?format=csv" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="font-bold">Export CSV</Button>
          </a>
          <a href="http://localhost:8000/api/market-intelligence/export?format=json" target="_blank" rel="noopener noreferrer">
            <Button variant="secondary" size="sm" className="font-bold">JSON Export</Button>
          </a>
        </div>
      </div>

      {/* Filter Control Bar */}
      <Card>
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 items-end">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Search Entity</label>
            <Input
              placeholder="Search name, phone, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchEntities()}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Entity Category</label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-xs focus:border-indigo-500 focus:outline-none"
            >
              <option value="ALL">All Entity Types</option>
              <option value="DOCTOR">Doctors / Providers</option>
              <option value="DISPENSARY">Dispensaries</option>
              <option value="CLINIC">Clinics</option>
              <option value="COMPETITOR">Competitors</option>
              <option value="ORGANIZATION">Organizations</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">State Filter</label>
            <input
              type="text"
              placeholder="e.g. CA, NY"
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Verification Status</label>
            <select
              value={verificationStatus}
              onChange={(e) => setVerificationStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs focus:border-indigo-500 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="VERIFIED">Verified Only</option>
              <option value="PARTIALLY_VERIFIED">Partially Verified</option>
              <option value="NEEDS_REVIEW">Needs Review</option>
              <option value="UNVERIFIED">Unverified</option>
            </select>
          </div>

          <div>
            <Button onClick={fetchEntities} variant="gradient" size="sm" className="w-full font-bold">
              <span>Apply Filters</span>
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Main Entities Table */}
      <Card>
        <CardHeader className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Master Dataset Table</h2>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Showing {entities.length} of {total} records</span>
        </CardHeader>

        {loading ? (
          <div className="py-12"><PageLoading /></div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-100/90 dark:bg-slate-800/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Entity Name</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Phone</th>
                  <th className="py-3.5 px-4">Website</th>
                  <th className="py-3.5 px-4">Source</th>
                  <th className="py-3.5 px-4">Verification</th>
                  <th className="py-3.5 px-4">Quality Score</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                {entities.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/90 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-2">
                        <span>{e.name}</span>
                        {e.is_demo && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 rounded border border-amber-300 dark:border-amber-800/60">
                            DEMO DATA
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge tone={e.entity_type === "DOCTOR" ? "info" : e.entity_type === "DISPENSARY" ? "success" : "purple"}>
                        {e.entity_type}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{e.city ? `${e.city}, ${e.state}` : e.state || "—"}</td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">{e.phone || "—"}</td>
                    <td className="py-3 px-4">
                      {e.website ? (
                        <a
                          href={e.website.startsWith("http") ? e.website : `https://${e.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-1"
                        >
                          <span className="truncate max-w-[120px]">{e.website.replace(/^https?:\/\//, "")}</span>
                          <span>↗</span>
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">{e.source_name}</td>
                    <td className="py-3 px-4">
                      <Badge tone={e.verification_status === "VERIFIED" ? "success" : e.verification_status === "PARTIALLY_VERIFIED" ? "info" : "warning"}>
                        {e.verification_status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-extrabold text-indigo-600 dark:text-indigo-400">{e.data_quality_score}%</td>
                    <td className="py-3 px-4 text-right">
                      <Button size="sm" variant="secondary" onClick={() => handleOpenDetail(e.id)}>
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Entity Detail Drawer / Modal */}
      {selectedEntityId && (
        <Modal open={Boolean(selectedEntityId)} onClose={() => setSelectedEntityId(null)} title="Entity Evidence & Detail Panel" maxWidth="2xl">

          {detailLoading || !detail ? (
            <div className="py-8"><PageLoading /></div>
          ) : (
            <div className="space-y-6 text-xs text-slate-700 dark:text-slate-300">
              {/* Header Info */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800/80 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{detail.name}</h2>
                    {detail.is_demo && (
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 rounded border border-amber-300 dark:border-amber-800">
                        DEMO DATA
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">Category: {detail.entity_type}</p>
                </div>
                <div className="text-right">
                  <Badge tone={detail.verification_status === "VERIFIED" ? "success" : "warning"}>
                    {detail.verification_status}
                  </Badge>
                  <p className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">Quality: {detail.data_quality_score}%</p>
                </div>
              </div>

              {/* Location & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800/80 space-y-1">
                  <h4 className="font-extrabold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400">Location Address</h4>
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-xs">{detail.location?.address || "Address unavailable"}</p>
                  <p className="text-slate-600 dark:text-slate-400 text-xs">{detail.location?.city}, {detail.location?.state} {detail.location?.zip_code}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800/80 space-y-1">
                  <h4 className="font-extrabold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400">Contact Channels</h4>
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-xs">Phone: {detail.contact?.phone || "Not Listed"}</p>
                  <p className="text-slate-600 dark:text-slate-400 text-xs">Email: {detail.contact?.email || "Not Listed"}</p>
                  {detail.contact?.website && (
                    <a
                      href={detail.contact.website.startsWith("http") ? detail.contact.website : `https://${detail.contact.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline block text-xs truncate"
                    >
                      {detail.contact.website} ↗
                    </a>
                  )}
                </div>
              </div>

              {/* Specific Category Details */}
              {Object.keys(detail.specific_detail || {}).length > 0 && (
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-800/60 space-y-2">
                  <h4 className="font-extrabold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400">Domain / Category Specifications</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(detail.specific_detail).map(([k, v]) => (
                      <div key={k}>
                        <span className="font-semibold text-slate-500 dark:text-slate-400 capitalize">{k.replace("_", " ")}: </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{v || "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Source Evidence List */}
              <div className="space-y-2">
                <h4 className="font-extrabold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400">Source Evidence Links</h4>
                <div className="space-y-2">
                  {detail.sources.map((s) => (
                    <div key={s.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800/80 gap-2">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-slate-100 text-xs">{s.source_name}</p>
                        {s.source_url ? (
                          <a
                            href={s.source_url.startsWith("http") ? s.source_url : `https://${s.source_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline text-xs truncate max-w-xs block"
                          >
                            {s.source_url} ↗
                          </a>
                        ) : (
                          <p className="text-[10px] text-slate-400">Directory Record</p>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{s.collected_at?.split("T")[0]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Verification Rationale */}
              <div className="space-y-2">
                <h4 className="font-extrabold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400">Verification Rationale & Evidence</h4>
                {detail.verifications.map((v, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/60">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-indigo-900 dark:text-indigo-200">{v.status}</span>
                      <span className="font-extrabold text-indigo-700 dark:text-indigo-300">{v.confidence_score}% Score</span>
                    </div>
                    <pre className="whitespace-pre-wrap text-[11px] text-indigo-950 dark:text-indigo-300 font-mono">{v.evidence}</pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
