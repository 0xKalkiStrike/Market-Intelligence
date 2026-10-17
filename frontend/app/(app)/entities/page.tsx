"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { api, API_BASE } from "@/lib/api";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { PageLoading } from "@/components/ui/Spinner";

interface EntityItem {
  id: string;
  name: string;
  entity_type: string;
  verification_status: string;
  freshness_status: string;
  data_quality_score: number;
  estimated_revenue: string | null;
  rating: number | null;
  review_count: number | null;
  reviews_source_url: string | null;
  employee_count: string | null;
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

export default function EntityIntelligencePage() {
  const [entities, setEntities] = useState<EntityItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [entityType, setEntityType] = useState("ALL");
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);


  const fetchEntities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (entityType !== "ALL") params.set("entity_type", entityType);
      if (stateFilter) params.set("state", stateFilter);
      if (search) params.set("search", search);
      params.set("page", page.toString());
      params.set("limit", limit.toString());

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
  }, [entityType, stateFilter, page, limit]);

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800/60 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 dark:bg-indigo-900/50 px-3 py-0.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1">
            MASTER ENTITY DIRECTORY
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-200 sm:text-3xl">Entity Intelligence</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Central repository of resolved, deduplicated, and verified market entities (Doctors, Healthcare Providers, Dispensaries, Clinics, Competitors, Companies).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href={`${API_BASE}/api/market-intelligence/export?format=csv`} target="_blank" rel="noreferrer">
            <Button variant="secondary" size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          </a>
          <a href={`${API_BASE}/api/market-intelligence/export?format=json`} target="_blank" rel="noreferrer">
            <Button variant="secondary" size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export JSON
            </Button>
          </a>
          <Link href="/market">
            <Button variant="gradient" size="sm">
              Open Explorer
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardBody className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Search Entity Name / Details</label>
            <Input
              placeholder="Search by name, website, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); fetchEntities(); } }}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Entity Classification</label>
            <select
              value={entityType}
              onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              <option value="ALL">All Entity Classifications</option>
              <option value="DOCTOR">Doctor / Physician</option>
              <option value="PROVIDER">Healthcare Provider</option>
              <option value="DISPENSARY">Dispensary</option>
              <option value="CLINIC">Clinic</option>
              <option value="COMPETITOR">Market Competitor</option>
              <option value="COMPANY">Company / Organization</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">State / Region</label>
            <select
              value={stateFilter}
              onChange={(e) => { setStateFilter(e.target.value); setPage(1); }}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              <option value="">All Regions</option>
              <option value="PA">Pennsylvania</option>
              <option value="CA">California</option>
              <option value="FL">Florida</option>
              <option value="TX">Texas</option>
              <option value="OH">Ohio</option>
              <option value="NY">New York</option>
              <option value="AZ">Arizona</option>
            </select>
          </div>
        </CardBody>
      </Card>

      {/* Main Entities Table */}
      <Card>
        <CardHeader className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 py-3.5">
          <span className="font-bold text-slate-900 dark:text-slate-200 text-sm">Discovered Master Entities ({total.toLocaleString()})</span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-white"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </CardHeader>
        <CardBody className="p-0 overflow-x-auto custom-scrollbar">
          {loading ? (
            <PageLoading />
          ) : entities.length === 0 ? (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 text-2xl mx-auto mb-3">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-200">No Master Entities Found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                No market entities match the current filters. Launch a Data Collection run to gather public records.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
              <thead className="border-b border-slate-200 dark:border-slate-800/60 bg-slate-50/80 dark:bg-slate-900/60 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Entity Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Est. Revenue</th>
                  <th className="px-4 py-3">Rating / Reviews</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Verification</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {entities.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-200">
                      <Link href={`/entities/${e.id}`} className="text-indigo-600 hover:underline">
                        {e.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={e.entity_type === "DOCTOR" ? "info" : e.entity_type === "DISPENSARY" ? "success" : e.entity_type === "COMPETITOR" ? "warning" : "neutral"}>
                        {e.entity_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                      {e.city && e.state ? `${e.city}, ${e.state}` : (e.state || "N/A")}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-400">{e.estimated_revenue || "—"}</td>
                    <td className="px-4 py-3 font-medium">
                      {e.rating ? (
                        <span className="text-amber-400 font-bold">⭐ {e.rating} <span className="text-slate-400 font-normal">({e.review_count || 0})</span></span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{e.phone || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge tone={e.verification_status === "VERIFIED" ? "success" : "warning"}>
                        {e.verification_status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/entities/${e.id}`}>
                        <Button variant="secondary" size="xs">
                          Inspect →
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>


        {/* Pagination Footer */}
        {total > 0 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing <span className="font-bold text-white">{((page - 1) * limit) + 1}</span> to <span className="font-bold text-white">{Math.min(page * limit, total)}</span> of <span className="font-bold text-white">{total.toLocaleString()}</span> entities
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="xs" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </Button>
              <span className="font-mono font-bold text-white text-xs px-2">Page {page} of {totalPages}</span>
              <Button variant="secondary" size="xs" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

