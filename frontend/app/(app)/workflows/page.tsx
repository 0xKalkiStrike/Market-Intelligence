"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, FileCheck, Layers, Play, ShieldAlert, Sparkles } from "lucide-react";
import { api } from "@/lib/api";

interface Workflow {
  id: string;
  name: string;
  trigger_type: string;
  condition: unknown;
  requires_approval: boolean;
}

interface ApprovalGate {
  id: string;
  action_title: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  description: string;
  proposed_action: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [approvals, setApprovals] = useState<ApprovalGate[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resW, resA] = await Promise.all([
        api.get<Workflow[]>("/api/phase4/workflows"),
        api.get<ApprovalGate[]>("/api/phase4/approvals")
      ]);
      setWorkflows(resW);
      setApprovals(resA);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReviewApproval = async (id: string, action: "APPROVE" | "REJECT") => {
    try {
      await api.post("/api/phase4/approvals/review", {
        approval_id: id,
        action,
        reviewer: "Executive Manager",
        notes: `Explicit human decision to ${action.toLowerCase()} consequential action.`
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-white">Automated Intelligence Workflows & Human Approval Gates</h1>
        <p className="text-xs text-slate-400 mt-1">
          Strict Governance Framework: AI triggers workflow intelligence; human management retains exclusive authority over consequential business actions
        </p>
      </div>

      {/* Human Approval Gates Section */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <FileCheck className="h-4 w-4 text-purple-400" />
          Pending Human Approval Gates ({approvals.filter(a => a.status === "PENDING").length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {approvals.map((app) => (
            <div key={app.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{app.action_title}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                  app.status === "PENDING" ? "bg-amber-950 text-amber-300 border border-amber-800/50" :
                  app.status === "APPROVED" ? "bg-emerald-950 text-emerald-300" : "bg-red-950 text-red-300"
                }`}>
                  {app.status}
                </span>
              </div>
              <p className="text-xs text-slate-300">{app.description}</p>
              <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded border border-slate-800 font-mono">
                {app.proposed_action}
              </div>
              {app.status === "PENDING" ? (
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => handleReviewApproval(app.id, "APPROVE")}
                    className="flex-1 flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve Action
                  </button>
                  <button
                    onClick={() => handleReviewApproval(app.id, "REJECT")}
                    className="flex-1 flex items-center justify-center gap-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 text-xs font-semibold py-1.5 px-3 rounded-lg border border-red-500/30 transition-colors"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </button>
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 pt-1">
                  Reviewed by {app.reviewed_by} on {app.reviewed_at}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Workflows Templates */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Layers className="h-4 w-4 text-indigo-400" />
          Active Trigger-Condition-Action Workflows ({workflows.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {workflows.map((wf) => (
            <div key={wf.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300">{wf.name}</span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                  {wf.trigger_type}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 space-y-1">
                <div><strong>Condition:</strong> {JSON.stringify(wf.condition)}</div>
                <div><strong>Requires Approval:</strong> {wf.requires_approval ? "Yes (Mandatory)" : "No"}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
