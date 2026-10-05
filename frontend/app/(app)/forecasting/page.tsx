"use client";

import { useEffect, useState } from "react";
import { TrendingUp, RefreshCw, BarChart2, ShieldCheck, Cpu } from "lucide-react";
import { api } from "@/lib/api";

export default function ForecastingPage() {
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [metricName, setMetricName] = useState("APPOINTMENT_VOLUME");
  const [horizonDays, setHorizonDays] = useState("30");
  const [modelType, setModelType] = useState("SEASONAL");
  const [stateCode, setStateCode] = useState("FL");

  const loadData = async () => {
    setLoading(true);
    try {
      const [resF, resE] = await Promise.all([
        api.get<any[]>("/api/phase4/forecasts"),
        api.get<any[]>("/api/phase4/forecasts/evaluations")
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
        model_type: modelType
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Multi-Horizon Forecasting Engine</h1>
          <p className="text-xs text-slate-400 mt-1">
            Predictive modeling across 7d, 30d, 90d, 6m, and 12m horizons with backtesting performance evaluations
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Forecasts
        </button>
      </div>

      {/* Generator Form */}
      <form onSubmit={handleGenerateForecast} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Cpu className="h-4 w-4 text-indigo-400" />
          Run Mathematical Forecast Simulation
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Target Metric</label>
            <select
              value={metricName}
              onChange={(e) => setMetricName(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-1.5 text-xs text-white"
            >
              <option value="APPOINTMENT_VOLUME">Appointment Volume</option>
              <option value="REVENUE">MMJ Revenue Aggregate</option>
              <option value="PHYSICIAN_CAPACITY">Physician Capacity</option>
              <option value="DISPENSARY_GROWTH">Dispensary Growth</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Forecast Horizon</label>
            <select
              value={horizonDays}
              onChange={(e) => setHorizonDays(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-1.5 text-xs text-white"
            >
              <option value="7">7 Days</option>
              <option value="30">30 Days</option>
              <option value="90">90 Days</option>
              <option value="180">6 Months (180d)</option>
              <option value="365">12 Months (365d)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Model Architecture</label>
            <select
              value={modelType}
              onChange={(e) => setModelType(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-1.5 text-xs text-white"
            >
              <option value="SEASONAL">Seasonal Trend Engine</option>
              <option value="TREND_LINEAR">Linear Trend Model</option>
              <option value="MOVING_AVERAGE">Moving Average Model</option>
              <option value="BASELINE">Historical Baseline</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">State Target</label>
            <input
              type="text"
              value={stateCode}
              onChange={(e) => setStateCode(e.target.value.toUpperCase())}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-1.5 text-xs text-white"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            Generate Mathematical Forecast
          </button>
        </div>
      </form>

      {/* Forecast List */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-indigo-400" />
          Active Forecast Output History
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {forecasts.map((f: any) => (
            <div key={f.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300">{f.metric_name} ({f.state})</span>
                <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                  {f.horizon_days}d Horizon
                </span>
              </div>
              <div className="flex items-baseline justify-between border-y border-slate-800/80 py-2">
                <span className="text-xl font-extrabold text-white">
                  {typeof f.forecast_value === "number" ? f.forecast_value.toLocaleString() : f.forecast_value}
                </span>
                <span className="text-xs text-slate-400">
                  Range: <span className="text-slate-200 font-mono">{f.expected_range_min?.toLocaleString()} - {f.expected_range_max?.toLocaleString()}</span>
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{f.explanation}</p>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>Model: {f.model_name}</span>
                <span className="font-semibold text-indigo-400">{f.confidence} Confidence</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
