"use client";

import { FormEvent, useEffect, useState } from "react";
import { ShoppingCart, Store, ShoppingBag, Target, Package, Globe, Zap, RefreshCw, type LucideIcon } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { SourceItem } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { PageLoading } from "@/components/ui/Spinner";

const getSourceIcon = (name: string): LucideIcon => {
  const n = name.toLowerCase();
  if (n.includes("amazon")) return ShoppingCart;
  if (n.includes("walmart")) return Store;
  if (n.includes("bestbuy")) return ShoppingBag;
  if (n.includes("target")) return Target;
  if (n.includes("ebay")) return Package;
  return Globe;
};

export default function SourcesPage() {
  const [sources, setSources] = useState<SourceItem[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState("marketplace");
  const [baseUrl, setBaseUrl] = useState("");
  const [syncFrequency, setSyncFrequency] = useState("hourly");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadSources = async () => {
    try {
      const data = await api.get<SourceItem[]>("/api/sources").catch(() => []);
      setSources(data || []);
    } catch {
      setSources([]);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const src = await api.post<SourceItem>("/api/sources", {
        name,
        source_type: sourceType,
        base_url: baseUrl,
        sync_frequency: syncFrequency,
        is_active: true,
      });
      setSources((prev) => [src, ...(prev ?? [])]);
      setName("");
      setBaseUrl("");
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add source");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (source: SourceItem) => {
    try {
      const updated = await api.patch<SourceItem>(`/api/sources/${source.id}`, {
        is_active: !source.is_active,
      });
      setSources((prev) => prev?.map((s) => (s.id === source.id ? updated : s)) ?? []);
    } catch {
      alert("Failed to update source state");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this target source? Products will no longer be monitored against it.")) return;
    try {
      await api.delete(`/api/sources/${id}`);
      setSources((prev) => prev?.filter((s) => s.id !== id) ?? []);
    } catch {
      alert("Failed to delete source");
    }
  };

  if (!sources) return <PageLoading />;

  const activeCount = sources.filter((s) => s.is_active).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-200 sm:text-2xl">
            Target Sources & Marketplace Integrations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Configure target marketplace sites (Amazon, Walmart, BestBuy, eBay) where uploaded Excel products are monitored.
          </p>
        </div>
        <Button variant="gradient" onClick={() => setModalOpen(true)}>
          + Add Target Source
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Sources</span>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-200 mt-0.5">{sources.length}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600">
            <Globe className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Monitoring</span>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">{activeCount}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
            <Zap className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Sync Engine Rate</span>
            <p className="text-2xl font-black text-indigo-600 mt-0.5">Real-time / Hourly</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600">
            <RefreshCw className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Sources Grid */}
      {sources.length === 0 ? (
        <Card>
          <CardBody className="py-16 text-center">
            <div className="max-w-md mx-auto flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600">
                <Store className="h-7 w-7" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-200">No Target Sources Configured</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Add target marketplace sites (e.g. Amazon, Walmart, Target, eBay, BestBuy) so the system can automatically monitor and compare products uploaded via Excel sheets across all your target sources!
              </p>
              <Button variant="gradient" className="mt-2" onClick={() => setModalOpen(true)}>
                Add Your First Source Site
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sources.map((s) => {
            const SourceIcon = getSourceIcon(s.name);
            return (
              <Card key={s.id} className="hover:border-indigo-200 transition-all group">
                <CardBody className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 shrink-0">
                        <SourceIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 dark:text-slate-200 text-base">{s.name}</h3>
                        <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-[150px]">{s.base_url || "No Base URL"}</p>
                      </div>
                    </div>
                    <Badge tone={s.is_active ? "success" : "neutral"}>
                      {s.is_active ? "Active" : "Disabled"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/80 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Type</span>
                      <span className="font-bold text-slate-800 dark:text-slate-300 capitalize">{s.source_type}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Sync Rate</span>
                      <span className="font-bold text-slate-800 dark:text-slate-300 capitalize">{s.sync_frequency}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-3 mt-1">
                    <button
                      onClick={() => handleToggleActive(s)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                    >
                      {s.is_active ? "Disable Monitoring" : "Enable Monitoring"}
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                    >
                      Remove Site
                    </button>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Source Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Target Source Site">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          {error && <Alert tone="danger">{error}</Alert>}
          <Input
            label="Site / Source Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Amazon US, Walmart, BestBuy"
          />
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Source Integration Type</label>
            <select
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
            >
              <option value="marketplace">Marketplace Integration</option>
              <option value="web_scraper">Web Scraper</option>
              <option value="custom_api">Custom API Endpoint</option>
            </select>
          </div>
          <Input
            label="Base Domain / URL"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://amazon.com"
          />
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Monitoring Sync Frequency</label>
            <select
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              value={syncFrequency}
              onChange={(e) => setSyncFrequency(e.target.value)}
            >
              <option value="hourly">Hourly Sync</option>
              <option value="daily">Daily Sync</option>
              <option value="realtime">Real-time (15 mins)</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="gradient" isLoading={submitting}>
              Save Source Site
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

