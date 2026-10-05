"use client";

import { FormEvent, useEffect, useState } from "react";
import { Folder, FileText, BarChart3 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Product, Project, SourceItem } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { PageLoading } from "@/components/ui/Spinner";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Add Product Form state
  const [projectId, setProjectId] = useState("");
  const [sku, setSku] = useState("");
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Excel Upload state
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [uploadProjectId, setUploadProjectId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  // Monitoring state
  const [monitoringId, setMonitoringId] = useState<string | null>(null);
  const [runningBulkSync, setRunningBulkSync] = useState(false);

  const loadData = async () => {
    try {
      const [prods, projs, srcs] = await Promise.all([
        api.get<Product[]>("/api/products").catch(() => []),
        api.get<Project[]>("/api/projects").catch(() => []),
        api.get<SourceItem[]>("/api/sources").catch(() => []),
      ]);
      setProducts(prods || []);
      setProjects(projs || []);
      setSources(srcs || []);
      if (projs && projs.length > 0) {
        setProjectId(projs[0].id);
        setUploadProjectId(projs[0].id);
      }
      if (prods && prods.some((p) => p.status === "pending")) {
        api.post("/api/monitoring/run-all").then(() => {
          api.get<Product[]>("/api/products").then((updated) => setProducts(updated || []));
        });
      }
    } catch {
      setProducts([]);
      setProjects([]);
      setSources([]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunAllMonitoring = async () => {
    setRunningBulkSync(true);
    try {
      await api.post("/api/monitoring/run-all");
      await loadData();
    } catch (err: any) {
      alert(err instanceof ApiError ? err.message : "Failed to run bulk monitoring.");
    } finally {
      setRunningBulkSync(false);
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const newProd = await api.post<Product>("/api/products", {
        project_id: projectId,
        sku,
        title,
        brand,
        category,
        current_price: currentPrice ? parseFloat(currentPrice) : null,
        target_price: targetPrice ? parseFloat(targetPrice) : null,
      });
      setProducts((prev) => [newProd, ...(prev ?? [])]);
      setSku("");
      setTitle("");
      setBrand("");
      setCategory("");
      setCurrentPrice("");
      setTargetPrice("");
      setModalOpen(false);
      loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create product");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExcelUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!excelFile) {
      setError("Please select an Excel (.xlsx, .xls) or CSV file to upload.");
      return;
    }
    setError(null);
    setUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("project_id", uploadProjectId);
      formData.append("file", excelFile);

      const result = await api.upload<any>("/api/products/upload-excel", formData);
      setUploadResult(result);
      setExcelFile(null);
      await loadData();
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : err.message || "Failed to upload Excel sheet");
    } finally {
      setUploading(false);
    }
  };

  const handleRunMonitoring = async (productId: string) => {
    setMonitoringId(productId);
    try {
      await api.post(`/api/products/${productId}/monitor`);
      await loadData();
      if (selectedProduct && selectedProduct.id === productId) {
        const updated = await api.get<Product>(`/api/products/${productId}`);
        setSelectedProduct(updated);
      }
    } catch (err: any) {
      alert(err instanceof ApiError ? err.message : "Failed to run monitoring. Make sure active sources exist.");
    } finally {
      setMonitoringId(null);
    }
  };

  const handleViewDetail = async (product: Product) => {
    try {
      const fullProduct = await api.get<Product>(`/api/products/${product.id}`);
      setSelectedProduct(fullProduct);
      setDetailModalOpen(true);
    } catch {
      setSelectedProduct(product);
      setDetailModalOpen(true);
    }
  };

  const parseSpecs = (specs: any) => {
    if (!specs) return null;
    if (typeof specs === "object") return specs;
    try {
      return JSON.parse(specs);
    } catch {
      return { Details: specs };
    }
  };

  if (!products) return <PageLoading />;

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "verified" && p.status === "verified") ||
      (statusFilter === "pending" && p.status === "pending") ||
      (statusFilter === "failed" && p.status === "failed");

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-200 sm:text-2xl">
            Scraped Products Catalog
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Upload product Excel sheets and monitor full product details across configured target sources.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={handleRunAllMonitoring} isLoading={runningBulkSync}>
            Run Bulk Cross-Source Sync
          </Button>
          <Button variant="secondary" onClick={() => { setError(null); setUploadResult(null); setExcelModalOpen(true); }}>
            Upload Excel Sheet
          </Button>
          <Button variant="gradient" onClick={() => setModalOpen(true)}>
            + Add Single Product
          </Button>
        </div>
      </div>

      {/* Hero Active Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-5 text-white shadow-lg border border-slate-800 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-500/30">
            <Folder className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Cross-Source Monitoring Engine Active</h3>
            <p className="text-xs text-slate-300">
              {sources.length} Active Target Sources ({sources.map(s => s.name).join(", ") || "No sources added yet"})
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full font-bold border border-emerald-500/30">
            {products.length} Products Monitored
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search by Title, SKU, Brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {["all", "verified", "pending", "failed"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                statusFilter === status
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {status === "all" ? `All (${products.length})` : status}
            </button>
          ))}
        </div>
      </div>

      {/* Products Data Table */}
      <Card>
        <CardBody className="p-0 overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="border-b border-slate-200 dark:border-slate-800/60 bg-slate-50/80 dark:bg-slate-900/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3.5 min-w-[120px]">SKU / Model</th>
                <th className="px-4 py-3.5 min-w-[220px]">Product Title</th>
                <th className="px-4 py-3.5">Brand</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-300">Excel Base Price</th>
                <th className="px-4 py-3.5">Target Price</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right min-w-[220px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-slate-500 dark:text-slate-400">
                    <div className="max-w-md mx-auto flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-900/50">
                        <FileText className="h-6 w-6 text-slate-400" />
                      </div>
                      <p className="font-bold text-slate-800 dark:text-slate-300 text-base">No products match your filter</p>
                      <p className="text-xs text-slate-400">
                        Upload an Excel sheet (.xlsx, .csv) of scraped products to monitor and compare them across all your added target sources.
                      </p>
                      <Button className="mt-1" variant="indigo" onClick={() => setExcelModalOpen(true)}>
                        Upload Excel Sheet Now
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-slate-900 dark:text-slate-200">{p.sku}</td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-200">
                      <button
                        onClick={() => handleViewDetail(p)}
                        className="text-left font-bold text-slate-900 dark:text-slate-200 hover:text-indigo-600 transition-colors underline decoration-slate-300 underline-offset-2"
                      >
                        {p.title}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 font-semibold">{p.brand || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{p.category || "—"}</td>
                    <td className="px-4 py-3 font-extrabold text-slate-900 dark:text-slate-200 text-sm">
                      {p.current_price !== null ? `$${p.current_price.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {p.target_price !== null ? `$${p.target_price.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={p.status === "verified" ? "success" : p.status === "failed" ? "danger" : "warning"}>
                        {p.status === "verified" ? "Monitored" : p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleRunMonitoring(p.id)}
                          isLoading={monitoringId === p.id}
                        >
                          Sync Sources
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleViewDetail(p)}>
                          Details & Matrix
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {/* Upload Excel Sheet Modal */}
      <Modal open={excelModalOpen} onClose={() => setExcelModalOpen(false)} title="Upload Scraped Products Excel Sheet">
        <form onSubmit={handleExcelUpload} className="flex flex-col gap-4">
          {error && <Alert tone="danger">{error}</Alert>}
          {uploadResult && (
            <Alert tone="success">
              Successfully imported {uploadResult.filename}!
              <ul className="mt-1.5 text-xs list-disc list-inside space-y-0.5">
                <li>Created {uploadResult.created_products} new products</li>
                <li>Updated {uploadResult.updated_products} existing products</li>
                <li>Monitored & compared across {uploadResult.sources_monitored} active Target Sources</li>
                <li>Generated {uploadResult.comparisons_generated} cross-source comparison records</li>
              </ul>
            </Alert>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Target Project</label>
            <select
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              value={uploadProjectId}
              onChange={(e) => setUploadProjectId(e.target.value)}
            >
              <option value="">Default Scraped Products Project (Auto-created)</option>
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Excel or CSV File</label>
            <div className="mt-1 flex justify-center rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-800/60 px-6 py-8 bg-indigo-50/30 hover:bg-indigo-50/60 transition-colors cursor-pointer text-center relative group">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                required={!uploadResult}
              />
              <div className="space-y-2">
                <BarChart3 className="h-9 w-9 text-slate-400" />
                <div className="flex text-sm text-slate-600 dark:text-slate-400 justify-center">
                  <span className="font-bold text-slate-900 dark:text-slate-200 hover:text-indigo-600">
                    {excelFile ? excelFile.name : "Click or drag Excel / CSV file here"}
                  </span>
                </div>
                <p className="text-xs text-slate-400">Supports .xlsx, .xls, .csv files with SKU, Title, Brand, Price, GTIN headers.</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-300">Supported Sheet Columns:</span>
            <p className="font-mono text-[11px] text-slate-700 dark:text-slate-300">SKU, Title, Brand, Category, Price, Target Price, GTIN, URL, Specifications</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setExcelModalOpen(false)}>
              Close
            </Button>
            <Button type="submit" variant="gradient" isLoading={uploading}>
              Upload & Compare Products
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Single Product Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Product Manually">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          {error && <Alert tone="danger">{error}</Alert>}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Project</label>
            <select
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              required
            >
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.name}
                </option>
              ))}
            </select>
          </div>
          <Input label="SKU / Model Identifier" required value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. WH-1000XM5" />
          <Input label="Product Title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Wireless Noise Canceling Headphones" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Sony" />
            <Input label="Category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Audio" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Excel / Base Price ($)"
              type="number"
              step="0.01"
              value={currentPrice}
              onChange={(e) => setCurrentPrice(e.target.value)}
              placeholder="399.99"
            />
            <Input
              label="Target Price ($)"
              type="number"
              step="0.01"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="349.99"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="gradient" isLoading={submitting}>
              Add Product & Run Monitoring
            </Button>
          </div>
        </form>
      </Modal>

      {/* Whole Details & Cross-Source Comparison Modal */}
      {selectedProduct && (
        <Modal
          open={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title={`Whole Product Details & Cross-Source Comparisons: ${selectedProduct.sku}`}
        >
          <div className="flex flex-col gap-6 max-h-[75vh] overflow-y-auto pr-1 custom-scrollbar">
            {/* Excel Product Core Attributes Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-white shadow-md">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-indigo-400 mb-3">
                Excel Sheet Product Attributes
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div>
                  <span className="text-xs text-slate-400 block">Product Title</span>
                  <span className="font-bold text-white">{selectedProduct.title}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">SKU / Model</span>
                  <span className="font-mono text-indigo-300 font-bold">{selectedProduct.sku}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Brand & Category</span>
                  <span className="font-medium text-slate-200">{selectedProduct.brand || "—"} / {selectedProduct.category || "—"}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Excel Base Price</span>
                  <span className="font-black text-emerald-400 text-xl">
                    {selectedProduct.current_price !== null ? `$${selectedProduct.current_price.toFixed(2)}` : "—"}
                  </span>
                </div>
              </div>

              {selectedProduct.specifications && (
                <div className="mt-4 border-t border-slate-800 pt-3">
                  <span className="text-xs font-semibold text-slate-400 block mb-1">Parsed Specifications / Details:</span>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 max-h-36 overflow-y-auto custom-scrollbar">
                    <pre className="whitespace-pre-wrap">{typeof selectedProduct.specifications === 'string' ? selectedProduct.specifications : JSON.stringify(selectedProduct.specifications, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>

            {/* Cross-Source Monitored Sites Breakdown */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">
                  Monitored Comparisons Across Configured Sources ({selectedProduct.comparisons?.length || 0})
                </h3>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleRunMonitoring(selectedProduct.id)}
                  isLoading={monitoringId === selectedProduct.id}
                >
                  Refresh Comparisons
                </Button>
              </div>

              {!selectedProduct.comparisons || selectedProduct.comparisons.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800/60 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  No source comparisons recorded yet. Make sure you have added active sites in the <strong>Sources</strong> tab, then click Refresh Comparisons.
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedProduct.comparisons.map((comp) => {
                    const specsObj = parseSpecs(comp.specifications);
                    return (
                      <div key={comp.id} className="rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900 shadow-2xs p-4 sm:p-5 hover:border-slate-300 transition-colors">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="font-extrabold text-slate-900 dark:text-slate-200 text-base">{comp.source_name}</span>
                            <Badge tone={comp.match_status === "exact_match" ? "success" : comp.match_status === "price_alert" ? "danger" : "warning"}>
                              {comp.match_status.replace("_", " ").toUpperCase()}
                            </Badge>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/50 px-2.5 py-0.5 rounded-full font-mono">
                              {comp.availability}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            {comp.price !== null && comp.price !== undefined && (
                              <div className="text-right">
                                <span className="text-lg font-black text-slate-900 dark:text-slate-200">${Number(comp.price).toFixed(2)}</span>
                                {comp.price_diff !== null && comp.price_diff !== undefined && (
                                  <span className={`text-xs font-bold block ${comp.price_diff <= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                    {comp.price_diff >= 0 ? "+" : ""}${Number(comp.price_diff).toFixed(2)}
                                    {comp.price_diff_percent != null ? ` (${Number(comp.price_diff_percent).toFixed(1)}%)` : ""}
                                  </span>
                                )}
                              </div>
                            )}
                            {comp.source_product_url && (
                              <a
                                href={comp.source_product_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-800/60 shadow-2xs transition-colors"
                              >
                                Visit Site ↗
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Whole Details Grid for this Source */}
                        <div className="grid grid-cols-2 gap-3 text-xs mt-3 sm:grid-cols-4 bg-slate-50/80 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60">
                          <div>
                            <span className="text-slate-400 block">Matched Title</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-300">{comp.source_product_title}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Seller / Merchant</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-300">{comp.seller || "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Customer Rating</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-300">
                              {comp.rating ? `${comp.rating} / 5.0 (${comp.reviews_count} reviews)` : "N/A"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Last Monitored</span>
                            <span className="font-mono text-slate-600 dark:text-slate-400">
                              {new Date(comp.last_checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        {/* Full Specs breakdown if available */}
                        {specsObj && (
                          <div className="mt-3 border-t border-slate-100 dark:border-slate-800/60 pt-2 text.xs text-slate-600 dark:text-slate-400">
                            <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">Full Source Specifications & Details:</span>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60 font-mono text-[11px]">
                              {Object.entries(specsObj).map(([k, v]) => (
                                <div key={k} className="truncate">
                                  <span className="text-slate-400">{k}: </span>
                                  <span className="text-slate-900 dark:text-slate-200 font-bold font-sans">{String(v)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800/60 mt-4">
            <Button onClick={() => setDetailModalOpen(false)}>Close Details</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

