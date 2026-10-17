"use client";

import React, { useEffect, useState } from "react";
import { apiFetch, apiUpload } from "@/lib/api";
import { ToastContainer, ToastMessage } from "@/components/ui/Toast";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Code2,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileCode,
  FileSpreadsheet,
  FileText,
  Filter,
  Globe,
  Handshake,
  Layers,
  Link2,
  Lock,
  MessageSquare,
  Play,
  Plus,
  RefreshCw,
  RotateCw,
  Scale,
  Send,
  Server,
  Share2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Swords,
  Tag,
  Trash2,
  Upload,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";

interface Connector {
  name: string;
  provider: string;
  connection_status: string;
  business_purpose: string;
  sync_frequency?: string;
  last_sync_checkpoint?: string;
  supported_entities?: string;
  is_enabled: boolean;
}

interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  rate_limit_per_minute: number;
  requests_count: number;
  is_active: boolean;
}

interface GeneratedKeyResult {
  full_api_key: string;
}

interface Webhook {
  id: string;
  name: string;
  target_url: string;
  event_types: string[];
}

interface WebhookDelivery {
  id: string;
  event_type: string;
  event_payload_id: string;
  status_code: number | null;
  execution_duration_ms: number;
  delivered_at: string;
}

interface ImportRecord {
  id: string;
  filename: string;
  added_records: number;
  updated_records: number;
  duplicate_records: number;
  status: string;
}

interface ImportPreview {
  total_rows_detected: number;
  headers?: string[];
}

interface ExportResult {
  total_records: number;
  content: string;
  format: string;
}

interface EntityLink {
  id: string;
}

interface DataConflict {
  id: string;
  field_name: string;
  entity_id: string;
  resolution_status: string;
  source_a_name: string;
  source_a_value: string;
  source_b_name: string;
  source_b_value: string;
}

interface ResolveResult {
  review_status: string;
  match_confidence: number;
  canonical_entity_id: string | null;
  reasons?: string[];
}

interface Finding {
  id: string;
  title: string;
  category: string;
  created_by: string;
  created_at: string;
  importance: string;
  content: string;
  notes_count?: number;
  review_status: string;
}

interface FindingNote {
  id: string;
  note_text: string;
  author_name: string;
}

interface InvestigationCase {
  id: string;
  title: string;
  status: string;
  description: string;
  case_category: string;
  assigned_lead?: string;
}

interface SharedWatchlist {
  id: string;
  name: string;
  sharing_scope: string;
  team_name?: string;
  items_count: number;
}

interface RegisteredModule {
  name: string;
  version: string;
  health_status: string;
  purpose: string;
  api_routes?: string[];
}

interface ReportDistribution {
  id: string;
  report_type: string;
  channel: string;
  recipient_target: string;
  schedule_cron: string;
  delivery_status?: string;
}

