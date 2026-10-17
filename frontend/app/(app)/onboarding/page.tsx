"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Globe,
  Swords,
  Users,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Shield,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";

const PRESET_MARKETS = [
  { code: "FL", label: "Florida (Medical)" },
  { code: "OK", label: "Oklahoma (Medical)" },
  { code: "OH", label: "Ohio (Adult-Use / Med)" },
  { code: "PA", label: "Pennsylvania (Medical)" },
  { code: "MI", label: "Michigan (Adult-Use)" },
  { code: "CA", label: "California (Adult-Use)" },
  { code: "CO", label: "Colorado (Adult-Use)" },
  { code: "MA", label: "Massachusetts (Adult-Use)" },
];

const PRESET_COMPETITORS = [
  "Trulieve",
  "Curaleaf",
  "Surterra Wellness",
  "Verano",
  "Ayr Wellness",
  "Green Thumb Industries (GTI)",
  "Fluent Cannabis",
  "MÜV (Verano)",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [orgName, setOrgName] = useState("");
  const [domain, setDomain] = useState("");
  const [notificationEmail, setNotificationEmail] = useState("");
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>(["FL"]);
  const [competitors, setCompetitors] = useState<string[]>(["Trulieve", "Curaleaf"]);
  const [newCompetitor, setNewCompetitor] = useState("");
  const [invitations, setInvitations] = useState<{ email: string; role: string }[]>([
    { email: "", role: "ANALYST" },
  ]);
  const [seedSample, setSeedSample] = useState(true);

  // Load existing onboarding draft/status
  useEffect(() => {
    async function fetchStatus() {
      try {
        setLoading(true);
        const data = await api.get<{
          onboarding_step: number;
          onboarding_status: string;
          is_completed: boolean;
          profile: { name: string; domain?: string; notification_email?: string };
          geographic_markets: string[];
          monitored_competitors: string[];
        }>("/api/onboarding/status");

        if (data.profile?.name) setOrgName(data.profile.name);
        if (data.profile?.domain) setDomain(data.profile.domain || "");
        if (data.profile?.notification_email) setNotificationEmail(data.profile.notification_email || "");
        if (data.geographic_markets?.length) setSelectedMarkets(data.geographic_markets);
        if (data.monitored_competitors?.length) setCompetitors(data.monitored_competitors);

        // Resume at saved step
        if (data.onboarding_step && data.onboarding_step <= 5) {
          setStep(data.onboarding_step);
        }
      } catch (err: unknown) {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
        } else {
          setError(err instanceof Error ? err.message : "Failed to load onboarding status");
        }
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, [router]);

  // Step 1: Profile
  const handleSaveProfile = async () => {
    if (!orgName.trim()) {
      setError("Organization name is required.");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await api.post("/api/onboarding/step/profile", {
        name: orgName.trim(),
        domain: domain.trim() || undefined,
        notification_email: notificationEmail.trim() || undefined,
      });
      setStep(2);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // Step 2: Geo Scope
  const handleSaveGeoScope = async () => {
    if (selectedMarkets.length === 0) {
      setError("Please select at least one geographic market.");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await api.post("/api/onboarding/step/geo-scope", {
        geographic_markets: selectedMarkets,
      });
      setStep(3);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save geographic scope");
    } finally {
      setSaving(false);
    }
  };

  // Step 3: Competitors
  const handleSaveCompetitors = async () => {
    try {
      setSaving(true);
      setError(null);
      await api.post("/api/onboarding/step/competitors", {
        competitors,
      });
      setStep(4);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save competitor watchlist");
    } finally {
      setSaving(false);
    }
  };

  // Step 4: Team Invites
  const handleSaveInvites = async () => {
    try {
      setSaving(true);
      setError(null);
      const validInvites = invitations.filter((i) => i.email.trim());
      await api.post("/api/onboarding/step/team-invitations", {
        invitations: validInvites,
      });
      setStep(5);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to dispatch invitations");
    } finally {
      setSaving(false);
    }
  };

  // Step 5: Finalize
  const handleComplete = async () => {
    try {
      setSaving(true);
      setError(null);
      await api.post("/api/onboarding/complete", {
        seed_sample_workspace: seedSample,
      });
      setSuccessMsg("Onboarding complete! Loading your customized market workspace...");
      setTimeout(() => {
        router.push("/organization");
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to complete onboarding");
      setSaving(false);
    }
  };

  const toggleMarket = (code: string) => {
    setSelectedMarkets((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const addCompetitor = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !competitors.includes(trimmed)) {
      setCompetitors((prev) => [...prev, trimmed]);
      setNewCompetitor("");
    }
  };

  const removeCompetitor = (name: string) => {
    setCompetitors((prev) => prev.filter((c) => c !== name));
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-400" />
          <p className="mt-3 text-sm text-slate-400">Loading your onboarding workflow...</p>
        </div>
      </div>
    );
  }

  const stepLabels = [
    { num: 1, title: "Profile", icon: Building2 },
    { num: 2, title: "Markets", icon: Globe },
    { num: 3, title: "Competitors", icon: Swords },
    { num: 4, title: "Team", icon: Users },
    { num: 5, title: "Launch", icon: CheckCircle2 },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3.5 py-1 text-xs font-medium text-emerald-400 backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5" /> Commercial Customer Onboarding
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
          Configure Your Market Intelligence Workspace
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Establish tenant data boundaries, permitted state jurisdictions, and competitor tracking filters.
        </p>
      </div>

      {/* Progress Bar & Steps Tabs */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {stepLabels.map((s) => {
            const Icon = s.icon;
            const isDone = s.num < step;
            const isCurrent = s.num === step;
            return (
              <div key={s.num} className="flex flex-1 flex-col items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all ${
                    isCurrent
                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                      : isDone
                      ? "border-emerald-600 bg-emerald-600 text-slate-950"
                      : "border-slate-800 bg-slate-900/60 text-slate-500"
                  }`}
                >
                  {isDone ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <span
                  className={`mt-2 text-xs font-medium ${
                    isCurrent ? "text-emerald-400" : isDone ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>
        <div className="relative mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
            style={{ width: `${((step - 1) / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-sm text-rose-300 backdrop-blur-md">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success alert */}
      {successMsg && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-sm text-emerald-300 backdrop-blur-md">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Wizard Step Cards */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        {/* STEP 1: Profile */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Organization Profile</h2>
              <p className="mt-1 text-sm text-slate-400">
                Identify your enterprise workspace and primary communications channel.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Organization Legal Name *
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g., Curaleaf Holdings, Florida Wellness Corp"
                  className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Business Domain (Optional)
                </label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="e.g., acme-cannabis.com"
                  className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Market Alert Notification Email
                </label>
                <input
                  type="email"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  placeholder="e.g., market-intel@acme-cannabis.com"
                  className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-all hover:bg-emerald-400 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Next: Geographic Markets"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Geographic Markets */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Target Geographic Markets</h2>
              <p className="mt-1 text-sm text-slate-400">
                Select the permitted regulatory jurisdictions monitored for dispensary densities and price movements.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PRESET_MARKETS.map((m) => {
                const isSelected = selectedMarkets.includes(m.code);
                return (
                  <button
                    key={m.code}
                    type="button"
                    onClick={() => toggleMarket(m.code)}
                    className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                      isSelected
                        ? "border-emerald-500/80 bg-emerald-950/30 text-white"
                        : "border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-white">{m.label}</div>
                      <div className="text-xs text-slate-500">State Code: {m.code}</div>
                    </div>
                    <div
                      className={`h-5 w-5 rounded-md border flex items-center justify-center ${
                        isSelected ? "border-emerald-500 bg-emerald-500 text-slate-950" : "border-slate-700"
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-900"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                type="button"
                onClick={handleSaveGeoScope}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-all hover:bg-emerald-400 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Next: Competitor Watchlist"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Competitor Watchlist */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Competitor Watchlist</h2>
              <p className="mt-1 text-sm text-slate-400">
                Choose operators whose public retail offerings, SKU price shifts, and location expansions you want to monitor.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Recommended Operators
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {PRESET_COMPETITORS.map((comp) => {
                  const added = competitors.includes(comp);
                  return (
                    <button
                      key={comp}
                      type="button"
                      disabled={added}
                      onClick={() => addCompetitor(comp)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                        added
                          ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-400 opacity-60"
                          : "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700 hover:text-white"
                      }`}
                    >
                      <Plus className="h-3 w-3" /> {comp}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Add Custom Competitor
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  type="text"
                  value={newCompetitor}
                  onChange={(e) => setNewCompetitor(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCompetitor(newCompetitor);
                    }
                  }}
                  placeholder="Enter custom operator name..."
                  className="flex-1 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => addCompetitor(newCompetitor)}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Add
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Monitored Competitors ({competitors.length})
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {competitors.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-3.5 py-1.5 text-sm font-medium text-emerald-300"
                  >
                    {c}
                    <button
                      type="button"
                      onClick={() => removeCompetitor(c)}
                      className="text-emerald-400 hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-900"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                type="button"
                onClick={handleSaveCompetitors}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-all hover:bg-emerald-400 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Next: Team Invitations"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Team Invites */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Invite Team Members</h2>
              <p className="mt-1 text-sm text-slate-400">
                Grant secure, role-based access to market researchers, strategic analysts, and executives.
              </p>
            </div>

            <div className="space-y-3">
              {invitations.map((inv, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input
                    type="email"
                    value={inv.email}
                    onChange={(e) => {
                      const updated = [...invitations];
                      updated[idx].email = e.target.value;
                      setInvitations(updated);
                    }}
                    placeholder="teammate@company.com"
                    className="flex-1 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                  />
                  <select
                    value={inv.role}
                    onChange={(e) => {
                      const updated = [...invitations];
                      updated[idx].role = e.target.value;
                      setInvitations(updated);
                    }}
                    className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-300 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="ANALYST">Analyst</option>
                    <option value="ADMIN">Administrator</option>
                    <option value="VIEWER">Read-Only Viewer</option>
                  </select>
                  {invitations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setInvitations(invitations.filter((_, i) => i !== idx))}
                      className="p-2 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={() => setInvitations([...invitations, { email: "", role: "ANALYST" }])}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
              >
                <Plus className="h-3.5 w-3.5" /> Add Another Team Member
              </button>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-900"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                type="button"
                onClick={handleSaveInvites}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-all hover:bg-emerald-400 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Next: Review & Launch"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Review & Launch */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Workspace Readiness Review</h2>
              <p className="mt-1 text-sm text-slate-400">
                Confirm your tenant configurations. Your logically isolated workspace is ready for immediate operation.
              </p>
            </div>

            <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/60 p-5">
              <div className="flex justify-between border-b border-slate-800/80 pb-3 text-sm">
                <span className="text-slate-400">Organization Name:</span>
                <span className="font-semibold text-white">{orgName || "MMJ-DOCS Workspace"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-3 text-sm">
                <span className="text-slate-400">Business Domain:</span>
                <span className="text-slate-200">{domain || "Configured"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-3 text-sm">
                <span className="text-slate-400">Active Markets:</span>
                <span className="font-semibold text-emerald-400">{selectedMarkets.join(", ")}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-3 text-sm">
                <span className="text-slate-400">Competitors Tracked:</span>
                <span className="text-slate-200">{competitors.length} operators</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Data Boundary:</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                  <Shield className="h-4 w-4" /> Zero-PHI Verified Surface-Web Intelligence
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={seedSample}
                  onChange={(e) => setSeedSample(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
                />
                <div>
                  <div className="text-sm font-semibold text-white">
                    Seed Sample Research Project (Recommended)
                  </div>
                  <div className="text-xs text-slate-400">
                    Creates a clearly labeled sample workspace (&quot;[Sample] Florida Medical Market Expansion&quot;)
                    to explore dispensary density, doctor coverage, and competitive pricing analysis.
                  </div>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-900"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                type="button"
                onClick={handleComplete}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Finalizing Workspace..." : "Activate Workspace"}
                <CheckCircle2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
