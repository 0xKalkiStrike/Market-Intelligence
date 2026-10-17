"use client";

import { useEffect, useState } from "react";
import {
  FlaskConical,
  Plus,
  RefreshCw,
  FileDown,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Shield,
  Layers,
  Search,
  ExternalLink,
  BookOpen,
  Info,
  Check,
  X,
} from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageLoading } from "@/components/ui/Spinner";
import { api } from "@/lib/api";

interface ProjectSummary {
  id: string;
  title: string;
  description: string;
  status: string;
  target_states: string[];
  created_by?: string;
  created_at?: string;
  hypothesis_count: number;
  finding_count: number;
  validated_finding_count: number;
}

interface EvidenceRef {
  id: string;
  source_type: string;
  source_name: string;
  source_uri?: string;
  observation_date?: string;
  sample_count: number;
  confidence_weight: number;
  is_contradictory: boolean;
  verification_status: string;
}

interface ReviewAudit {
  id: string;
  reviewer_email: string;
  previous_status: string;
  new_status: string;
  review_notes?: string;
  rationale?: string;
  created_at?: string;
}

interface FindingItem {
  id: string;
  title: string;
  statement: string;
  category: string;
  status: string;
  calculation_method: string;
  sample_size: number;
  data_coverage_pct: number;
  confidence_score: number;
  limitations: string;
  contradictory_evidence?: string;
  recommended_next_step?: string;
  reviewer_id?: string;
  reviewed_at?: string;
  evidence_references: EvidenceRef[];
  review_history: ReviewAudit[];
}

interface HypothesisItem {
  id: string;
  statement: string;
  geographic_scope: string;
  geographic_target: string;
  status: string;
  confidence_score: number;
  target_metrics: string[];
  methodology_notes: string;
  limitations_notes: string;
}

interface ProjectDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  target_states: string[];
  hypotheses: HypothesisItem[];
  findings: FindingItem[];
}

