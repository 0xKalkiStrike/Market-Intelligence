"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Star, ThumbsUp, ThumbsDown, AlertCircle } from "lucide-react";
import { API_BASE } from "@/lib/api";

interface ReviewIntel {
  id: string;
  entity_name: string;
  entity_type: string;
  overall_rating: number | null;
  total_reviews: number | null;
  source_name: string;
  themes: Array<{
    theme_category: string;
    sentiment: string;
    mention_count: number;
    summary_text: string;
  }>;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewIntel[]>([]);
  const [loading, setLoading] = useState(true);


  async function fetchReviews() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/market-intelligence/reviews/intelligence`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReviews();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-indigo-400" /> Public Review Intelligence & Sentiment
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Surface-web customer review aggregation and theme classification across market competitors.
          </p>
        </div>
      </div>

      {/* Cards */}
      <div className="grid gap-5 md:grid-cols-2">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">{r.entity_name}</h3>
                <span className="text-[11px] text-slate-400">{r.entity_type} • {r.source_name}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-amber-950/40 border border-amber-800 px-3 py-1 rounded-lg">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="font-bold text-amber-300 text-sm">{r.overall_rating?.toFixed(1) || "N/A"}</span>
                <span className="text-[10px] text-slate-400">({r.total_reviews || 0})</span>
              </div>
            </div>

            {/* Themes */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-semibold text-slate-300">Extracted Review Themes</h4>
              <div className="grid gap-2">
                {r.themes.map((t, idx) => (
                  <div key={idx} className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-indigo-300">{t.theme_category}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          t.sentiment === "POSITIVE"
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                            : t.sentiment === "NEGATIVE"
                            ? "bg-rose-950 text-rose-300 border border-rose-800"
                            : "bg-amber-950 text-amber-300 border border-amber-800"
                        }`}
                      >
                        {t.sentiment}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px]">{t.summary_text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