export default function IntegrationsCenterPage() {
  const [activeTab, setActiveTab] = useState<
    "registry" | "api_keys" | "webhooks" | "import_export" | "entity_resolution" | "collaboration" | "modules"
  >("registry");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // 1. Integration Registry & Health Data
  const [connectors, setConnectors] = useState<Connector[]>([]);

  // 2. API Keys Data
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(["intelligence:read"]);
  const [newKeyRateLimit, setNewKeyRateLimit] = useState(60);
  const [generatedKeyResult, setGeneratedKeyResult] = useState<GeneratedKeyResult | null>(null);

  // 3. Webhooks Data
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [newWhName, setNewWhName] = useState("");
  const [newWhUrl, setNewWhUrl] = useState("");
  const [newWhEvents, setNewWhEvents] = useState<string[]>(["competitor.price_changed", "market.opportunity_detected"]);

  // 4. Import / Export Data
  const [importHistory, setImportHistory] = useState<ImportRecord[]>([]);
  const [exportJobs, setExportJobs] = useState<unknown[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importEntityType, setImportEntityType] = useState("DISPENSARY");
  const [importing, setImporting] = useState(false);
  const [exportFormat, setExportFormat] = useState("CSV");
  const [exportEntityType, setExportEntityType] = useState("ALL");
  const [exportStateFilter, setExportStateFilter] = useState("ALL");
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);

  // 5. Entity Resolution & Conflicts
  const [pendingLinks, setPendingLinks] = useState<EntityLink[]>([]);
  const [conflicts, setConflicts] = useState<DataConflict[]>([]);
  const [testSysName, setTestSysName] = useState("STATE_DOH");
  const [testExtId, setTestExtId] = useState("DOH-TEST-001");
  const [testEntityName, setTestEntityName] = useState("Trulieve Dispensary Florida");
  const [testState, setTestState] = useState("FL");
  const [testLicense, setTestLicense] = useState("MMTC-2026-999");
  const [resolveResult, setResolveResult] = useState<ResolveResult | null>(null);
  const [resolving, setResolving] = useState(false);

  // 6. Collaboration & Cases
  const [findings, setFindings] = useState<Finding[]>([]);
  const [cases, setCases] = useState<InvestigationCase[]>([]);
  const [sharedWatchlists, setSharedWatchlists] = useState<SharedWatchlist[]>([]);
  const [newFindingTitle, setNewFindingTitle] = useState("");
  const [newFindingContent, setNewFindingContent] = useState("");
  const [newFindingCategory, setNewFindingCategory] = useState("COMPETITOR");
  const [newFindingImportance, setNewFindingImportance] = useState("HIGH");
  const [newNoteText, setNewNoteText] = useState("");
  const [activeFindingId, setActiveFindingId] = useState<string | null>(null);
  const [findingNotes, setFindingNotes] = useState<FindingNote[]>([]);

  // 7. Module Registry & Report Distributions
  const [modules, setModules] = useState<RegisteredModule[]>([]);
  const [distributions, setDistributions] = useState<ReportDistribution[]>([]);

  const addToast = (type: "success" | "error" | "info" | "warning", message: string) => {
    setToasts((prev) => [
      ...prev,
      { id: Math.random().toString(), type, title: type.toUpperCase(), message },
    ]);
  };

  const loadData = async () => {
    try {
      setRefreshing(true);
      const [
        connRes,
        keysRes,
        whRes,
        delivRes,
        importsRes,
        exportsRes,
        linksRes,
        conflictsRes,
        findingsRes,
        casesRes,
        watchlistsRes,
        modsRes,
        distsRes,
      ] = await Promise.allSettled([
        apiFetch<Connector[]>("/api/v1/governed/integrations"),
        apiFetch<ApiKeyItem[]>("/api/v1/governed/api-keys"),
        apiFetch<Webhook[]>("/api/v1/governed/webhooks"),
        apiFetch<WebhookDelivery[]>("/api/v1/governed/webhooks/deliveries?limit=20"),
        apiFetch<ImportRecord[]>("/api/v1/governed/imports"),
        apiFetch<unknown[]>("/api/v1/governed/exports/jobs"),
        apiFetch<EntityLink[]>("/api/v1/governed/entity-resolution/pending"),
        apiFetch<DataConflict[]>("/api/v1/governed/conflicts"),
        apiFetch<Finding[]>("/api/v1/governed/collaboration/findings"),
        apiFetch<InvestigationCase[]>("/api/v1/governed/cases"),
        apiFetch<SharedWatchlist[]>("/api/v1/governed/collaboration/shared-watchlists"),
        apiFetch<RegisteredModule[]>("/api/v1/governed/modules"),
        apiFetch<ReportDistribution[]>("/api/v1/governed/report-distributions"),
      ]);

      if (connRes.status === "fulfilled") setConnectors(connRes.value || []);
      if (keysRes.status === "fulfilled") setApiKeys(keysRes.value || []);
      if (whRes.status === "fulfilled") setWebhooks(whRes.value || []);
      if (delivRes.status === "fulfilled") setDeliveries(delivRes.value || []);
      if (importsRes.status === "fulfilled") setImportHistory(importsRes.value || []);
      if (exportsRes.status === "fulfilled") setExportJobs(exportsRes.value || []);
      if (linksRes.status === "fulfilled") setPendingLinks(linksRes.value || []);
      if (conflictsRes.status === "fulfilled") setConflicts(conflictsRes.value || []);
      if (findingsRes.status === "fulfilled") setFindings(findingsRes.value || []);
      if (casesRes.status === "fulfilled") setCases(casesRes.value || []);
      if (watchlistsRes.status === "fulfilled") setSharedWatchlists(watchlistsRes.value || []);
      if (modsRes.status === "fulfilled") setModules(modsRes.value || []);
      if (distsRes.status === "fulfilled") setDistributions(distsRes.value || []);
    } catch (err) {
      addToast("error", `Failed to load integrations data: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Action Handlers
  const handleProbeConnector = async (name: string) => {
    try {
      const res = await apiFetch<{ connection_status: string; message?: string }>(`/api/v1/governed/integrations/${name}/probe`, { method: "POST" });
      addToast("success", `Probe for ${name}: ${res.connection_status} (${res.message || "OK"})`);
      loadData();
    } catch (err) {
      addToast("error", `Probe failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleToggleConnector = async (name: string, enabled: boolean) => {
    try {
      await apiFetch<unknown>(`/api/v1/governed/integrations/${name}/toggle?enable=${enabled}`, { method: "POST" });
      addToast("info", `${name} set to ${enabled ? "ENABLED" : "DISABLED"}`);
      loadData();
    } catch (err) {
      addToast("error", `Toggle failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) {
      addToast("warning", "Please provide an API key name.");
      return;
    }
    try {
      const res = await apiFetch<GeneratedKeyResult>("/api/v1/governed/api-keys", {
        method: "POST",
        body: JSON.stringify({
          name: newKeyName,
          scopes: newKeyScopes,
          rate_limit_per_minute: newKeyRateLimit,
        }),
      });
      setGeneratedKeyResult(res);
      setNewKeyName("");
      addToast("success", "API key generated successfully.");
      loadData();
    } catch (err) {
      addToast("error", `API Key creation failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleRevokeApiKey = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this API key? This action is irreversible.")) return;
    try {
      await apiFetch<unknown>(`/api/v1/governed/api-keys/${id}`, { method: "DELETE" });
      addToast("info", "API key revoked.");
      loadData();
    } catch (err) {
      addToast("error", `Revocation failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleCreateWebhook = async () => {
    if (!newWhName.trim() || !newWhUrl.trim()) {
      addToast("warning", "Webhook name and destination URL are required.");
      return;
    }
    try {
      const res = await apiFetch<{ secret_key: string }>("/api/v1/governed/webhooks", {
        method: "POST",
        body: JSON.stringify({
          name: newWhName,
          target_url: newWhUrl,
          event_types: newWhEvents,
        }),
      });
      addToast("success", `Webhook created! Secret: ${res.secret_key.substring(0, 10)}...`);
      setNewWhName("");
      setNewWhUrl("");
      loadData();
    } catch (err) {
      addToast("error", `Webhook creation rejected: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleRotateWebhookSecret = async (id: string) => {
    try {
      const res = await apiFetch<{ secret_key: string }>(`/api/v1/governed/webhooks/${id}/rotate-secret`, { method: "POST" });
      addToast("success", `Secret rotated. New secret: ${res.secret_key.substring(0, 10)}...`);
      loadData();
    } catch (err) {
      addToast("error", `Rotation failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleReplayWebhook = async (id: string) => {
    try {
      await apiFetch<unknown>(`/api/v1/governed/webhooks/deliveries/${id}/replay`, { method: "POST" });
      addToast("info", "Webhook delivery replayed.");
      loadData();
    } catch (err) {
      addToast("error", `Replay failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handlePreviewImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await apiUpload<ImportPreview>("/api/v1/governed/imports/preview", formData);
      setImportPreview(res);
      addToast("info", `File scanned: ${res.total_rows_detected} rows detected.`);
    } catch (err) {
      addToast("error", `File preview failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleExecuteImport = async () => {
    if (!importFile) return;
    setImporting(true);
    const formData = new FormData();
    formData.append("file", importFile);
    formData.append("entity_type", importEntityType);
    formData.append(
      "column_mapping_json",
      JSON.stringify({ name: "name", state: "state", city: "city", phone: "phone", website: "website" })
    );

    try {
      const res = await apiUpload<{ added_records: number; updated_records: number; duplicate_records: number }>("/api/v1/governed/imports/execute", formData);
      addToast(
        "success",
        `Import completed: ${res.added_records} added, ${res.updated_records} updated, ${res.duplicate_records} duplicates.`
      );
      setImportFile(null);
      setImportPreview(null);
      loadData();
    } catch (err) {
      addToast("error", `Import execution failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setImporting(false);
    }
  };

  const handleGenerateExport = async () => {
    try {
      const queryParams = new URLSearchParams({
        export_name: `Governed Export (${exportEntityType})`,
        format_type: exportFormat,
        entity_type: exportEntityType,
      });
      if (exportStateFilter !== "ALL") queryParams.append("state_filter", exportStateFilter);

      const res = await apiFetch<ExportResult>(`/api/v1/governed/exports/generate?${queryParams.toString()}`, {
        method: "POST",
      });
      setExportResult(res);
      addToast("success", `Export generated: ${res.total_records} records processed.`);
      loadData();
    } catch (err) {
      addToast("error", `Export failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleTestResolve = async () => {
    setResolving(true);
    try {
      const res = await apiFetch<ResolveResult>("/api/v1/governed/entity-resolution/resolve", {
        method: "POST",
        body: JSON.stringify({
          system_name: testSysName,
          external_id: testExtId,
          name: testEntityName,
          state: testState,
          license_number: testLicense,
        }),
      });
      setResolveResult(res);
      addToast("info", `Resolution score: ${(res.match_confidence * 100).toFixed(1)}% (${res.review_status})`);
      loadData();
    } catch (err) {
      addToast("error", `Entity resolution test failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setResolving(false);
    }
  };

  const handleResolveConflict = async (conflictId: string, chosenValue: string) => {
    const reason = prompt("Enter justification for manual conflict override (e.g. Verified via direct phone confirmation):");
    if (!reason) return;
    try {
      await apiFetch<unknown>(`/api/v1/governed/conflicts/${conflictId}/resolve-manually`, {
        method: "POST",
        body: JSON.stringify({
          chosen_value: chosenValue,
          justification: reason,
        }),
      });
      addToast("success", "Conflict resolved and manual audit entry logged.");
      loadData();
    } catch (err) {
      addToast("error", `Conflict resolution failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleCreateFinding = async () => {
    if (!newFindingTitle.trim() || !newFindingContent.trim()) {
      addToast("warning", "Title and analysis content are required.");
      return;
    }
    try {
      await apiFetch<unknown>("/api/v1/governed/collaboration/findings", {
        method: "POST",
        body: JSON.stringify({
          title: newFindingTitle,
          content: newFindingContent,
          category: newFindingCategory,
          importance: newFindingImportance,
        }),
      });
      addToast("success", "Intelligence finding published to workspace.");
      setNewFindingTitle("");
      setNewFindingContent("");
      loadData();
    } catch (err) {
      addToast("error", `Failed to publish finding: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleViewNotes = async (findingId: string) => {
    setActiveFindingId(findingId);
    try {
      const res = await apiFetch<FindingNote[]>(`/api/v1/governed/collaboration/findings/${findingId}/notes`);
      setFindingNotes(res || []);
    } catch (err) {
      addToast("error", `Could not fetch notes: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleAddNote = async () => {
    if (!activeFindingId || !newNoteText.trim()) return;
    try {
      await apiFetch<unknown>(`/api/v1/governed/collaboration/findings/${activeFindingId}/notes`, {
        method: "POST",
        body: JSON.stringify({
          note_text: newNoteText,
          is_internal_only: true,
        }),
      });
      setNewNoteText("");
      handleViewNotes(activeFindingId);
      addToast("success", "Private note added.");
    } catch (err) {
      addToast("error", `Failed to add note: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Metrics summary
  const healthyConnectors = connectors.filter((c) => c.connection_status === "HEALTHY").length;
  const activeKeysCount = apiKeys.filter((k) => k.is_active).length;
  const openCasesCount = cases.filter((c) => c.status !== "CLOSED" && c.status !== "DECIDED").length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Phase 6 Enterprise Platform
            </span>
            <span className="text-xs text-slate-400 font-mono">Governed Integrations & Collaboration</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mt-1">
            Enterprise Integrations & Intelligence Collaboration
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Governed API surface, external connectors, event webhooks, cross-system entity matching, and team collaboration.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium transition"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Sync Platform
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Connectors</div>
            <div className="text-xl font-bold text-white mt-0.5">
              {healthyConnectors} / {connectors.length}
            </div>
            <div className="text-xs text-emerald-400 font-medium">Operational</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active API Keys</div>
            <div className="text-xl font-bold text-white mt-0.5">{activeKeysCount}</div>
            <div className="text-xs text-cyan-400 font-medium">Governed Access</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Webhooks</div>
            <div className="text-xl font-bold text-white mt-0.5">{webhooks.length}</div>
            <div className="text-xs text-indigo-400 font-medium">{deliveries.length} Dispatches</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Data Conflicts</div>
            <div className="text-xl font-bold text-white mt-0.5">{conflicts.length}</div>
            <div className="text-xs text-amber-400 font-medium">{pendingLinks.length} Pending Match</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Handshake className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Cases</div>
            <div className="text-xl font-bold text-white mt-0.5">{openCasesCount}</div>
            <div className="text-xs text-purple-400 font-medium">{findings.length} Findings</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-800 space-x-2 overflow-x-auto pb-1">
        {[
          { id: "registry", label: "Connectors Registry", icon: Server },
          { id: "api_keys", label: "Governed API Keys", icon: Lock },
          { id: "webhooks", label: "Webhooks & Events", icon: Zap },
          { id: "import_export", label: "Data Import & Export", icon: FileSpreadsheet },
          { id: "entity_resolution", label: "Entity Resolution & Conflicts", icon: Link2 },
          { id: "collaboration", label: "Workspace & Cases", icon: MessageSquare },
          { id: "modules", label: "Modules & Distribution", icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-medium text-sm whitespace-nowrap transition border-b-2 ${
                isActive
                  ? "border-emerald-500 text-emerald-400 bg-slate-900/60"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: INTEGRATION REGISTRY */}
      {activeTab === "registry" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Registered Integration Adapters</h2>
            <span className="text-xs text-slate-400 font-mono">
              Status reflects live connectivity verification, not mere configuration existence.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connectors.map((c) => (
              <div
                key={c.name}
                className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-base font-semibold text-white">{c.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{c.provider}</div>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        c.connection_status === "HEALTHY"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : c.connection_status === "DEGRADED"
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {c.connection_status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mt-3 line-clamp-2">{c.business_purpose}</p>

                  <div className="mt-4 space-y-1.5 text-xs text-slate-400">
                    <div className="flex justify-between">
                      <span>Sync Frequency:</span>
                      <span className="font-mono text-slate-200">{c.sync_frequency || "HOURLY"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Checkpoint:</span>
                      <span className="font-mono text-slate-200 truncate max-w-[150px]">
                        {c.last_sync_checkpoint || "None"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Data Entities:</span>
                      <span className="text-slate-300 font-mono truncate max-w-[150px]">
                        {c.supported_entities || "AGGREGATES"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <button
                    onClick={() => handleToggleConnector(c.name, !c.is_enabled)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                      c.is_enabled
                        ? "bg-slate-800 text-amber-400 hover:bg-slate-700"
                        : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                    }`}
                  >
                    {c.is_enabled ? "Disable" : "Enable"}
                  </button>

                  <button
                    onClick={() => handleProbeConnector(c.name)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    Verify Connection
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: GOVERNED API KEYS */}
      {activeTab === "api_keys" && (
        <div className="space-y-6">
          {/* Key Generation Modal / Display */}
          {generatedKeyResult && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-amber-400">
                <AlertTriangle className="w-5 h-5" />
                API Key Generated — Displayed Strictly Once!
              </div>
              <p className="text-xs text-amber-200/90">
                Copy this key now. For enterprise security, the unhashed secret key cannot be recovered after leaving this screen.
              </p>
              <div className="flex items-center gap-2 mt-2 bg-slate-950 p-2.5 rounded-lg border border-amber-500/40">
                <code className="text-xs font-mono text-emerald-400 select-all flex-1">
                  {generatedKeyResult.full_api_key}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedKeyResult.full_api_key);
                    addToast("info", "API key copied to clipboard.");
                  }}
                  className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
              </div>
              <button
                onClick={() => setGeneratedKeyResult(null)}
                className="text-xs text-amber-400 underline hover:text-amber-300 mt-1"
              >
                I have securely stored this key
              </button>
            </div>
          )}

          {/* Create Key Card */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-base font-semibold text-white">Issue Programmatic Service Account API Key</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-slate-400 font-medium">Service / Consumer Name</label>
                <input
                  type="text"
                  placeholder="e.g. MMJ-Docs Analytics Pipeline"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Rate Limit (req/min)</label>
                <input
                  type="number"
                  value={newKeyRateLimit}
                  onChange={(e) => setNewKeyRateLimit(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Permission Scopes</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {["intelligence:read", "internal_metrics:read", "sources:manage", "data_quality:correct"].map((s) => (
                    <label key={s} className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                      <input
                        type="checkbox"
                        checked={newKeyScopes.includes(s)}
                        onChange={(e) => {
                          if (e.target.checked) setNewKeyScopes([...newKeyScopes, s]);
                          else setNewKeyScopes(newKeyScopes.filter((x) => x !== s));
                        }}
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleCreateApiKey}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition"
              >
                <Plus className="w-4 h-4" /> Issue API Key
              </button>
            </div>
          </div>

          {/* Active Keys Table */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-base font-semibold text-white">Active Governed Service Accounts</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-mono border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Service Name</th>
                    <th className="py-2.5 px-3">Prefix</th>
                    <th className="py-2.5 px-3">Scopes</th>
                    <th className="py-2.5 px-3">Rate Limit</th>
                    <th className="py-2.5 px-3">Usage</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-xs">
                  {apiKeys.map((k) => (
                    <tr key={k.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-sans font-medium text-slate-100">{k.name}</td>
                      <td className="py-3 px-3 text-emerald-400">{k.prefix}</td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {k.scopes.map((s: string) => (
                            <span key={s} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3">{k.rate_limit_per_minute} rpm</td>
                      <td className="py-3 px-3">{k.requests_count} calls</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            k.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                          }`}
                        >
                          {k.is_active ? "ACTIVE" : "REVOKED"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-sans">
                        {k.is_active && (
                          <button
                            onClick={() => handleRevokeApiKey(k.id)}
                            className="text-xs text-rose-400 hover:text-rose-300 font-medium"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: WEBHOOKS & EVENTS */}
      {activeTab === "webhooks" && (
        <div className="space-y-6">
          {/* Create Webhook */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Register Outbound Webhook Subscriber</h3>
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> SSRF & Replay Protected
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 font-medium">Integration / Partner Name</label>
                <input
                  type="text"
                  placeholder="e.g. Partner CRM Real-time Sync"
                  value={newWhName}
                  onChange={(e) => setNewWhName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Target Destination URL (Public HTTPS Only)</label>
                <input
                  type="url"
                  placeholder="https://api.partner.com/webhooks/mmj"
                  value={newWhUrl}
                  onChange={(e) => setNewWhUrl(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium">Subscribed Event Types</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {[
                  "competitor.price_changed",
                  "competitor.location_added",
                  "regulation.changed",
                  "market.opportunity_detected",
                  "partnership.opportunity_created",
                  "forecast.completed",
                  "integration.failed",
                ].map((evt) => (
                  <label key={evt} className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                    <input
                      type="checkbox"
                      checked={newWhEvents.includes(evt)}
                      onChange={(e) => {
                        if (e.target.checked) setNewWhEvents([...newWhEvents, evt]);
                        else setNewWhEvents(newWhEvents.filter((x) => x !== evt));
                      }}
                    />
                    {evt}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleCreateWebhook}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition"
              >
                <Zap className="w-4 h-4" /> Subscribe Webhook
              </button>
            </div>
          </div>

          {/* Subscriptions List */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-base font-semibold text-white">Active Webhook Subscriptions</h3>
            <div className="space-y-3">
              {webhooks.map((w) => (
                <div key={w.id} className="p-4 rounded-lg bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">{w.name}</div>
                    <div className="text-xs text-emerald-400 font-mono mt-0.5">{w.target_url}</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {w.event_types.map((e: string) => (
                        <span key={e} className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 text-[10px] font-mono">
                          {e}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRotateWebhookSecret(w.id)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1"
                    >
                      <RotateCw className="w-3 h-3 text-indigo-400" /> Rotate Secret
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Logs */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-base font-semibold text-white">Recent Webhook Delivery Logs</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Event Type</th>
                    <th className="py-2.5 px-3">Payload ID</th>
                    <th className="py-2.5 px-3">HTTP Status</th>
                    <th className="py-2.5 px-3">Execution Time</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3 text-right">Replay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {deliveries.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 text-indigo-400">{d.event_type}</td>
                      <td className="py-2.5 px-3 truncate max-w-[120px]">{d.event_payload_id}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded font-semibold ${
                            d.status_code != null && d.status_code >= 200 && d.status_code < 300
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-rose-500/20 text-rose-400"
                          }`}
                        >
                          {d.status_code || "FAIL"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">{d.execution_duration_ms} ms</td>
                      <td className="py-2.5 px-3 text-slate-400">{new Date(d.delivered_at).toLocaleTimeString()}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleReplayWebhook(d.id)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-sans"
                        >
                          Replay
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DATA IMPORT & EXPORT CENTER */}
      {activeTab === "import_export" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Import Center */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-semibold text-white">Controlled Data Import Center</h3>
            </div>
            <p className="text-xs text-slate-400">
              Bulk import verified dispensary, doctor, and competitor datasets. Automatic pre-screening, column mapping, and duplicate detection.
            </p>

            <div className="border-2 border-dashed border-slate-800 rounded-xl p-6 text-center space-y-2 hover:border-slate-700 transition">
              <FileSpreadsheet className="w-8 h-8 text-slate-500 mx-auto" />
              <div className="text-xs text-slate-300">Select CSV or JSON file to preview & validate</div>
              <input
                type="file"
                accept=".csv,.json"
                onChange={handlePreviewImport}
                className="text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
              />
            </div>

            {importPreview && (
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">Preview Summary:</span>
                  <span className="text-emerald-400 font-mono">{importPreview.total_rows_detected} records detected</span>
                </div>
                <div className="text-xs text-slate-400">
                  Headers: <span className="text-slate-300 font-mono">{importPreview.headers?.join(", ")}</span>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <select
                    value={importEntityType}
                    onChange={(e) => setImportEntityType(e.target.value)}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200"
                  >
                    <option value="DISPENSARY">Dispensary Records</option>
                    <option value="DOCTOR">Physician Records</option>
                    <option value="COMPETITOR">Competitor Records</option>
                  </select>

                  <button
                    onClick={handleExecuteImport}
                    disabled={importing}
                    className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Play className="w-3.5 h-3.5" /> {importing ? "Importing..." : "Execute Import"}
                  </button>
                </div>
              </div>
            )}

            <div className="pt-2">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Import Audit Logs</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {importHistory.map((imp) => (
                  <div key={imp.id} className="p-2.5 rounded bg-slate-950 border border-slate-800 text-xs flex justify-between items-center">
                    <div>
                      <div className="text-slate-200 font-medium">{imp.filename}</div>
                      <div className="text-[10px] text-slate-500">
                        {imp.added_records} added • {imp.updated_records} updated • {imp.duplicate_records} duplicates
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-mono">
                      {imp.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Export Center */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-semibold text-white">Controlled Data Export Center</h3>
            </div>
            <p className="text-xs text-slate-400">
              Export governed intelligence to CSV or JSON. Redacts internal proprietary revenue and capacity fields for non-executive callers.
            </p>

            <div className="space-y-3 p-4 rounded-lg bg-slate-950 border border-slate-800">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-slate-400 font-medium">Format</label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200"
                  >
                    <option value="CSV">CSV Spreadsheet</option>
                    <option value="JSON">Structured JSON</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase text-slate-400 font-medium">Entity Type</label>
                  <select
                    value={exportEntityType}
                    onChange={(e) => setExportEntityType(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200"
                  >
                    <option value="ALL">All Entities</option>
                    <option value="DISPENSARY">Dispensaries</option>
                    <option value="DOCTOR">Physicians</option>
                    <option value="COMPETITOR">Competitors</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase text-slate-400 font-medium">State Filter</label>
                  <select
                    value={exportStateFilter}
                    onChange={(e) => setExportStateFilter(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200"
                  >
                    <option value="ALL">All States</option>
                    <option value="FL">Florida</option>
                    <option value="PA">Pennsylvania</option>
                    <option value="OH">Ohio</option>
                    <option value="TX">Texas</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleGenerateExport}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" /> Generate Export
                </button>
              </div>
            </div>

            {exportResult && (
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-2">
                <div className="text-emerald-400 font-semibold flex items-center justify-between">
                  <span>Export Ready ({exportResult.total_records} records)</span>
                  <button
                    onClick={() => {
                      const blob = new Blob([exportResult.content], { type: "text/plain" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `governed_export_${Date.now()}.${exportResult.format.toLowerCase()}`;
                      a.click();
                    }}
                    className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 font-mono hover:bg-emerald-500/30"
                  >
                    Download File
                  </button>
                </div>
                <div className="font-mono text-[11px] text-slate-400 max-h-24 overflow-y-auto bg-slate-950 p-2 rounded border border-slate-800">
                  {exportResult.content.substring(0, 300)}...
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: ENTITY RESOLUTION & CONFLICT RESOLUTION */}
      {activeTab === "entity_resolution" && (
        <div className="space-y-6">
          {/* Matcher Simulator */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-base font-semibold text-white">Cross-System Entity Matching Engine</h3>
            <p className="text-xs text-slate-400">
              Multi-signal entity matching across state licensing registries, Google Places, and MMJ-DOCS internal records.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="text-[10px] uppercase text-slate-400">External System</label>
                <input
                  type="text"
                  value={testSysName}
                  onChange={(e) => setTestSysName(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-slate-400">External ID</label>
                <input
                  type="text"
                  value={testExtId}
                  onChange={(e) => setTestExtId(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] uppercase text-slate-400">Entity Name</label>
                <input
                  type="text"
                  value={testEntityName}
                  onChange={(e) => setTestEntityName(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-slate-400">State / License</label>
                <input
                  type="text"
                  value={testLicense}
                  onChange={(e) => setTestLicense(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleTestResolve}
                disabled={resolving}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Link2 className="w-3.5 h-3.5" /> {resolving ? "Resolving..." : "Match External Entity"}
              </button>
            </div>

            {resolveResult && (
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">Canonical Match Result:</span>
                  <span
                    className={`px-2 py-0.5 rounded font-mono font-semibold ${
                      resolveResult.review_status === "CONFIRMED"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-amber-500/20 text-amber-400"
                    }`}
                  >
                    {resolveResult.review_status} ({(resolveResult.match_confidence * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="text-slate-400 font-mono">
                  Canonical ID: <span className="text-slate-200">{resolveResult.canonical_entity_id || "None"}</span>
                </div>
                <div className="text-slate-400">
                  Match Reasons:{" "}
                  <span className="text-emerald-400">{resolveResult.reasons?.join("; ") || "Direct ID match"}</span>
                </div>
              </div>
            )}
          </div>

          {/* Conflict Resolution Queue */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Data Conflict Resolution Queue</h3>
              <span className="text-xs text-slate-400">Source Authority Weighting & Evidence Preservation</span>
            </div>

            <div className="space-y-3">
              {conflicts.length === 0 ? (
                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400 text-center">
                  No active unresolved data conflicts across providers.
                </div>
              ) : (
                conflicts.map((c) => (
                  <div key={c.id} className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-semibold text-white uppercase text-[11px] bg-slate-800 px-2 py-0.5 rounded">
                          {c.field_name}
                        </span>
                        <span className="ml-2 text-slate-400 font-mono">Entity: {c.entity_id}</span>
                      </div>
                      <span className="text-amber-400 font-semibold">{c.resolution_status}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                        <div className="text-slate-400 font-medium">Source A ({c.source_a_name}):</div>
                        <div className="text-slate-200 font-mono mt-1">{c.source_a_value}</div>
                        <button
                          onClick={() => handleResolveConflict(c.id, c.source_a_value)}
                          className="mt-2 text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                        >
                          Adopt Source A
                        </button>
                      </div>

                      <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                        <div className="text-slate-400 font-medium">Source B ({c.source_b_name}):</div>
                        <div className="text-slate-200 font-mono mt-1">{c.source_b_value}</div>
                        <button
                          onClick={() => handleResolveConflict(c.id, c.source_b_value)}
                          className="mt-2 text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                        >
                          Adopt Source B
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: COLLABORATION WORKSPACE & CASES */}
      {activeTab === "collaboration" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Findings & Notes Feed */}
          <div className="lg:col-span-2 space-y-4">
            {/* Create Finding */}
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <h3 className="text-base font-semibold text-white">Publish Intelligence Finding</h3>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Finding headline..."
                  value={newFindingTitle}
                  onChange={(e) => setNewFindingTitle(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
                />
                <div className="flex gap-2">
                  <select
                    value={newFindingCategory}
                    onChange={(e) => setNewFindingCategory(e.target.value)}
                    className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 flex-1"
                  >
                    <option value="COMPETITOR">Competitor</option>
                    <option value="PRICING">Pricing</option>
                    <option value="REGULATORY">Regulatory</option>
                    <option value="MARKET">Market</option>
                  </select>
                  <select
                    value={newFindingImportance}
                    onChange={(e) => setNewFindingImportance(e.target.value)}
                    className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                  </select>
                </div>
              </div>

              <textarea
                rows={3}
                placeholder="Market evidence, observations, and strategic implications..."
                value={newFindingContent}
                onChange={(e) => setNewFindingContent(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
              />

              <div className="flex justify-end">
                <button
                  onClick={handleCreateFinding}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Publish Finding
                </button>
              </div>
            </div>

            {/* Findings List */}
            <div className="space-y-3">
              {findings.map((f) => (
                <div key={f.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-base font-semibold text-white">{f.title}</div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-mono text-[10px]">
                          {f.category}
                        </span>
                        <span>•</span>
                        <span>By {f.created_by}</span>
                        <span>•</span>
                        <span>{new Date(f.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        f.importance === "CRITICAL"
                          ? "bg-rose-500/20 text-rose-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}
                    >
                      {f.importance}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{f.content}</p>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-800/60">
                    <button
                      onClick={() => handleViewNotes(f.id)}
                      className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Private Team Notes ({f.notes_count || 0})
                    </button>
                    <span className="text-[10px] text-slate-500 uppercase">{f.review_status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cases & Notes Sidebar */}
          <div className="space-y-4">
            {/* Notes Drawer */}
            {activeFindingId && (
              <div className="p-4 rounded-xl bg-slate-900 border border-purple-500/40 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="text-xs font-semibold text-purple-400 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Internal Private Notes
                  </div>
                  <button onClick={() => setActiveFindingId(null)} className="text-xs text-slate-400 hover:text-white">
                    Close
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {findingNotes.length === 0 ? (
                    <div className="text-xs text-slate-500">No notes yet. Add confidential team notes below.</div>
                  ) : (
                    findingNotes.map((n) => (
                      <div key={n.id} className="p-2 rounded bg-slate-950 border border-slate-800 text-xs">
                        <div className="text-slate-200">{n.note_text}</div>
                        <div className="text-[10px] text-slate-500 mt-1 font-mono">{n.author_name}</div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Add private note..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200"
                  />
                  <button
                    onClick={handleAddNote}
                    className="px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* Cases Board */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <h4 className="text-sm font-semibold text-white">Investigation Cases</h4>
              <div className="space-y-2">
                {cases.map((c) => (
                  <div key={c.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex justify-between items-start">
                      <div className="text-xs font-semibold text-slate-200">{c.title}</div>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                        {c.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 line-clamp-1">{c.description}</div>
                    <div className="text-[10px] text-slate-500 font-mono pt-1">
                      Category: {c.case_category} • Lead: {c.assigned_lead || "Unassigned"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shared Watchlists */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <h4 className="text-sm font-semibold text-white">Shared Team Watchlists</h4>
              <div className="space-y-2">
                {sharedWatchlists.map((w) => (
                  <div key={w.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs flex justify-between items-center">
                    <div>
                      <div className="text-slate-200 font-medium">{w.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Scope: {w.sharing_scope} {w.team_name ? `(${w.team_name})` : ""}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400">
                      {w.items_count} items
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: MODULE REGISTRY & DISTRIBUTION */}
      {activeTab === "modules" && (
        <div className="space-y-6">
          {/* Modules Grid */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-white">Platform Intelligence Modules Registry</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {modules.map((m) => (
                <div key={m.name} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-emerald-400">v{m.version}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-mono">
                      {m.health_status}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-white">{m.name}</div>
                  <p className="text-xs text-slate-400 line-clamp-2">{m.purpose}</p>
                  <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-slate-800">
                    Route: {m.api_routes?.[0] || "/api/v1/governed"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Report Distribution */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-base font-semibold text-white">Controlled Report Distribution Channels</h3>
            <div className="space-y-3">
              {distributions.map((d) => (
                <div key={d.id} className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-200">{d.report_type}</div>
                    <div className="text-slate-400 font-mono mt-0.5">
                      Channel: <span className="text-emerald-400">{d.channel}</span> • Target: {d.recipient_target}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-500 font-mono">Cron: {d.schedule_cron}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-400">
                      {d.delivery_status || "SCHEDULED"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