export default function ResearchWorkspacePage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectDetail, setProjectDetail] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  // Modals & Panels
  const [newProjectModal, setNewProjectModal] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [projectStates, setProjectStates] = useState("FL, PA");

  const [newHypoModal, setNewHypoModal] = useState(false);
  const [hypoStatement, setHypoStatement] = useState("");
  const [hypoScope, setHypoScope] = useState("STATE");
  const [hypoTarget, setHypoTarget] = useState("FL");
  const [hypoMetrics, setHypoMetrics] = useState("conversion_rate, net_margin");

  const [newFindingModal, setNewFindingModal] = useState(false);
  const [findingTitle, setFindingTitle] = useState("");
  const [findingStatement, setFindingStatement] = useState("");
  const [findingCat, setFindingCat] = useState("PRICING");
  const [findingMethod, setFindingMethod] = useState("TIME_SERIES_OLS");
  const [findingConfidence, setFindingConfidence] = useState(0.85);

  const [activeFinding, setActiveFinding] = useState<FindingItem | null>(null);
  const [findingReviewModal, setFindingReviewModal] = useState(false);
  const [nextLifecycleStatus, setNextLifecycleStatus] = useState("VALIDATED");
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewRationale, setReviewRationale] = useState("");

  const [dossierModal, setDossierModal] = useState(false);
  const [dossierMarkdown, setDossierMarkdown] = useState("");

  const [reassessmentMsg, setReassessmentMsg] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  async function loadProjects() {
    setLoading(true);
    try {
      const res = await api.get<{ projects: ProjectSummary[] }>("/api/research/projects");
      const list = res.projects || [];
      setProjects(list);
      if (list.length > 0 && !selectedProjectId) {
        setSelectedProjectId(list[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadProjectDetail(id: string) {
    setDetailLoading(true);
    try {
      const res = await api.get<ProjectDetail>(`/api/research/projects/${id}`);
      setProjectDetail(res);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadProjectDetail(selectedProjectId);
    }
  }, [selectedProjectId]);

  async function handleCreateProject() {
    if (!projectTitle.trim()) return;
    try {
      const states = projectStates.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
      await api.post("/api/research/projects", {
        title: projectTitle,
        description: projectDesc,
        target_states: states,
      });
      setNewProjectModal(false);
      setProjectTitle("");
      setProjectDesc("");
      loadProjects();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCreateHypothesis() {
    if (!selectedProjectId || !hypoStatement.trim()) return;
    try {
      const metrics = hypoMetrics.split(",").map((m) => m.trim()).filter(Boolean);
      await api.post(`/api/research/projects/${selectedProjectId}/hypotheses`, {
        hypothesis_statement: hypoStatement,
        geographic_scope: hypoScope,
        geographic_target: hypoTarget,
        target_metrics: metrics,
        methodology_notes: "Empirical observation and regression testing.",
      });
      setNewHypoModal(false);
      setHypoStatement("");
      loadProjectDetail(selectedProjectId);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCreateFinding() {
    if (!selectedProjectId || !findingTitle.trim() || !findingStatement.trim()) return;
    try {
      await api.post(`/api/research/projects/${selectedProjectId}/findings`, {
        title: findingTitle,
        statement: findingStatement,
        category: findingCat,
        calculation_method: findingMethod,
        sample_size: 15,
        confidence_score: Number(findingConfidence),
      });
      setNewFindingModal(false);
      setFindingTitle("");
      setFindingStatement("");
      loadProjectDetail(selectedProjectId);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleTransitionLifecycle() {
    if (!activeFinding) return;
    try {
      await api.post(`/api/research/findings/${activeFinding.id}/lifecycle`, {
        new_status: nextLifecycleStatus,
        review_notes: reviewNotes || "Status transitioned via Research Review Console.",
        rationale: reviewRationale || "Evidence reviewed and cross-referenced with public feeds.",
      });
      setFindingReviewModal(false);
      setReviewNotes("");
      setReviewRationale("");
      if (selectedProjectId) loadProjectDetail(selectedProjectId);
      setActiveFinding(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to transition status");
    }
  }

  async function handleRunReassessmentScan() {
    setScanning(true);
    setReassessmentMsg(null);
    try {
      const res = await api.post<{ total_validated_checked: number; flagged_for_reassessment: number }>("/api/research/reassessment/scan");
      setReassessmentMsg(
        `Automated Scan Complete: Checked ${res.total_validated_checked} validated findings. ${res.flagged_for_reassessment} flagged for reassessment due to new conflicting records.`
      );
      if (selectedProjectId) loadProjectDetail(selectedProjectId);
    } catch (err) {
      console.error(err);
    } finally {
      setScanning(false);
    }
  }

  async function handleExportDossier() {
    if (!selectedProjectId) return;
    try {
      const res = await api.get<{ markdown_report: string }>(`/api/research/projects/${selectedProjectId}/export`);
      setDossierMarkdown(res.markdown_report);
      setDossierModal(true);
    } catch (err) {
      console.error(err);
    }
  }

  function getStatusBadgeTone(status: string): "neutral" | "success" | "warning" | "danger" | "info" | "purple" | "cyan" {
    switch (status) {
      case "VALIDATED":
      case "SUPPORTED":
        return "success";
      case "UNDER_INVESTIGATION":
      case "TESTING":
        return "info";
      case "EVIDENCE_REVIEWED":
        return "cyan";
      case "NEEDS_REASSESSMENT":
        return "warning";
      case "SUPERSEDED":
        return "purple";
      case "REJECTED":
      case "CONTRADICTED":
        return "danger";
      default:
        return "neutral";
    }
  }

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg text-indigo-600 dark:text-indigo-400">
              <FlaskConical className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Market Research Workspace
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Phase 7: Evidence-grounded hypothesis testing, audit-backed findings, and lifecycle governance.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRunReassessmentScan}
            disabled={scanning}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
            {scanning ? "Scanning Feeds..." : "Scan Reassessment"}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportDossier}
            disabled={!selectedProjectId}
            className="flex items-center gap-1.5"
          >
            <FileDown className="h-4 w-4" />
            Export Dossier
          </Button>

          <Button
            size="sm"
            onClick={() => setNewProjectModal(true)}
            className="flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            New Research Project
          </Button>
        </div>
      </div>

      {/* Alert Banner for Reassessment Scan */}
      {reassessmentMsg && (
        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-center justify-between gap-3 text-xs sm:text-sm text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>{reassessmentMsg}</span>
          </div>
          <button onClick={() => setReassessmentMsg(null)} className="text-amber-700 hover:underline text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Workspace Overview Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 bg-white/70 dark:bg-slate-900/60 backdrop-blur">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Projects</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{projects.length}</p>
        </Card>
        <Card className="p-4 bg-white/70 dark:bg-slate-900/60 backdrop-blur">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Formulated Hypotheses</p>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {projects.reduce((sum, p) => sum + p.hypothesis_count, 0)}
          </p>
        </Card>
        <Card className="p-4 bg-white/70 dark:bg-slate-900/60 backdrop-blur">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Findings</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {projects.reduce((sum, p) => sum + p.finding_count, 0)}
          </p>
        </Card>
        <Card className="p-4 bg-white/70 dark:bg-slate-900/60 backdrop-blur">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Validated Evidence</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {projects.reduce((sum, p) => sum + p.validated_finding_count, 0)}
          </p>
        </Card>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Project Navigation */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-indigo-500" />
              Research Projects
            </h2>
            <span className="text-xs text-slate-400">{projects.length} recorded</span>
          </div>

          <div className="space-y-2">
            {projects.length === 0 ? (
              <Card className="p-6 text-center text-slate-500 text-sm">
                No research projects created yet. Formulate your first project above.
              </Card>
            ) : (
              projects.map((p) => {
                const isSelected = p.id === selectedProjectId;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProjectId(p.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 shadow-sm"
                        : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">
                        {p.title}
                      </h3>
                      <Badge tone={p.status === "ACTIVE" ? "success" : "neutral"} className="shrink-0 text-[10px]">
                        {p.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                      {p.description || "No description provided."}
                    </p>
                    <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-400">
                      <span>{p.hypothesis_count} Hypotheses</span>
                      <span>•</span>
                      <span>{p.finding_count} Findings</span>
                      {p.target_states.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="font-mono">{p.target_states.join(", ")}</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Project Dossier Detail */}
        <div className="lg:col-span-8 space-y-6">
          {detailLoading ? (
            <PageLoading />
          ) : !projectDetail ? (
            <Card className="p-12 text-center text-slate-500">
              Select or create a research project to inspect its hypothesis dossier.
            </Card>
          ) : (
            <>
              {/* Project Header Banner */}
              <Card className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white border-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge tone="indigo" className="bg-white/20 text-white border-white/30">
                        {projectDetail.status}
                      </Badge>
                      <span className="text-xs text-indigo-200 font-mono">ID: {projectDetail.id.slice(0, 8)}</span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold mt-1.5">{projectDetail.title}</h2>
                    <p className="text-xs sm:text-sm text-indigo-200/90 mt-1 max-w-2xl">
                      {projectDetail.description || "Empirical research project."}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setNewHypoModal(true)}
                      className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Hypothesis
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setNewFindingModal(true)}
                      className="bg-indigo-500 hover:bg-indigo-400 text-white border-0 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Record Finding
                    </Button>
                  </div>
                </div>
              </Card>

              {/* 1. Hypotheses Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-indigo-500" />
                    Formulated Hypotheses ({projectDetail.hypotheses.length})
                  </h3>
                </div>

                {projectDetail.hypotheses.length === 0 ? (
                  <Card className="p-6 text-center text-xs text-slate-500">
                    No hypotheses formulated for this project yet. Formulate one to guide empirical testing.
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {projectDetail.hypotheses.map((h, idx) => (
                      <Card key={h.id} className="p-4 border-l-4 border-l-indigo-500">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                H{idx + 1}
                              </span>
                              <Badge tone={getStatusBadgeTone(h.status)} className="text-[10px]">
                                {h.status}
                              </Badge>
                              <span className="text-[11px] text-slate-400">
                                Scope: {h.geographic_scope} ({h.geographic_target})
                              </span>
                            </div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              {h.statement}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                              {(h.confidence_score * 100).toFixed(0)}% Confidence
                            </span>
                          </div>
                        </div>

                        {h.target_metrics.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                            <span className="font-semibold text-slate-600 dark:text-slate-400">Target Metrics:</span>
                            {h.target_metrics.map((m) => (
                              <span key={m} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">
                                {m}
                              </span>
                            ))}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Research Findings & 7-Stage Lifecycle Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-emerald-500" />
                    Empirical Research Findings ({projectDetail.findings.length})
                  </h3>
                  <span className="text-xs text-slate-400">7-Stage Lifecycle Enforced</span>
                </div>

                {projectDetail.findings.length === 0 ? (
                  <Card className="p-6 text-center text-xs text-slate-500">
                    No empirical findings recorded. Record observations from public data and market trends above.
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {projectDetail.findings.map((f) => (
                      <Card
                        key={f.id}
                        className={`p-4 transition-all hover:border-indigo-400 cursor-pointer ${
                          f.status === "NEEDS_REASSESSMENT"
                            ? "border-amber-400 dark:border-amber-700 bg-amber-50/20"
                            : ""
                        }`}
                        onClick={() => setActiveFinding(f)}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge tone={getStatusBadgeTone(f.status)} className="text-[10px]">
                                {f.status}
                              </Badge>
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                                {f.category}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                Method: <span className="font-mono text-slate-600 dark:text-slate-300">{f.calculation_method}</span>
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">{f.title}</h4>
                            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{f.statement}</p>
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1 shrink-0">
                            <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                              {(f.confidence_score * 100).toFixed(0)}% Conf.
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {f.sample_size} Samples ({f.data_coverage_pct.toFixed(0)}% Cov.)
                            </span>
                          </div>
                        </div>

                        {f.contradictory_evidence && (
                          <div className="mt-2.5 p-2 bg-amber-100/70 dark:bg-amber-950/60 rounded border border-amber-300 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <span>
                              <strong>Counter-Evidence:</strong> {f.contradictory_evidence}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                          <span>
                            {f.evidence_references.length} Evidence References Attached
                          </span>
                          <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                            Inspect Finding & Audit Trail <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Finding Detail & Lifecycle Review Drawer / Modal */}
      {activeFinding && (
        <Modal
          open={Boolean(activeFinding)}
          onClose={() => setActiveFinding(null)}
          title={`Finding Dossier: ${activeFinding.title}`}
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <div>
                <span className="text-xs text-slate-400">Current Lifecycle Status</span>
                <div className="mt-0.5">
                  <Badge tone={getStatusBadgeTone(activeFinding.status)}>{activeFinding.status}</Badge>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Confidence & Coverage</span>
                <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                  {(activeFinding.confidence_score * 100).toFixed(0)}% | {activeFinding.sample_size} Observations
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Core Empirical Statement</h4>
              <p className="text-sm text-slate-800 dark:text-slate-200 mt-1 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800">
                {activeFinding.statement}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                <span className="font-semibold text-slate-500">Methodology:</span>
                <p className="font-mono mt-0.5">{activeFinding.calculation_method}</p>
              </div>
              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                <span className="font-semibold text-slate-500">Next Recommended Step:</span>
                <p className="mt-0.5 text-slate-700 dark:text-slate-300">{activeFinding.recommended_next_step || "Standard monitoring"}</p>
              </div>
            </div>

            {/* Evidence References */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Attached Evidence Records ({activeFinding.evidence_references.length})
              </h4>
              {activeFinding.evidence_references.length === 0 ? (
                <p className="text-xs text-slate-500 italic mt-1">No direct evidence references attached yet.</p>
              ) : (
                <div className="space-y-1.5 mt-1.5">
                  {activeFinding.evidence_references.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">{ev.source_name}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800">
                            {ev.source_type}
                          </span>
                          {ev.is_contradictory && (
                            <Badge tone="danger" className="text-[9px]">Counter-Evidence</Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {ev.source_uri || "Data Lake Reference"} • {ev.sample_count} samples • {ev.verification_status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Audit History */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Audit Trail & Review History ({activeFinding.review_history.length})
              </h4>
              <div className="space-y-2 mt-1.5">
                {activeFinding.review_history.map((rh) => (
                  <div key={rh.id} className="p-2 rounded bg-slate-50 dark:bg-slate-800/40 text-[11px] border border-slate-200/50 dark:border-slate-800">
                    <div className="flex items-center justify-between text-slate-500">
                      <span><strong>{rh.reviewer_email}</strong>: {rh.previous_status} → {rh.new_status}</span>
                      <span>{rh.created_at ? new Date(rh.created_at).toLocaleDateString() : ""}</span>
                    </div>
                    {rh.review_notes && <p className="mt-1 text-slate-700 dark:text-slate-300">{rh.review_notes}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Lifecycle Transition Actions */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setFindingReviewModal(true);
                  setNextLifecycleStatus("VALIDATED");
                }}
              >
                Transition Lifecycle Stage...
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setActiveFinding(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Lifecycle Review Modal */}
      {findingReviewModal && activeFinding && (
        <Modal
          open={findingReviewModal}
          onClose={() => setFindingReviewModal(false)}
          title={`Review Finding: ${activeFinding.title}`}
        >
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                New Lifecycle Status
              </label>
              <select
                value={nextLifecycleStatus}
                onChange={(e) => setNextLifecycleStatus(e.target.value)}
                className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              >
                <option value="UNDER_INVESTIGATION">UNDER_INVESTIGATION</option>
                <option value="EVIDENCE_REVIEWED">EVIDENCE_REVIEWED</option>
                <option value="VALIDATED">VALIDATED</option>
                <option value="NEEDS_REASSESSMENT">NEEDS_REASSESSMENT</option>
                <option value="SUPERSEDED">SUPERSEDED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Review Notes</label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={2}
                placeholder="Audit observation notes..."
                className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Rationale</label>
              <textarea
                value={reviewRationale}
                onChange={(e) => setReviewRationale(e.target.value)}
                rows={2}
                placeholder="Methodological reasoning for transition..."
                className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setFindingReviewModal(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleTransitionLifecycle}>
                Commit Status Transition
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* New Research Project Modal */}
      {newProjectModal && (
        <Modal
          open={newProjectModal}
          onClose={() => setNewProjectModal(false)}
          title="Create New Research Project"
        >
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Project Title</label>
              <Input
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="e.g. Mid-Atlantic Market Entry Feasibility"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Target States</label>
              <Input
                value={projectStates}
                onChange={(e) => setProjectStates(e.target.value)}
                placeholder="Comma separated: FL, PA, OH"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Research Scope & Objectives</label>
              <textarea
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
                rows={3}
                placeholder="Define empirical inquiry bounds, comparison cohorts, and decision thresholds..."
                className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setNewProjectModal(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreateProject}>
                Create Project
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* New Hypothesis Modal */}
      {newHypoModal && (
        <Modal
          open={newHypoModal}
          onClose={() => setNewHypoModal(false)}
          title="Formulate Research Hypothesis"
        >
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Hypothesis Statement</label>
              <textarea
                value={hypoStatement}
                onChange={(e) => setHypoStatement(e.target.value)}
                rows={3}
                placeholder="e.g. In markets with over 50 dispensaries, doctor outreach increases monthly bookings by >20%..."
                className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Scope</label>
                <select
                  value={hypoScope}
                  onChange={(e) => setHypoScope(e.target.value)}
                  className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                >
                  <option value="NATIONAL">NATIONAL</option>
                  <option value="STATE">STATE</option>
                  <option value="COUNTY">COUNTY</option>
                  <option value="ZIP">ZIP</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Target Region</label>
                <Input value={hypoTarget} onChange={(e) => setHypoTarget(e.target.value)} placeholder="FL, PA, etc." />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Target Metrics</label>
              <Input
                value={hypoMetrics}
                onChange={(e) => setHypoMetrics(e.target.value)}
                placeholder="conversion_rate, booking_velocity"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setNewHypoModal(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreateHypothesis}>
                Save Hypothesis
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* New Finding Modal */}
      {newFindingModal && (
        <Modal
          open={newFindingModal}
          onClose={() => setNewFindingModal(false)}
          title="Record Empirical Finding"
        >
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Finding Title</label>
              <Input
                value={findingTitle}
                onChange={(e) => setFindingTitle(e.target.value)}
                placeholder="e.g. Florida Telehealth Margin Compression"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Empirical Statement</label>
              <textarea
                value={findingStatement}
                onChange={(e) => setFindingStatement(e.target.value)}
                rows={3}
                placeholder="Detailed finding backed by underlying observed records..."
                className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Category</label>
                <select
                  value={findingCat}
                  onChange={(e) => setFindingCat(e.target.value)}
                  className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                >
                  <option value="OPPORTUNITY">OPPORTUNITY</option>
                  <option value="COMPETITOR">COMPETITOR</option>
                  <option value="PRICING">PRICING</option>
                  <option value="GEOGRAPHY">GEOGRAPHY</option>
                  <option value="REGULATORY">REGULATORY</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Analytical Method</label>
                <select
                  value={findingMethod}
                  onChange={(e) => setFindingMethod(e.target.value)}
                  className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                >
                  <option value="TIME_SERIES_OLS">TIME_SERIES_OLS</option>
                  <option value="DESCRIPTIVE_AGGREGATE">DESCRIPTIVE_AGGREGATE</option>
                  <option value="CORRELATION_ANALYSIS">CORRELATION_ANALYSIS</option>
                  <option value="CHANGE_POINT_TEST">CHANGE_POINT_TEST</option>
                  <option value="WELCH_T_TEST">WELCH_T_TEST</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setNewFindingModal(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreateFinding}>
                Record Finding
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Dossier Export Modal */}
      {dossierModal && (
        <Modal
          open={dossierModal}
          onClose={() => setDossierModal(false)}
          title="Exported Research Dossier (Markdown)"
        >
          <div className="space-y-4">
            <textarea
              readOnly
              value={dossierMarkdown}
              rows={15}
              className="w-full p-3 font-mono text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Traceable evidence dossier adhering to Zero-PHI compliance.</span>
              <Button
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(dossierMarkdown);
                  alert("Markdown copied to clipboard!");
                }}
              >
                Copy Markdown
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
