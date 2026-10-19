"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Database,
  Cpu,
  TrendingDown,
  TrendingUp,
  Activity,
  DollarSign,
  MessageSquare,
  Sparkles,
  Layers,
  Wrench,
  Search,
  Check,
  X,
  FileCheck,
  BarChart3,
  Flame,
  ArrowRight,
  ShieldAlert,
  Server,
  Clock,
} from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageLoading } from "@/components/ui/Spinner";
import { API_BASE } from "@/lib/api";

interface QualityMetric {
  name: string;
  category: string;
  value: number;
  unit: string;
  sample_count: number;
  coverage_pct: number;
  status: "HEALTHY" | "WARNING" | "CRITICAL";
  details: string;
}

interface QualityHealthReport {
  overall_health_score: number;
  overall_status: "HEALTHY" | "WARNING" | "CRITICAL";
  metrics: Record<string, QualityMetric>;
  measured_at: string;
}

interface ConsequentialFailure {
  id: string;
  incident_type: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  affected_component: string;
  target_type: string;
  target_id: string;
  details: string;
  recommended_action: string;
  is_automated_remediable: boolean;
  created_at: string;
}

interface RemediationLog {
  id: string;
  incident_type: string;
  target_entity_type: string;
  target_entity_id: string;
  action_taken: string;
  status: string;
  rollback_instructions: string;
  triggered_by: string;
  notes: string;
  created_at: string;
}

interface AiBenchmarkRun {
  run_id: string;
  suite_name: string;
  model_name: string;
  prompt_version: string;
  summary: {
    total_cases: number;
    passed_cases: number;
    failed_cases: number;
    pass_rate_pct: number;
    citation_accuracy_pct: number;
    numerical_accuracy_pct: number;
    injection_resistance_pct: number;
    phi_leakage_cases: number;
    overall_score: number;
    regression_detected: boolean;
    is_regression_detected?: boolean;
    regression_notes: string;
  };
  details: Array<{
    test_id: string;
    test_type: string;
    risk_level: string;
    question: string;
    status: string;
    failure_reason?: string;
    latency_ms: number;
    citations_count: number;
  }>;
}

interface ForecastRecord {
  id: string;
  target_state: string;
  metric_name: string;
  time_horizon: string;
  predicted_value: number;
  realized_actual_value?: number;
  error_margin_pct?: number;
  accuracy_status: string;
  outcome_source?: string;
  created_at: string;
}

interface ForecastMetrics {
  total_evaluations: number;
  mean_absolute_error?: number;
  root_mean_squared_error?: number;
  mean_absolute_pct_error?: number;
  directional_accuracy_pct?: number;
  status: string;
  insufficient_data_reason?: string;
}

interface RecommendationRecord {
  id: string;
  title: string;
  target_state: string;
  recommendation_type: string;
  action_recommended: string;
  adoption_status: string;
  rejection_reason?: string;
  baseline_metric_val: number;
  measured_outcome_val?: number;
  outcome_delta?: number;
  is_outcome_favorable?: boolean;
  adopted_by?: string;
  created_at: string;
}

interface DriftRecord {
  id: string;
  model_name: string;
  target_domain: string;
  target_metric: string;
  psi_score: number;
  ks_distance: number;
  classification: string;
  drift_detected: boolean;
  alert_level: string;
  recommended_investigation: string;
  explanation: string;
  created_at: string;
}

interface FeedbackItem {
  id: string;
  target_type: string;
  target_id: string;
  feedback_type: string;
  user_email: string;
  notes: string;
  status: string;
  resolution_notes?: string;
  resolved_by?: string;
  created_at: string;
}

interface OperationalTelemetry {
  overall_status: string;
  database_telemetry: {
    engine: string;
    ping_latency_ms: number;
    active_connections_limit: number;
    sqlite_db_size_mb: number;
  };
  job_queue_metrics: {
    queued: number;
    running: number;
    failed_last_24h: number;
    completed_last_24h: number;
  };
  system_resources: {
    platform: string;
    python_runtime: string;
  };
}

interface CostGovernanceReport {
  monthly_budget_usd: number;
  estimated_spend_usd: number;
  budget_utilization_pct: number;
  budget_status: string;
  total_token_consumption: number;
  cost_breakdown_by_service: Record<string, number>;
  fallback_policy: string;
  measurement_period: string;
}

interface RawBenchmarkRun {
  run_id?: string;
  id?: string;
  suite_name?: string;
  model_name?: string;
  prompt_version?: string;
  summary?: Partial<AiBenchmarkRun["summary"]>;
  details?: AiBenchmarkRun["details"];
  cases?: AiBenchmarkRun["details"];
  results_json?: string | unknown;
  total_cases?: number;
  passed_cases?: number;
  failed_cases?: number;
  pass_rate_pct?: number;
  citation_accuracy_pct?: number;
  numerical_accuracy_pct?: number;
  injection_resistance_pct?: number;
  phi_leakage_cases?: number;
  overall_score?: number;
  regression_detected?: boolean;
  is_regression_detected?: boolean;
  regression_notes?: string;
}

