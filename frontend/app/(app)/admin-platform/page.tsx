"use client";

import { useEffect, useState } from "react";
import {
  ShieldAlert,
  Building2,
  Users,
  DollarSign,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  ExternalLink,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";

interface PlatformMetrics {
  total_organizations: number;
  total_users: number;
  mrr_usd: number;
  plan_breakdown: Record<string, number>;
  total_ai_tokens_consumed: number;
}

interface PlatformOrg {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  status: string;
  plan_tier: string;
  subscription_status: string;
  active_members_count: number;
  is_demo: boolean;
  created_at: string;
}

export default function PlatformAdminPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [orgs, setOrgs] = useState<PlatformOrg[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function loadPlatformData() {
    try {
      setLoading(true);
      setError(null);
      const [mRes, oRes] = await Promise.all([
        api.get<PlatformMetrics>("/api/admin/platform/metrics"),
        api.get<PlatformOrg[]>("/api/admin/platform/organizations"),
      ]);
      setMetrics(mRes);
      setOrgs(oRes);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 403) {
        setError("Access Restricted: Superuser platform administrator privileges required.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to load platform admin metrics");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlatformData();
  }, []);

  const handleUpdateStatus = async (orgId: string, newStatus: string) => {
    try {
      setError(null);
      await api.patch(`/api/admin/platform/organizations/${orgId}/status`, { status: newStatus });
      setSuccessMsg(`Organization status updated to ${newStatus}`);
      loadPlatformData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update organization status");
    }
  };

  const filteredOrgs = orgs.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.slug.toLowerCase().includes(search.toLowerCase()) ||
      (o.domain && o.domain.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Platform Banner */}
      <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-purple-950/30 p-6 shadow-xl backdrop-blur-xl sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-500/40 bg-indigo-950/60 text-indigo-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-950/50 px-2.5 py-0.5 text-xs font-semibold text-indigo-400">
              Platform Superadmin Zone
            </div>
            <h1 className="mt-1 text-2xl font-bold text-white">Cross-Tenant Enterprise Administration</h1>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400 max-w-3xl">
          Least-privilege operational oversight. Manage tenant lifecycles, inspect aggregated platform telemetry,
          and oversee commercial billing without penetrating private organizational datasets.
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-sm text-rose-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-sm text-emerald-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
      {metrics && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
              <span>Total Organizations</span>
              <Building2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-3 text-2xl font-bold text-white">
              {metrics.total_organizations.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-slate-500">Active tenant workspaces</div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
              <span>Platform Users</span>
              <Users className="h-4 w-4 text-teal-400" />
            </div>
            <div className="mt-3 text-2xl font-bold text-white">
              {metrics.total_users.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-slate-500">Across all customer organizations</div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
              <span>Estimated MRR</span>
              <DollarSign className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mt-3 text-2xl font-bold text-white">
              ${metrics.mrr_usd.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </div>
            <div className="mt-1 text-xs text-slate-500">Monthly Recurring Revenue</div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
              <span>Platform AI Tokens</span>
              <Cpu className="h-4 w-4 text-purple-400" />
            </div>
            <div className="mt-3 text-2xl font-bold text-white">
              {metrics.total_ai_tokens_consumed.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-slate-500">Total metered tokens</div>
          </div>
        </div>
      )}

      {/* Organizations Directory Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-800 px-6 py-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-semibold text-white">Customer Workspaces Directory</h2>
            <p className="text-xs text-slate-400">Manage tenant statuses and inspect commercial subscriptions.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, slug, domain..."
              className="rounded-xl border border-slate-800 bg-slate-950/80 py-1.5 pl-9 pr-4 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/50 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-3.5">Organization</th>
                <th className="px-6 py-3.5">Plan Tier</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Seats</th>
                <th className="px-6 py-3.5">Created At</th>
                <th className="px-6 py-3.5 text-right">Lifecycle Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">
                    No organizations matching filter.
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-900/40">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{org.name}</div>
                      <div className="text-xs text-slate-500 font-mono">
                        slug: {org.slug} {org.domain ? `• ${org.domain}` : ""}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                        {org.plan_tier}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          org.status === "ACTIVE"
                            ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/30"
                            : org.status === "SUSPENDED"
                            ? "bg-amber-950/40 text-amber-400 border border-amber-500/30"
                            : "bg-rose-950/40 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {org.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-300 font-medium">
                      {org.active_members_count} members
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(org.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <select
                        value={org.status}
                        onChange={(e) => handleUpdateStatus(org.id, e.target.value)}
                        className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-medium text-slate-200 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="SUSPENDED">Suspended</option>
                        <option value="DEACTIVATED">Deactivated</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
