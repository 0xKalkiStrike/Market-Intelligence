"use client";

import { useEffect, useState } from "react";
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Zap,
  FileText,
  Download,
  Loader2,
  ArrowRight,
  TrendingUp,
  Cpu,
  Layers,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";

interface PlanLimit {
  max_users: number;
  max_competitors: number;
  max_geographic_markets: number;
  max_ai_tokens_monthly: number;
  max_exports_monthly: number;
  max_scenarios_monthly: number;
  data_refresh_frequency: string;
}

interface PlanTier {
  tier: string;
  name: string;
  description: string;
  monthly_price_usd: number;
  annual_price_usd: number;
  limits: PlanLimit;
  features: string[];
}

interface EntitlementData {
  organization_id: string;
  organization_name: string;
  plan_tier: string;
  subscription_status: string;
  billing_cycle: string;
  current_period_end?: string;
  limits: PlanLimit;
  features: string[];
  current_active_users: number;
  current_month_usage: Record<string, number>;
}

interface UsageMetric {
  metric_id: string;
  label: string;
  used: number;
  limit: number | null;
  percentage_used: number;
  status: string;
}

interface UsageSummary {
  period_key: string;
  plan_tier: string;
  overall_status: string;
  metrics: UsageMetric[];
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount_due_usd: number;
  amount_paid_usd: number;
  status: string;
  period_start: string;
  period_end: string;
  pdf_url?: string;
  created_at: string;
}

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [plans, setPlans] = useState<PlanTier[]>([]);
  const [currentSub, setCurrentSub] = useState<EntitlementData | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function loadBillingData() {
    try {
      setLoading(true);
      setError(null);
      const [plansRes, currentRes, usageRes, invoicesRes] = await Promise.all([
        api.get<PlanTier[]>("/api/subscriptions/plans"),
        api.get<EntitlementData>("/api/subscriptions/current"),
        api.get<UsageSummary>("/api/usage/summary"),
        api.get<Invoice[]>("/api/billing/invoices").catch(() => []),
      ]);

      setPlans(plansRes);
      setCurrentSub(currentRes);
      setUsage(usageRes);
      setInvoices(invoicesRes);
      if (currentRes.billing_cycle === "ANNUAL") {
        setBillingCycle("ANNUAL");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load subscription & billing details");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBillingData();
  }, []);

  const handleSimulateSandboxPayment = async (targetTier: string) => {
    try {
      setSubmitting(true);
      setError(null);
      const res = await api.post<{
        status: string;
        invoice_number: string;
        plan_tier: string;
        amount_paid_usd: number;
      }>("/api/billing/sandbox/pay", {
        plan_tier: targetTier,
        billing_cycle: billingCycle,
      });

      setSuccessMsg(
        `Sandbox payment confirmed! Upgraded to ${res.plan_tier} (${res.invoice_number})`
      );
      await loadBillingData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Payment simulation failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header & Active Subscription Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl sm:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-0.5 text-xs font-semibold text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" /> Commercial Subscription Management
            </div>
            <h1 className="mt-2 text-2xl font-bold text-white">Plans, Entitlements & Metering</h1>
            <p className="mt-1 text-sm text-slate-400">
              Review current resource quotas, active feature flags, and historical billing statements.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setBillingCycle("MONTHLY")}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                billingCycle === "MONTHLY"
                  ? "bg-emerald-500 text-slate-950 shadow-md font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("ANNUAL")}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                billingCycle === "ANNUAL"
                  ? "bg-emerald-500 text-slate-950 shadow-md font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Annual Billing (Save ~17%)
            </button>
          </div>
        </div>

        {/* Current Subscription Banner */}
        <div className="mt-6 grid grid-cols-1 gap-4 rounded-xl border border-slate-800/80 bg-slate-950/50 p-5 sm:grid-cols-4">
          <div>
            <div className="text-xs text-slate-500">Current Plan Tier</div>
            <div className="mt-1 text-lg font-bold text-white">{currentSub?.plan_tier}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Subscription Status</div>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  currentSub?.subscription_status === "ACTIVE"
                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    : "bg-amber-500"
                }`}
              />
              <span className="font-semibold text-white">{currentSub?.subscription_status}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Billing Cadence</div>
            <div className="mt-1 font-semibold text-white">{currentSub?.billing_cycle}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Next Renewal Date</div>
            <div className="mt-1 font-semibold text-slate-300">
              {currentSub?.current_period_end
                ? new Date(currentSub.current_period_end).toLocaleDateString()
                : "Active Perpetual"}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-sm text-rose-300">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-sm text-emerald-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Usage Metering & Quotas Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl sm:p-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Monthly Usage Quotas ({usage?.period_key})</h2>
            <p className="text-xs text-slate-400">
              Server-side enforced consumption limits. Operations exceeding plan limits are gracefully restricted.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              usage?.overall_status === "HEALTHY"
                ? "border border-emerald-500/30 bg-emerald-950/40 text-emerald-400"
                : "border border-amber-500/30 bg-amber-950/40 text-amber-400"
            }`}
          >
            System Status: {usage?.overall_status}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {usage?.metrics.map((m) => {
            const isExceeded = m.status === "EXCEEDED";
            const isCritical = m.status === "CRITICAL";
            const isWarning = m.status === "WARNING";

            return (
              <div
                key={m.metric_id}
                className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-white text-sm">{m.label}</div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      isExceeded
                        ? "bg-rose-950 text-rose-400 border border-rose-500/30"
                        : isCritical
                        ? "bg-amber-950 text-amber-400 border border-amber-500/30"
                        : isWarning
                        ? "bg-amber-950/60 text-amber-300"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {m.status}
                  </span>
                </div>

                <div className="mt-3 flex items-baseline justify-between text-xs">
                  <span className="font-mono text-slate-300 font-bold">
                    {m.used.toLocaleString()} {m.limit ? `/ ${m.limit.toLocaleString()}` : ""}
                  </span>
                  <span className="text-slate-400 font-semibold">{m.percentage_used}%</span>
                </div>

                <div className="relative mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isExceeded
                        ? "bg-rose-500"
                        : isCritical || isWarning
                        ? "bg-amber-500"
                        : "bg-gradient-to-r from-emerald-500 to-teal-400"
                    }`}
                    style={{ width: `${Math.min(m.percentage_used, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Plan Tier Comparison Cards */}
      <div>
        <div className="mb-4 text-center">
          <h2 className="text-xl font-bold text-white">Commercial Tier Entitlements</h2>
          <p className="mt-1 text-xs text-slate-400">
            Select the plan that matches your strategic expansion needs.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {plans.map((p) => {
            const isCurrent = currentSub?.plan_tier === p.tier;
            const price = billingCycle === "ANNUAL" ? p.annual_price_usd : p.monthly_price_usd;

            return (
              <div
                key={p.tier}
                className={`flex flex-col justify-between rounded-2xl border p-6 backdrop-blur-xl transition-all ${
                  isCurrent
                    ? "border-emerald-500 bg-emerald-950/20 shadow-[0_0_25px_rgba(16,185,129,0.15)]"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">{p.name}</h3>
                    {isCurrent && (
                      <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
                        Current Tier
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-slate-400 min-h-[36px]">{p.description}</p>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-white">
                      ${price.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400">
                      /{billingCycle === "ANNUAL" ? "year" : "month"}
                    </span>
                  </div>

                  {/* Limits Breakdown */}
                  <div className="mt-6 space-y-2.5 border-t border-slate-800/80 pt-4 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Team Seats:</span>
                      <span className="font-semibold text-white">{p.limits.max_users} users</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Monitored Competitors:</span>
                      <span className="font-semibold text-white">{p.limits.max_competitors}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">State Jurisdictions:</span>
                      <span className="font-semibold text-white">
                        {p.limits.max_geographic_markets} states
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Monthly AI Tokens:</span>
                      <span className="font-semibold text-white">
                        {p.limits.max_ai_tokens_monthly.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Data Refresh Cadence:</span>
                      <span className="font-semibold text-emerald-400">
                        {p.limits.data_refresh_frequency}
                      </span>
                    </div>
                  </div>

                  {/* Feature Flags */}
                  <div className="mt-4 border-t border-slate-800/80 pt-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Included Capabilities
                    </div>
                    <ul className="mt-2 space-y-1.5 text-xs text-slate-300">
                      {p.features.map((feat) => (
                        <li key={feat} className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-6 pt-4">
                  {isCurrent ? (
                    <button
                      type="button"
                      disabled
                      className="w-full rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-2.5 text-xs font-bold text-emerald-400 opacity-80"
                    >
                      Active Plan
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleSimulateSandboxPayment(p.tier)}
                      className="w-full rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-slate-950 transition-all hover:bg-emerald-400 disabled:opacity-50"
                    >
                      {submitting ? "Processing..." : `Upgrade to ${p.name}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoice Ledger Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-xl">
        <div className="border-b border-slate-800 px-6 py-4">
          <h2 className="text-base font-semibold text-white">Billing History & Invoices</h2>
          <p className="text-xs text-slate-400">
            Download receipts and audit records for accounting compliance.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/50 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-3.5">Invoice #</th>
                <th className="px-6 py-3.5">Billing Period</th>
                <th className="px-6 py-3.5">Amount Paid</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                    No invoices generated yet.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-900/40">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-white">
                      {inv.invoice_number}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(inv.period_start).toLocaleDateString()} -{" "}
                      {new Date(inv.period_end).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-emerald-400">
                      ${inv.amount_paid_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
                        <FileText className="h-3.5 w-3.5 text-slate-500" /> PDF Receipt
                      </span>
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