function normalizeBenchmarkRun(raw: RawBenchmarkRun | null | undefined): AiBenchmarkRun | null {
  if (!raw || typeof raw !== "object") return null;
  const passRate =
    raw.summary?.pass_rate_pct ??
    raw.pass_rate_pct ??
    (raw.overall_score != null ? Math.round(raw.overall_score * 100) : 0);
  const totalCases = raw.summary?.total_cases ?? raw.total_cases ?? 0;
  const passedCases = raw.summary?.passed_cases ?? raw.passed_cases ?? 0;
  const failedCases = raw.summary?.failed_cases ?? raw.failed_cases ?? Math.max(0, totalCases - passedCases);
  const citationAcc = raw.summary?.citation_accuracy_pct ?? raw.citation_accuracy_pct ?? 100;
  const numericalAcc = raw.summary?.numerical_accuracy_pct ?? raw.numerical_accuracy_pct ?? 100;
  const injectionRes = raw.summary?.injection_resistance_pct ?? raw.injection_resistance_pct ?? 100;
  const phiLeakage = raw.summary?.phi_leakage_cases ?? raw.phi_leakage_cases ?? 0;
  const isRegression = Boolean(
    raw.summary?.regression_detected ??
    raw.summary?.is_regression_detected ??
    raw.regression_detected ??
    raw.is_regression_detected ??
    false
  );

  let detailsList = raw.details || raw.cases;
  if (!detailsList && raw.results_json) {
    try {
      detailsList = typeof raw.results_json === "string" ? JSON.parse(raw.results_json) : (raw.results_json as AiBenchmarkRun["details"]);
    } catch {
      detailsList = [];
    }
  }

  return {
    run_id: raw.run_id || raw.id || "latest",
    suite_name: raw.suite_name || "CORE_REGRESSION_v8.0",
    model_name: raw.model_name || "gpt-4o",
    prompt_version: raw.prompt_version || "v8.0",
    summary: {
      total_cases: totalCases,
      passed_cases: passedCases,
      failed_cases: failedCases,
      pass_rate_pct: passRate,
      citation_accuracy_pct: citationAcc,
      numerical_accuracy_pct: numericalAcc,
      injection_resistance_pct: injectionRes,
      phi_leakage_cases: phiLeakage,
      overall_score: raw.summary?.overall_score ?? raw.overall_score ?? (passRate / 100),
      regression_detected: isRegression,
      regression_notes: raw.summary?.regression_notes || raw.regression_notes || "",
    },
    details: Array.isArray(detailsList) ? detailsList : [],
  };
}

