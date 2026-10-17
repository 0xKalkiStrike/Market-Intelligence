"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Users,
  Mail,
  Shield,
  Settings,
  FileText,
  UserPlus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Globe,
  Plus,
  ArrowRightLeft,
  X,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";

interface OrgInfo {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  status: string;
  plan_tier: string;
  user_role: string;
  created_at: string;
}

interface Member {
  membership_id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  joined_at: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  status: string;
  expires_at: string;
  created_at: string;
}

interface AuditLog {
  id: string;
  actor_email: string;
  action: string;
  target_type: string;
  target_id: string;
  metadata: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

export default function OrganizationPage() {
  const [tab, setTab] = useState<"members" | "invitations" | "settings" | "audit">("members");
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal states
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("ANALYST");
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [newOwnerId, setNewOwnerId] = useState("");

  // Settings form
  const [markets, setMarkets] = useState<string[]>([]);
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [notificationEmail, setNotificationEmail] = useState("");
  const [newComp, setNewComp] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [orgRes, membersRes, invRes, settingsRes, auditRes] = await Promise.all([
        api.get<OrgInfo>("/api/tenants/current"),
        api.get<Member[]>("/api/tenants/members"),
        api.get<Invitation[]>("/api/tenants/invitations").catch(() => []),
        api.get<{
          permitted_geographic_markets: string[];
          monitored_competitors: string[];
          notification_email?: string;
        }>("/api/tenants/settings"),
        api.get<AuditLog[]>("/api/tenants/audit-logs").catch(() => []),
      ]);

      setOrg(orgRes);
      setMembers(membersRes);
      setInvitations(invRes);
      setMarkets(settingsRes.permitted_geographic_markets || []);
      setCompetitors(settingsRes.monitored_competitors || []);
      setNotificationEmail(settingsRes.notification_email || "");
      setAuditLogs(auditRes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load organization details");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    try {
      setError(null);
      await api.post("/api/tenants/invitations", {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setSuccessMsg(`Invitation dispatched to ${inviteEmail}`);
      setInviteEmail("");
      setInviteModalOpen(false);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send invitation");
    }
  };

  const handleRevokeInvite = async (id: string) => {
    try {
      setError(null);
      await api.delete(`/api/tenants/invitations/${id}`);
      setSuccessMsg("Invitation revoked.");
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to revoke invitation");
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      setError(null);
      await api.patch(`/api/tenants/members/${userId}/role`, { new_role: newRole });
      setSuccessMsg("Member role updated.");
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from this organization?`)) return;
    try {
      setError(null);
      await api.delete(`/api/tenants/members/${userId}`);
      setSuccessMsg("Member removed from organization.");
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  const handleTransferOwnership = async () => {
    if (!newOwnerId) return;
    if (!confirm("Are you sure you want to transfer ownership? You will be demoted to Administrator.")) return;
    try {
      setError(null);
      await api.post("/api/tenants/transfer-ownership", { new_owner_user_id: newOwnerId });
      setSuccessMsg("Ownership successfully transferred.");
      setTransferModalOpen(false);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to transfer ownership");
    }
  };

  const handleSaveSettings = async () => {
    try {
      setError(null);
      await api.put("/api/tenants/settings", {
        permitted_geographic_markets: markets,
        monitored_competitors: competitors,
        notification_email: notificationEmail.trim() || undefined,
      });
      setSuccessMsg("Workspace settings updated.");
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    }
  };

  const isOwnerOrAdmin = org?.user_role === "OWNER" || org?.user_role === "ADMIN";

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Workspace Identity */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-950/40 text-emerald-400 shadow-inner">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white">{org?.name}</h1>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-950/50 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                  {org?.plan_tier}
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300">
                  Your Role: {org?.user_role}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Tenant Slug: <code className="text-slate-300">{org?.slug}</code> • Status:{" "}
                <span className="font-semibold text-emerald-400">{org?.status}</span> • Domain:{" "}
                <span className="text-slate-300">{org?.domain || "None registered"}</span>
              </p>
            </div>
          </div>

          {isOwnerOrAdmin && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setInviteModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-all hover:bg-emerald-400"
              >
                <UserPlus className="h-4 w-4" /> Invite Member
              </button>
              {org?.user_role === "OWNER" && (
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700"
                >
                  <ArrowRightLeft className="h-4 w-4" /> Transfer
                </button>
              )}
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="mt-6 flex border-b border-slate-800 text-sm font-medium">
          <button
            onClick={() => setTab("members")}
            className={`border-b-2 px-4 py-2.5 transition-all ${
              tab === "members"
                ? "border-emerald-500 text-emerald-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Team Members ({members.length})
          </button>
          <button
            onClick={() => setTab("invitations")}
            className={`border-b-2 px-4 py-2.5 transition-all ${
              tab === "invitations"
                ? "border-emerald-500 text-emerald-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Pending Invites ({invitations.filter((i) => i.status === "PENDING").length})
          </button>
          <button
            onClick={() => setTab("settings")}
            className={`border-b-2 px-4 py-2.5 transition-all ${
              tab === "settings"
                ? "border-emerald-500 text-emerald-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Workspace Scope
          </button>
          <button
            onClick={() => setTab("audit")}
            className={`border-b-2 px-4 py-2.5 transition-all ${
              tab === "audit"
                ? "border-emerald-500 text-emerald-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Audit Log ({auditLogs.length})
          </button>
        </div>
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

      {/* TAB 1: MEMBERS */}
      {tab === "members" && (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-xl">
          <div className="border-b border-slate-800 px-6 py-4">
            <h2 className="text-base font-semibold text-white">Active Members</h2>
            <p className="text-xs text-slate-400">
              Users with verified permissions to access and operate inside this organization workspace.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950/50 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-3.5">User</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Joined Date</th>
                  {isOwnerOrAdmin && <th className="px-6 py-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {members.map((m) => (
                  <tr key={m.membership_id} className="hover:bg-slate-900/40">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{m.full_name || m.email}</div>
                      <div className="text-xs text-slate-500">{m.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      {isOwnerOrAdmin && m.role !== "OWNER" ? (
                        <select
                          value={m.role}
                          onChange={(e) => handleUpdateRole(m.user_id, e.target.value)}
                          className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-medium text-slate-200 focus:border-emerald-500 focus:outline-none"
                        >
                          <option value="ADMIN">Administrator</option>
                          <option value="ANALYST">Analyst</option>
                          <option value="VIEWER">Viewer</option>
                        </select>
                      ) : (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            m.role === "OWNER"
                              ? "bg-amber-950/50 text-amber-400 border border-amber-500/30"
                              : m.role === "ADMIN"
                              ? "bg-indigo-950/50 text-indigo-400 border border-indigo-500/30"
                              : "bg-slate-800 text-slate-300 border border-slate-700"
                          }`}
                        >
                          {m.role}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(m.joined_at).toLocaleDateString()}
                    </td>
                    {isOwnerOrAdmin && (
                      <td className="px-6 py-4 text-right">
                        {m.role !== "OWNER" && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m.user_id, m.full_name || m.email)}
                            className="text-xs font-medium text-rose-400 hover:text-rose-300"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: INVITATIONS */}
      {tab === "invitations" && (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-xl">
          <div className="border-b border-slate-800 px-6 py-4">
            <h2 className="text-base font-semibold text-white">Pending Team Invitations</h2>
            <p className="text-xs text-slate-400">
              Invitations expire after 7 days. Users bind to this organization upon accepting the token.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950/50 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Expires</th>
                  {isOwnerOrAdmin && <th className="px-6 py-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {invitations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                      No active invitations.
                    </td>
                  </tr>
                ) : (
                  invitations.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-900/40">
                      <td className="px-6 py-4 font-medium text-white">{inv.email}</td>
                      <td className="px-6 py-4">
                        <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                          {inv.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            inv.status === "PENDING"
                              ? "bg-amber-950/40 text-amber-400 border border-amber-500/30"
                              : inv.status === "ACCEPTED"
                              ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/30"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {new Date(inv.expires_at).toLocaleDateString()}
                      </td>
                      {isOwnerOrAdmin && (
                        <td className="px-6 py-4 text-right">
                          {inv.status === "PENDING" && (
                            <button
                              type="button"
                              onClick={() => handleRevokeInvite(inv.id)}
                              className="text-xs font-medium text-rose-400 hover:text-rose-300"
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SETTINGS */}
      {tab === "settings" && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl sm:p-8 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white">Workspace Configuration</h2>
            <p className="mt-1 text-sm text-slate-400">
              Customize monitored state jurisdictions and competitor entities.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Monitored Geographic Markets (State Codes)
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {["FL", "OK", "OH", "PA", "MI", "CA", "CO"].map((st) => {
                  const active = markets.includes(st);
                  return (
                    <button
                      key={st}
                      type="button"
                      disabled={!isOwnerOrAdmin}
                      onClick={() =>
                        setMarkets((prev) =>
                          prev.includes(st) ? prev.filter((c) => c !== st) : [...prev, st]
                        )
                      }
                      className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
                        active
                          ? "border-emerald-500/80 bg-emerald-950/40 text-emerald-400"
                          : "border-slate-800 bg-slate-950 text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {st} {active && "✓"}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Competitor Watchlist
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {competitors.map((comp) => (
                  <span
                    key={comp}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-1.5 text-sm text-slate-200"
                  >
                    {comp}
                    {isOwnerOrAdmin && (
                      <button
                        type="button"
                        onClick={() => setCompetitors((prev) => prev.filter((c) => c !== comp))}
                        className="text-slate-400 hover:text-rose-400"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {isOwnerOrAdmin && (
                <div className="mt-3 flex max-w-md gap-2">
                  <input
                    type="text"
                    value={newComp}
                    onChange={(e) => setNewComp(e.target.value)}
                    placeholder="Add operator..."
                    className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newComp.trim() && !competitors.includes(newComp.trim())) {
                        setCompetitors([...competitors, newComp.trim()]);
                        setNewComp("");
                      }
                    }}
                    className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Notification Channel Email
              </label>
              <input
                type="email"
                disabled={!isOwnerOrAdmin}
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                placeholder="alerts@company.com"
                className="mt-1.5 max-w-md w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {isOwnerOrAdmin && (
              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
                >
                  Save Configuration
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOG */}
      {tab === "audit" && (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-xl">
          <div className="border-b border-slate-800 px-6 py-4">
            <h2 className="text-base font-semibold text-white">Immutable Tenant Audit Trail</h2>
            <p className="text-xs text-slate-400">
              Security-relevant changes, user invitations, role changes, and workspace configuration adjustments.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950/50 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-3.5">Timestamp</th>
                  <th className="px-6 py-3.5">Actor</th>
                  <th className="px-6 py-3.5">Action</th>
                  <th className="px-6 py-3.5">Target</th>
                  <th className="px-6 py-3.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/40">
                      <td className="px-6 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 text-xs font-medium text-slate-200">
                        {log.actor_email}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-400">
                        {log.target_type}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-400 font-mono">
                        {JSON.stringify(log.metadata)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Invite Team Member</h3>
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSendInvite} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="analyst@company.com"
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="ANALYST">Analyst (Research, scenarios, exports)</option>
                  <option value="ADMIN">Administrator (Manage members & settings)</option>
                  <option value="VIEWER">Viewer (Read-only intelligence)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Ownership Modal */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Transfer Organization Ownership</h3>
              <button
                type="button"
                onClick={() => setTransferModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <p className="text-xs text-amber-300/90 bg-amber-950/30 border border-amber-500/30 rounded-xl p-3">
                Warning: Transferring ownership will make the selected member the primary Owner of this workspace.
                Your role will be demoted to Administrator.
              </p>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Select New Owner
                </label>
                <select
                  value={newOwnerId}
                  onChange={(e) => setNewOwnerId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">Choose a member...</option>
                  {members
                    .filter((m) => m.role !== "OWNER")
                    .map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.full_name} ({m.email})
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleTransferOwnership}
                  disabled={!newOwnerId}
                  className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
                >
                  Confirm Transfer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
