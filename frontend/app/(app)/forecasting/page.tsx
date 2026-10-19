"use client";

import { useEffect, useState } from "react";
import { TrendingUp, RefreshCw, Cpu, Sparkles, Calendar, DollarSign, History } from "lucide-react";
import { api } from "@/lib/api";

interface ForecastItem {
  id: string;
  metric_name: string;
  state: string;
  horizon_days: number;
  forecast_period?: string;
  forecast_value: number | string;
  expected_range_min?: number;
  expected_range_max?: number;
  historical_period?: string;
  data_points_used?: number;
  explanation: string;
  model_name: string;
  confidence: string;
}

export default function ForecastingPage() {
  const [forecasts, setForecasts] = useState<ForecastItem[]>([]);
  const [, setEvaluations] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  const [metricName, setMetricName] = useState("APPOINTMENT_VOLUME");
  const [horizonDays, setHorizonDays] = useState("30");
  const [modelType, setModelType] = useState("SEASONAL");
  const [stateCode, setStateCode] = useState("FL");

  const loadData = async () => {
    setLoading(true);
    try {
      const [resF, resE] = await Promise.all([
        api.get<ForecastItem[]>("/api/phase4/forecasts"),
        api.get<unknown[]>("/api/phase4/forecasts/evaluations"),
      ]);
      setForecasts(resF);
      setEvaluations(resE);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateForecast = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/phase4/forecasts", {
        metric_name: metricName,
        state: stateCode,
        horizon_days: parseInt(horizonDays, 10),
        model_type: modelType,
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200/80 dark:border-[#29354b] pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold tracking-wide mb-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            Predictive Simulation Engine
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-indigo-500" />
            Multi-Horizon Forecasting Engine
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Predictive modeling across 7d, 30d, 90d, 6m, 12m horizons, plus All Time lifetime market accrual from inception to present.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-[#151e32] border border-slate-200/80 dark:border-[#29354b] px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1c2740] shadow-sm transition-colors self-start md:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-indigo-500" : ""}`} />
          Refresh Forecasts
        </button>
      </div>

      {/* Generator Form */}
      <form onSubmit={handleGenerateForecast} className="rounded-xl border border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#151e32] p-5 space-y-4 shadow-sm">
        <h2 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Cpu className="h-4 w-4 text-indigo-500" />
          Run Mathematical Forecast Simulation
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">Target Metric</label>
            <select
              value={metricName}
              onChange={(e) => setMetricName(e.target.value)}
              className="w-full rounded-lg bg-slate-50 dark:bg-[#10172a] border border-slate-200 dark:border-[#29354b] px-3 py-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="APPOINTMENT_VOLUME">Appointment Volume</option>
              <option value="REVENUE">MMJ Revenue Aggregate</option>
              <option value="PHYSICIAN_CAPACITY">Physician Capacity</option>
              <option value="DISPENSARY_GROWTH">Dispensary Growth</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">Forecast Horizon</label>
            <select
              value={horizonDays}
              onChange={(e) => setHorizonDays(e.target.value)}
              className="w-full rounded-lg bg-slate-50 dark:bg-[#10172a] border border-slate-200 dark:border-[#29354b] px-3 py-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="0">All Time (Lifetime Inception to Present)</option>
              <option value="7">7 Days</option>
              <option value="30">30 Days</option>
              <option value="90">90 Days</option>
              <option value="180">6 Months (180d)</option>
              <option value="365">12 Months (365d)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">Model Architecture</label>
            <select
              value={modelType}
              onChange={(e) => setModelType(e.target.value)}
              className="w-full rounded-lg bg-slate-50 dark:bg-[#10172a] border border-slate-200 dark:border-[#29354b] px-3 py-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="SEASONAL">Seasonal Trend Engine</option>
              <option value="TREND_LINEAR">Linear Trend Model</option>
              <option value="MOVING_AVERAGE">Moving Average Model</option>
              <option value="BASELINE">Historical Baseline</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">State Target</label>
            <input
              type="text"
              value={stateCode}
              onChange={(e) => setStateCode(e.target.value.toUpperCase())}
              className="w-full rounded-lg bg-slate-50 dark:bg-[#10172a] border border-slate-200 dark:border-[#29354b] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-mono uppercase focus:outline-none focus:border-indigo-500"
              placeholder="e.g. FL, PA, CA"
            />
          </div>
        </div>

        {/* Dynamic Context Banner when All Time is selected */}
        {horizonDays === "0" && (
          <div className="flex items-start gap-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/20 p-3 text-xs text-emerald-800 dark:text-emerald-300">
            <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">Lifetime Inception Tracking Active:</span> Computes cumulative lifetime metrics and total gross revenue from market inception up to the present day ({new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}).
            </div>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            {horizonDays === "0" ? <Sparkles className="h-3.5 w-3.5 text-emerald-300" /> : <Cpu className="h-3.5 w-3.5" />}
            {horizonDays === "0" ? "Calculate Lifetime Metrics" : "Generate Forecast"}
          </button>
        </div>
      </form>

      {/* Forecast List */}
      <div className="space-y-3.5">
        <h2 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <History className="h-4 w-4 text-indigo-500" />
          Active Forecast Output History
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {forecasts.map((f) => {
            const isAllTime = f.horizon_days === 0 || f.forecast_period?.toLowerCase().includes("all time");
            const isRevenue = f.metric_name === "REVENUE";

            return (
              <div
                key={f.id}
                className={`rounded-xl border p-4 space-y-3 transition-colors shadow-sm ${
                  isAllTime
                    ? "border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/15"
                    : "border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#151e32]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">{f.metric_name} ({f.state})</span>
                    {isRevenue && (
                      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center">
                        <DollarSign className="h-3 w-3" /> Financial
                      </span>
                    )}
                  </div>
                  {isAllTime ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md font-semibold">
                      <Sparkles className="h-3 w-3 text-emerald-500" />
                      All Time (Inception → Present)
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200/70 dark:border-slate-700">
                      {f.horizon_days}d Horizon
                    </span>
                  )}
                </div>

                <div className="flex items-baseline justify-between border-y border-slate-100 dark:border-slate-800/60 py-2.5">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight tabular-nums">
                        {isRevenue && typeof f.forecast_value === "number"
                          ? `$${f.forecast_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : typeof f.forecast_value === "number"
                          ? f.forecast_value.toLocaleString()
                          : f.forecast_value}
                      </span>
                      {isAllTime && (
                        <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Lifetime
                        </span>
                      )}
                    </div>
                    {isAllTime && f.historical_period && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="h-3 w-3" />
                        {f.historical_period}
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block tabular-nums">
                      Range:{" "}
                      <span className="text-slate-700 dark:text-slate-200 font-medium">
                        {isRevenue
                          ? `$${f.expected_range_min?.toLocaleString()} - $${f.expected_range_max?.toLocaleString()}`
                          : `${f.expected_range_min?.toLocaleString()} - ${f.expected_range_max?.toLocaleString()}`}
                      </span>
                    </span>
                    {isAllTime && f.data_points_used && (
                      <span className="text-[10px] text-slate-400 block tabular-nums font-mono">
                        {f.data_points_used.toLocaleString()} Active Days Tracked
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">{f.explanation}</p>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                  <span>Model: {f.model_name}</span>
                  <span className={`font-semibold ${isAllTime ? "text-emerald-600 dark:text-emerald-400" : "text-indigo-600 dark:text-indigo-400"}`}>
                    {f.confidence} Confidence
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
