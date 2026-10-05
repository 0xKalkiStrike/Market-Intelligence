"use client";

import { useEffect, useState } from "react";
import { FileCheck, CheckCircle2, MessageSquare, ThumbsUp, ThumbsDown } from "lucide-react";

export default function ManagementQueuePage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/phase4/management-queue");
      if (res.ok) setItems(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFeedback = async (id: string, type: string, feedback: string) => {
    try {
      await fetch("http://localhost:8000/api/phase4/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_type: type, target_id: id, feedback })
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-white">Management Review Queue & Continuous Learning Loop</h1>
        <p className="text-xs text-slate-400 mt-1">
          High-priority items requiring human management evaluation and explicit review feedback
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <FileCheck className="h-4 w-4 text-purple-400" />
          Pending Review Items ({items.length})
        </h2>
        <div className="space-y-3">
          {items.map((item: any) => (
            <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">{item.title} ({item.state})</span>
                <span className="text-[10px] bg-purple-950 text-purple-300 px-2 py-0.5 rounded font-mono">
                  {item.item_type}
                </span>
              </div>
              <p className="text-xs text-slate-300">{item.evidence}</p>
              <div className="text-[11px] text-indigo-300 bg-indigo-950/40 p-2.5 rounded border border-indigo-900/40 font-mono">
                <strong>Suggested Review Action:</strong> {item.suggested_review_step}
              </div>
              <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
                <button
                  onClick={() => handleFeedback(item.id, item.item_type, "USEFUL")}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  <ThumbsUp className="h-3.5 w-3.5" /> Mark Useful
                </button>
                <button
                  onClick={() => handleFeedback(item.id, item.item_type, "NOT_USEFUL")}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-400 transition-colors"
                >
                  <ThumbsDown className="h-3.5 w-3.5" /> False Positive
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