export default function AdminQualityCenterPage() {
  const [activeTab, setActiveTab] = useState<
    "quality" | "ai_benchmarks" | "outcomes" | "drift" | "feedback_ops"
  >("quality");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [healthReport, setHealthReport] = useState<QualityHealthReport | null>(null);
  const [failures, setFailures] = useState<ConsequentialFailure[]>([]);
  const [remediations, setRemediations] = useState<RemediationLog[]>([]);
  const [benchmarkRun, setBenchmarkRun] = useState<AiBenchmarkRun | null>(null);
  const [forecasts, setForecasts] = useState<ForecastRecord[]>([]);
  const [forecastMetrics, setForecastMetrics] = useState<ForecastMetrics | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationRecord[]>([]);
  const [driftRecords, setDriftRecords] = useState<DriftRecord[]>([]);
  const [feedbackQueue, setFeedbackQueue] = useState<FeedbackItem[]>([]);
  const [telemetry, setTelemetry] = useState<OperationalTelemetry | null>(null);
  const [costReport, setCostReport] = useState<CostGovernanceReport | null>(null);

  // Modals & Action States
  const [actualModalOpen, setActualModalOpen] = useState(false);
  const [selectedForecast, setSelectedForecast] = useState<ForecastRecord | null>(null);
  const [actualValueInput, setActualValueInput] = useState("");
  const [actualSourceInput, setActualSourceInput] = useState("State DOH Monthly Release");

  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [feedbackResolutionNotes, setFeedbackResolutionNotes] = useState("");
  const [feedbackNewStatus, setFeedbackNewStatus] = useState("RESOLVED");

  const [runningEval, setRunningEval] = useState(false);
  const [remediatingId, setRemediatingId] = useState<string | null>(null);
  const [scanningDrift, setScanningDrift] = useState(false);

  // Load All Quality Data
  const loadData = async () => {
    try {
      const [
        resHealth,
        resFailures,
        resRemediations,
        resRuns,
        resForecasts,
        resForecastMetrics,
        resRecs,
        resDrift,
        resFeedback,
        resOps,
        resCost,
      ] = await Promise.all([
        fetch(`${API_BASE}/api/quality/health`).then((r) => r.json()),
        fetch(`${API_BASE}/api/quality/failures?limit=10`).then((r) => r.json()),
        fetch(`${API_BASE}/api/quality/remediations`).then((r) => r.json()),
        fetch(`${API_BASE}/api/quality/ai/runs`).then((r) => r.json()),
        fetch(`${API_BASE}/api/quality/forecasts`).then((r) => r.json()),
        fetch(`${API_BASE}/api/quality/forecasts/metrics`).then((r) => r.json()),
        fetch(`${API_BASE}/api/quality/recommendations`).then((r) => r.json()),
        fetch(`${API_BASE}/api/quality/drift`).then((r) => r.json()),
        fetch(`${API_BASE}/api/quality/feedback`).then((r) => r.json()),
        fetch(`${API_BASE}/api/quality/operational/telemetry`).then((r) => r.json()),
        fetch(`${API_BASE}/api/quality/operational/cost`).then((r) => r.json()),
      ]);

      setHealthReport(resHealth);
      setFailures(resFailures.failures || []);
      setRemediations(resRemediations.remediations || []);
      if (resRuns && resRuns.runs && resRuns.runs.length > 0) {
        setBenchmarkRun(normalizeBenchmarkRun(resRuns.runs[0]));
      }
      setForecasts(resForecasts.forecasts || []);
      setForecastMetrics(resForecastMetrics);
      setRecommendations(resRecs.recommendations || []);
      setDriftRecords(resDrift.drift_records || []);
      setFeedbackQueue(resFeedback.feedback_items || []);
      setTelemetry(resOps);
      setCostReport(resCost);
    } catch (err) {
      console.error("Failed to load Phase 8 Quality Center data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Safe Automated Remediation Execution
  const handleExecuteRemediation = async (failure: ConsequentialFailure) => {
    setRemediatingId(failure.id);
    try {
      let incidentType = "REFRESH_STALE_RECORD";
      let targetType = "ENTITY";
      if (failure.incident_type === "ATTRIBUTE_CONFLICT") {
        incidentType = "RESOLVE_CONFLICT_BY_RECENCY";
        targetType = "DATA_CONFLICT";
      } else if (failure.incident_type === "COLLECTION_OR_JOB_FAILURE") {
        incidentType = "RETRY_JOB";
        targetType = "JOB_EXECUTION";
      }

      const res = await fetch(`${API_BASE}/api/quality/remediate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incident_type: incidentType,
          target_entity_type: targetType,
          target_entity_id: failure.target_id,
        }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error("Remediation execution error:", err);
    } finally {
      setRemediatingId(null);
    }
  };

  // AI Regression Suite Runner
  const handleRunAiEvaluation = async () => {
    setRunningEval(true);
    try {
      const res = await fetch(`${API_BASE}/api/quality/ai/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suite_name: "CORE_REGRESSION_v8.0",
          model_name: "gpt-4o",
          prompt_version: "v8.0",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setBenchmarkRun(normalizeBenchmarkRun(data));
        loadData();
      }
    } catch (err) {
      console.error("AI Evaluation error:", err);
    } finally {
      setRunningEval(false);
    }
  };

  // Record Verified Actual
  const handleRecordActual = async () => {
    if (!selectedForecast || !actualValueInput) return;
    try {
      const res = await fetch(`${API_BASE}/api/quality/forecasts/actual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          forecast_id: selectedForecast.id,
          actual_value: parseFloat(actualValueInput),
          outcome_source: actualSourceInput,
          verification_notes: "Recorded via Administrative Quality Center.",
        }),
      });
      if (res.ok) {
        setActualModalOpen(false);
        setActualValueInput("");
        loadData();
      }
    } catch (err) {
      console.error("Record actual error:", err);
    }
  };

  // Trigger Drift Scan
  const handleScanDrift = async (scanType: "PRICING" | "OPPORTUNITY_SCORE") => {
    setScanningDrift(true);
    try {
      const res = await fetch(`${API_BASE}/api/quality/drift/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scan_type: scanType,
          state: "FL",
          window_days: 30,
        }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error("Drift scan error:", err);
    } finally {
      setScanningDrift(false);
    }
  };

  // Resolve Feedback Item
  const handleResolveFeedback = async () => {
    if (!selectedFeedback) return;
    try {
      const res = await fetch(`${API_BASE}/api/quality/feedback/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback_id: selectedFeedback.id,
          new_status: feedbackNewStatus,
          resolution_notes: feedbackResolutionNotes,
        }),
      });
      if (res.ok) {
        setFeedbackModalOpen(false);
        setSelectedFeedback(null);
        setFeedbackResolutionNotes("");
        loadData();
      }
    } catch (err) {
      console.error("Feedback resolve error:", err);
    }
  };

  if (loading) {
    return <PageLoading />;
  }

  const overallHealth = healthReport?.overall_health_score || 0;
  const healthStatus = healthReport?.overall_status || "WARNING";

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* 1. Header & Quality Health Index Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              Administrative Quality Center
            </h1>
            <Badge tone="neutral" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
              Phase 8 Continuous Improvement
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Empirical quality governance, automated reversibility, AI regression suites, forecast outcome calibration & drift monitoring.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh Telemetry
          </Button>
          <div className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-slate-800 flex items-center gap-3 border border-slate-700/60 shadow-sm">
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                Platform Quality Index
              </div>
              <div className="text-lg font-bold flex items-center gap-1.5 justify-end">
                <span>{overallHealth.toFixed(1)}/100</span>
                <span
                  className={`inline-block w-2.5 h-2.5 rounded-full ${
                    healthStatus === "HEALTHY"
                      ? "bg-emerald-400"
                      : healthStatus === "WARNING"
                      ? "bg-amber-400"
                      : "bg-rose-500"
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top-Level Metric Summary Cards */}
      {healthReport?.metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {Object.entries(healthReport.metrics).map(([key, m]) => (
            <Card key={key} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border-slate-200 dark:border-slate-800 shadow-xs">
              <CardBody className="p-3.5">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                  {m.name}
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-white mt-1 flex items-baseline gap-1">
                  {m.value.toFixed(1)}
                  <span className="text-xs font-normal text-slate-500">{m.unit}</span>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                  <span className="text-slate-400">{m.sample_count} samples</span>
                  <Badge
                    tone={m.status === "HEALTHY" ? "success" : m.status === "WARNING" ? "warning" : "danger"}
                    className="text-[9px] px-1.5 py-0"
                  >
                    {m.status}
                  </Badge>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab("quality")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === "quality"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Quality & Remediation
          {failures.length > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-full font-bold">
              {failures.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("ai_benchmarks")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === "ai_benchmarks"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          AI Regression Suite
          {benchmarkRun?.summary?.pass_rate_pct != null && (
            <span className="px-1.5 py-0.2 text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full font-bold">
              {benchmarkRun.summary.pass_rate_pct.toFixed(0)}%
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("outcomes")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === "outcomes"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Outcome Calibration
        </button>

        <button
          onClick={() => setActiveTab("drift")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === "drift"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Activity className="w-4 h-4" />
          Model & Analytics Drift
        </button>

        <button
          onClick={() => setActiveTab("feedback_ops")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === "feedback_ops"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Server className="w-4 h-4" />
          Feedback & SRE Telemetry
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: QUALITY & SAFE AUTOMATED REMEDIATION */}
      {/* ========================================================================= */}
      {activeTab === "quality" && (
        <div className="space-y-6">
          {/* Top Consequential Failures */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Flame className="w-5 h-5 text-rose-500" />
                  Consequential Incident & Quality Failure Queue
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Ranked by severity. Material modifications require human approval; low-risk tasks offer reversible safe remediation.
                </p>
              </div>
              <Badge tone="neutral" className="text-xs">
                {failures.length} Active Failures
              </Badge>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border-y border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4 font-medium">Severity</th>
                      <th className="py-2.5 px-4 font-medium">Incident Type</th>
                      <th className="py-2.5 px-4 font-medium">Affected Component</th>
                      <th className="py-2.5 px-4 font-medium">Details & Root Cause</th>
                      <th className="py-2.5 px-4 font-medium">Recommended Action</th>
                      <th className="py-2.5 px-4 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {failures.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                          Zero high-severity quality incidents detected across active pipelines.
                        </td>
                      </tr>
                    ) : (
                      failures.map((f) => (
                        <tr key={f.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                          <td className="py-3 px-4">
                            <Badge
                              tone={
                                f.severity === "CRITICAL"
                                  ? "danger"
                                  : f.severity === "HIGH"
                                  ? "warning"
                                  : "neutral"
                              }
                              className="text-[10px]"
                            >
                              {f.severity}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-900 dark:text-white">
                            {f.incident_type}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                            {f.affected_component}
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate text-slate-600 dark:text-slate-400">
                            {f.details}
                          </td>
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                            {f.recommended_action}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {f.is_automated_remediable ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={remediatingId === f.id}
                                onClick={() => handleExecuteRemediation(f)}
                                className="text-xs py-1 h-7 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              >
                                {remediatingId === f.id ? "Remediating..." : "Auto-Remediate"}
                              </Button>
                            ) : (
                              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                Human Approval Req.
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>

          {/* Remediation Audit Logs */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Safe Automated Remediation Audit Trail
              </h3>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 border-y border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2 px-4 font-medium">Triggered At</th>
                      <th className="py-2 px-4 font-medium">Action Taken</th>
                      <th className="py-2 px-4 font-medium">Target ID</th>
                      <th className="py-2 px-4 font-medium">Status</th>
                      <th className="py-2 px-4 font-medium">Rollback Guidance</th>
                      <th className="py-2 px-4 font-medium">Triggered By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-400">
                    {remediations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-slate-400">
                          No automated remediations logged in the current window.
                        </td>
                      </tr>
                    ) : (
                      remediations.map((r) => (
                        <tr key={r.id}>
                          <td className="py-2.5 px-4 font-mono text-[11px]">
                            {new Date(r.created_at).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                            {r.action_taken}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-[11px] truncate max-w-[120px]">
                            {r.target_entity_id}
                          </td>
                          <td className="py-2.5 px-4">
                            <Badge tone={r.status === "SUCCESS" ? "success" : "danger"} className="text-[10px]">
                              {r.status}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-4 max-w-xs truncate text-slate-500">
                            {r.rollback_instructions}
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                            {r.triggered_by}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AI REGRESSION & BENCHMARK SUITE */}
      {/* ========================================================================= */}
      {activeTab === "ai_benchmarks" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                Version-Controlled AI Regression Suite
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Evaluates factual grounding, citation validity, numerical precision, prompt injection resistance, and Zero-PHI boundary.
              </p>
            </div>
            <Button
              onClick={handleRunAiEvaluation}
              disabled={runningEval}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
            >
              {runningEval ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Running Benchmarks...
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  Execute Evaluation Suite
                </>
              )}
            </Button>
          </div>

          {benchmarkRun ? (
            <>
              {/* Scorecard Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardBody className="p-4">
                    <div className="text-xs text-slate-500 font-medium">Overall Pass Rate</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      {benchmarkRun.summary?.pass_rate_pct != null
                        ? `${benchmarkRun.summary.pass_rate_pct.toFixed(1)}%`
                        : "N/A"}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {benchmarkRun.summary?.passed_cases ?? 0}/{benchmarkRun.summary?.total_cases ?? 0} cases passed
                    </div>
                  </CardBody>
                </Card>

                <Card className="border-slate-200 dark:border-slate-800">
                  <CardBody className="p-4">
                    <div className="text-xs text-slate-500 font-medium">Citation Accuracy</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      {benchmarkRun.summary?.citation_accuracy_pct != null
                        ? `${benchmarkRun.summary.citation_accuracy_pct.toFixed(1)}%`
                        : "N/A"}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Grounding verification</div>
                  </CardBody>
                </Card>

                <Card className="border-slate-200 dark:border-slate-800">
                  <CardBody className="p-4">
                    <div className="text-xs text-slate-500 font-medium">Numerical Accuracy</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      {benchmarkRun.summary?.numerical_accuracy_pct != null
                        ? `${benchmarkRun.summary.numerical_accuracy_pct.toFixed(1)}%`
                        : "N/A"}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Mathematical precision</div>
                  </CardBody>
                </Card>

                <Card className="border-slate-200 dark:border-slate-800">
                  <CardBody className="p-4">
                    <div className="text-xs text-slate-500 font-medium">Injection Resistance</div>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                      {benchmarkRun.summary?.injection_resistance_pct != null
                        ? `${benchmarkRun.summary.injection_resistance_pct.toFixed(1)}%`
                        : "N/A"}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Prompt jailbreak defense</div>
                  </CardBody>
                </Card>

                <Card className="border-slate-200 dark:border-slate-800">
                  <CardBody className="p-4">
                    <div className="text-xs text-slate-500 font-medium">Zero-PHI Violations</div>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                      {benchmarkRun.summary?.phi_leakage_cases ?? 0}
                    </div>
                    <div className="text-[11px] text-emerald-500 font-semibold mt-1">Strict HIPAA Boundary</div>
                  </CardBody>
                </Card>
              </div>

              {/* Case Results Table */}
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Individual Test Case Executions ({benchmarkRun.suite_name || "CORE_REGRESSION"} — Model: {benchmarkRun.model_name || "gpt-4o"})
                    </h4>
                    <Badge tone={benchmarkRun.summary?.regression_detected ? "danger" : "success"}>
                      {benchmarkRun.summary?.regression_detected ? "Regression Flagged" : "No Regression Detected"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardBody className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 border-y border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-2.5 px-4 font-medium">Type</th>
                          <th className="py-2.5 px-4 font-medium">Risk</th>
                          <th className="py-2.5 px-4 font-medium">Question / Prompt</th>
                          <th className="py-2.5 px-4 font-medium">Latency</th>
                          <th className="py-2.5 px-4 font-medium">Status</th>
                          <th className="py-2.5 px-4 font-medium">Diagnostics</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                        {(benchmarkRun.details || []).map((c, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-800 dark:text-slate-200 font-semibold">
                              {c.test_type}
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                tone={c.risk_level === "HIGH" ? "danger" : c.risk_level === "MEDIUM" ? "warning" : "neutral"}
                                className="text-[10px]"
                              >
                                {c.risk_level}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 max-w-md truncate text-slate-900 dark:text-white font-medium">
                              {c.question}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-500">
                              {c.latency_ms != null ? `${c.latency_ms.toFixed(0)}ms` : "—"}
                            </td>
                            <td className="py-3 px-4">
                              <Badge tone={c.status === "PASSED" ? "success" : "danger"} className="text-[10px]">
                                {c.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-slate-500 truncate max-w-xs">
                              {c.failure_reason || `${c.citations_count ?? 0} verified citations`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardBody>
              </Card>
            </>
          ) : (
            <Card className="border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500">
              No benchmark runs recorded yet. Click &quot;Execute Evaluation Suite&quot; to run automated regression tests.
            </Card>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: OUTCOME CALIBRATION */}
      {/* ========================================================================= */}
      {activeTab === "outcomes" && (
        <div className="space-y-6">
          {/* Accuracy Metrics Header */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-slate-200 dark:border-slate-800">
              <CardBody className="p-4">
                <div className="text-xs text-slate-500 font-medium">Mean Absolute Error (MAE)</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {forecastMetrics?.mean_absolute_error !== undefined
                    ? forecastMetrics.mean_absolute_error.toFixed(2)
                    : "N/A"}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {forecastMetrics?.status === "INSUFFICIENT_OUTCOMES" ? "Pending actual observations" : "Calibrated"}
                </div>
              </CardBody>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800">
              <CardBody className="p-4">
                <div className="text-xs text-slate-500 font-medium">Root Mean Squared Error (RMSE)</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {forecastMetrics?.root_mean_squared_error !== undefined
                    ? forecastMetrics.root_mean_squared_error.toFixed(2)
                    : "N/A"}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Variance-penalized accuracy</div>
              </CardBody>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800">
              <CardBody className="p-4">
                <div className="text-xs text-slate-500 font-medium">Mean Absolute % Error (MAPE)</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {forecastMetrics?.mean_absolute_pct_error !== undefined
                    ? `${forecastMetrics.mean_absolute_pct_error.toFixed(1)}%`
                    : "N/A"}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Relative percentage error</div>
              </CardBody>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800">
              <CardBody className="p-4">
                <div className="text-xs text-slate-500 font-medium">Directional Accuracy</div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {forecastMetrics?.directional_accuracy_pct !== undefined
                    ? `${forecastMetrics.directional_accuracy_pct.toFixed(0)}%`
                    : "N/A"}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Correct trend projection</div>
              </CardBody>
            </Card>
          </div>

          {/* Forecasts Table */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Forecast Predictions & Verified Realized Actuals
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Predictions remain immutable; actuals are recorded with source provenance once verified by health authority reports.
                </p>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 border-y border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4 font-medium">State</th>
                      <th className="py-2.5 px-4 font-medium">Metric</th>
                      <th className="py-2.5 px-4 font-medium">Horizon</th>
                      <th className="py-2.5 px-4 font-medium">Predicted Value</th>
                      <th className="py-2.5 px-4 font-medium">Realized Actual</th>
                      <th className="py-2.5 px-4 font-medium">Error Margin</th>
                      <th className="py-2.5 px-4 font-medium">Status</th>
                      <th className="py-2.5 px-4 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {forecasts.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                          {f.target_state}
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          {f.metric_name}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {f.time_horizon}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium">
                          {f.predicted_value.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-white">
                          {f.realized_actual_value !== null && f.realized_actual_value !== undefined
                            ? f.realized_actual_value.toLocaleString()
                            : "—"}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {f.error_margin_pct !== null && f.error_margin_pct !== undefined ? (
                            <span
                              className={
                                Math.abs(f.error_margin_pct) <= 10.0
                                  ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                                  : "text-amber-600 dark:text-amber-400"
                              }
                            >
                              {f.error_margin_pct > 0 ? "+" : ""}
                              {f.error_margin_pct.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-slate-400">Pending</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            tone={
                              f.accuracy_status === "CALIBRATED_ACCURATE"
                                ? "success"
                                : f.accuracy_status === "MODERATE_DEVIATION"
                                ? "warning"
                                : f.accuracy_status === "HIGH_DEVIATION"
                                ? "danger"
                                : "neutral"
                            }
                            className="text-[10px]"
                          >
                            {f.accuracy_status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedForecast(f);
                              setActualModalOpen(true);
                            }}
                            className="text-xs py-1 h-7"
                          >
                            Record Actual
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>

          {/* Recommendations Outcomes & Adoption Table */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Recommendation Adoption & Measured Outcomes
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tracks executive adoption, rejection rationales, and verified business performance follow-through.
              </p>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 border-y border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4 font-medium">Recommendation</th>
                      <th className="py-2.5 px-4 font-medium">State</th>
                      <th className="py-2.5 px-4 font-medium">Type</th>
                      <th className="py-2.5 px-4 font-medium">Adoption Status</th>
                      <th className="py-2.5 px-4 font-medium">Baseline</th>
                      <th className="py-2.5 px-4 font-medium">Measured Outcome</th>
                      <th className="py-2.5 px-4 font-medium">Delta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {recommendations.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-white max-w-xs truncate">
                          {r.title}
                        </td>
                        <td className="py-3 px-4">{r.target_state}</td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{r.recommendation_type}</td>
                        <td className="py-3 px-4">
                          <Badge
                            tone={
                              r.adoption_status === "EXECUTED" || r.adoption_status === "ADOPTED"
                                ? "success"
                                : r.adoption_status === "REJECTED"
                                ? "danger"
                                : "neutral"
                            }
                            className="text-[10px]"
                          >
                            {r.adoption_status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-mono">{r.baseline_metric_val.toFixed(1)}</td>
                        <td className="py-3 px-4 font-mono font-semibold">
                          {r.measured_outcome_val !== null && r.measured_outcome_val !== undefined
                            ? r.measured_outcome_val.toFixed(1)
                            : "—"}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {r.outcome_delta !== null && r.outcome_delta !== undefined ? (
                            <span className={r.is_outcome_favorable ? "text-emerald-500 font-semibold" : "text-rose-500"}>
                              {r.outcome_delta > 0 ? "+" : ""}
                              {r.outcome_delta.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MODEL & ANALYTICS DRIFT MONITOR */}
      {/* ========================================================================= */}
      {activeTab === "drift" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-500" />
                Statistical Drift Detection Engine
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Computes Population Stability Index (PSI) and Kolmogorov-Smirnov distance with 4-way classification.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={scanningDrift}
                onClick={() => handleScanDrift("PRICING")}
                className="text-xs flex items-center gap-1.5"
              >
                Scan Pricing Drift
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={scanningDrift}
                onClick={() => handleScanDrift("OPPORTUNITY_SCORE")}
                className="text-xs flex items-center gap-1.5"
              >
                Scan Score Drift
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {driftRecords.map((d) => (
              <Card key={d.id} className="border-slate-200 dark:border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {d.target_domain} Drift — {d.target_metric}
                    </h4>
                    <span className="text-[11px] text-slate-400">{d.model_name}</span>
                  </div>
                  <Badge
                    tone={
                      d.classification === "DATA_QUALITY_INCIDENT"
                        ? "danger"
                        : d.classification === "MARKET_CONDITION_SHIFT"
                        ? "warning"
                        : "neutral"
                    }
                    className="text-[10px]"
                  >
                    {d.classification}
                  </Badge>
                </CardHeader>
                <CardBody className="space-y-3 pt-0">
                  <div className="flex items-center gap-6 py-2 border-y border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px]">PSI SCORE</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {d.psi_score.toFixed(4)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">KS DISTANCE</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {d.ks_distance.toFixed(4)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">DRIFT STATUS</span>
                      <span
                        className={`font-semibold ${
                          d.drift_detected ? "text-amber-500" : "text-emerald-500"
                        }`}
                      >
                        {d.drift_detected ? "Shift Detected" : "Stable Baseline"}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {d.explanation}
                  </p>

                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-0.5">
                      Recommended Investigation:
                    </span>
                    {d.recommended_investigation}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: FEEDBACK & SRE OPERATIONAL TELEMETRY */}
      {/* ========================================================================= */}
      {activeTab === "feedback_ops" && (
        <div className="space-y-6">
          {/* SRE Operational Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-slate-200 dark:border-slate-800">
              <CardBody className="p-4">
                <div className="text-xs text-slate-500 font-medium">Database Latency & Engine</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1 flex items-baseline gap-2">
                  <span>{telemetry?.database_telemetry?.ping_latency_ms != null ? `${telemetry.database_telemetry.ping_latency_ms.toFixed(1)}ms` : "—"}</span>
                  <Badge tone="success" className="text-[10px]">
                    {telemetry?.database_telemetry?.engine || "PostgreSQL"}
                  </Badge>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Storage: {telemetry?.database_telemetry?.sqlite_db_size_mb != null ? `${telemetry.database_telemetry.sqlite_db_size_mb.toFixed(1)} MB` : "—"}
                </div>
              </CardBody>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800">
              <CardBody className="p-4">
                <div className="text-xs text-slate-500 font-medium">Background Job Queue</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {telemetry?.job_queue_metrics?.queued ?? 0} Queued
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {telemetry?.job_queue_metrics?.failed_last_24h ?? 0} failures in last 24h
                </div>
              </CardBody>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800">
              <CardBody className="p-4">
                <div className="text-xs text-slate-500 font-medium">Monthly Token Budget Cap</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  ${costReport?.monthly_budget_usd != null ? costReport.monthly_budget_usd.toFixed(2) : "0.00"}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  ${costReport?.estimated_spend_usd != null ? costReport.estimated_spend_usd.toFixed(2) : "0.00"} spent (
                  {costReport?.budget_utilization_pct != null ? costReport.budget_utilization_pct.toFixed(1) : "0.0"}%)
                </div>
              </CardBody>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800">
              <CardBody className="p-4">
                <div className="text-xs text-slate-500 font-medium">Token Consumption</div>
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                  {costReport?.total_token_consumption != null ? costReport.total_token_consumption.toLocaleString() : "0"}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Policy: {costReport?.fallback_policy || "Standard"}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* User Intelligence Feedback Queue */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-500" />
                  User Intelligence Feedback & Resolution Queue
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Controlled feedback loop. Prevents unauthorized overwriting of historical intelligence.
                </p>
              </div>
              <Badge tone="neutral" className="text-xs">
                {feedbackQueue.length} Feedback Records
              </Badge>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 border-y border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4 font-medium">Target</th>
                      <th className="py-2.5 px-4 font-medium">Feedback Type</th>
                      <th className="py-2.5 px-4 font-medium">User Notes</th>
                      <th className="py-2.5 px-4 font-medium">Status</th>
                      <th className="py-2.5 px-4 font-medium">Resolution Details</th>
                      <th className="py-2.5 px-4 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {feedbackQueue.map((fb) => (
                      <tr key={fb.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                        <td className="py-3 px-4 font-mono text-[11px]">
                          {fb.target_type} ({fb.target_id})
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            tone={
                              fb.feedback_type === "USEFUL"
                                ? "success"
                                : fb.feedback_type === "INACCURATE"
                                ? "danger"
                                : "warning"
                            }
                            className="text-[10px]"
                          >
                            {fb.feedback_type}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-slate-900 dark:text-white">
                          {fb.notes}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            tone={fb.status === "RESOLVED" ? "success" : "neutral"}
                            className="text-[10px]"
                          >
                            {fb.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                          {fb.resolution_notes || "—"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {fb.status === "PENDING_REVIEW" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedFeedback(fb);
                                setFeedbackModalOpen(true);
                              }}
                              className="text-xs py-1 h-7"
                            >
                              Triage
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: RECORD FORECAST ACTUAL */}
      {/* ========================================================================= */}
      <Modal
        open={actualModalOpen}
        onClose={() => setActualModalOpen(false)}
        title="Record Verified Forecast Outcome"
      >
        <div className="space-y-4 text-sm">
          <p className="text-xs text-slate-500">
            Record the empirical realized metric verified by health authority reports or competitor portal scrapers. Original prediction remains immutable.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Forecast Metric & Target
            </label>
            <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono">
              {selectedForecast?.metric_name} in {selectedForecast?.target_state} (Predicted: {selectedForecast?.predicted_value})
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Realized Actual Value
            </label>
            <Input
              type="number"
              placeholder="e.g. 152.5"
              value={actualValueInput}
              onChange={(e) => setActualValueInput(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Outcome Verification Source
            </label>
            <Input
              value={actualSourceInput}
              onChange={(e) => setActualSourceInput(e.target.value)}
              placeholder="e.g. Florida DOH OMMU Weekly Update"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setActualModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordActual} disabled={!actualValueInput}>
              Submit Verified Actual
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: RESOLVE FEEDBACK ITEM */}
      {/* ========================================================================= */}
      <Modal
        open={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        title="Resolve Intelligence Feedback"
      >
        <div className="space-y-4 text-sm">
          <p className="text-xs text-slate-500">
            Triage user-submitted intelligence feedback. Record investigation findings and mark issue as resolved or dismissed.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              User Notes
            </label>
            <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs">
              {selectedFeedback?.notes}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Resolution Action
            </label>
            <select
              value={feedbackNewStatus}
              onChange={(e) => setFeedbackNewStatus(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2"
            >
              <option value="RESOLVED">Mark Resolved (Verified & Corrected)</option>
              <option value="DISMISSED">Dismiss (False Positive / Expected)</option>
              <option value="INVESTIGATING">Keep Under Investigation</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Resolution Notes & Audit Trail
            </label>
            <textarea
              rows={3}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2"
              placeholder="Explain how the finding was verified, corrected in workspace, or dismissed..."
              value={feedbackResolutionNotes}
              onChange={(e) => setFeedbackResolutionNotes(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setFeedbackModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResolveFeedback}>
              Complete Triage
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
