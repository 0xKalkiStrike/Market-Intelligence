"use client";

import { useEffect, useState } from "react";
import { Tag } from "lucide-react";
import { api } from "@/lib/api";
import type { SourceItem, Product } from "@/lib/types";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageLoading } from "@/components/ui/Spinner";

interface MatrixRow {
  product_id: string;
  sku: string;
  title: string;
  brand: string;
  excel_base_price: number | null;
  target_price: number | null;
  sources: Record<string, {
    source_id: string;
    price: number | null;
    price_diff: number | null;
    price_diff_percent: number | null;
    availability: string;
    seller: string;
    rating: number | null;
    match_status: string;
    url: string | null;
  }>;
}

export default function PricingPage() {
  const [matrix, setMatrix] = useState<MatrixRow[] | null>(null);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    try {
      const [mList, sList] = await Promise.all([
        api.get<MatrixRow[]>("/api/pricing").catch(() => []),
        api.get<SourceItem[]>("/api/sources").catch(() => []),
      ]);
      setMatrix(mList || []);
      setSources(sList || []);
    } catch {
      setMatrix([]);
      setSources([]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenDetail = async (productId: string) => {
    try {
      const prod = await api.get<Product>(`/api/products/${productId}`);
      setSelectedProduct(prod);
      setDetailModalOpen(true);
    } catch {
      alert("Failed to load product details");
    }
  };

  if (!matrix) return <PageLoading />;

  // Filtered rows
  const filteredMatrix = matrix.filter(
    (row) =>
      row.title.toLowerCase().includes(search.toLowerCase()) ||
      row.sku.toLowerCase().includes(search.toLowerCase()) ||
      (row.brand && row.brand.toLowerCase().includes(search.toLowerCase()))
  );

  const sourceNames = sources.length > 0 
    ? sources.map(s => s.name)
    : Array.from(new Set(matrix.flatMap(r => Object.keys(r.sources))));

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-200 sm:text-2xl">
            Cross-Source Price Matrix
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Compare prices of uploaded Excel products against all configured Target Source sites side-by-side.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={loadData}>
            Refresh Pricing Matrix
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Filter matrix by Title, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span>Emerald pill indicates lowest market price</span>
        </div>
      </div>

      {/* Matrix Table */}
      <Card>
        <CardBody className="p-0 overflow-x-auto custom-scrollbar">
          {filteredMatrix.length === 0 ? (
            <div className="p-16 text-center text-sm text-slate-500 dark:text-slate-400">
              <Tag className="h-8 w-8 mb-2 mx-auto text-slate-400" />
              <p className="font-extrabold text-slate-800 dark:text-slate-300 text-base">No Product Comparisons Available</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Upload an Excel sheet in <strong>Products Catalog</strong> and add target sites in <strong>Target Sources</strong> tab to start comparing market prices.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead className="border-b border-slate-200 dark:border-slate-800/60 bg-slate-50/80 dark:bg-slate-900/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3.5 min-w-[220px]">Product / Model</th>
                  <th className="px-4 py-3.5 bg-slate-100/90 font-extrabold text-slate-900 dark:text-slate-200 border-x border-slate-200/80 dark:border-slate-700 min-w-[140px]">
                    Excel Base Price
                  </th>
                  {sourceNames.map((sName) => (
                    <th key={sName} className="px-4 py-3.5 min-w-[160px]">
                      {sName}
                    </th>
                  ))}
                  <th className="px-4 py-3.5 text-right min-w-[140px]">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                {filteredMatrix.map((row) => {
                  // Find lowest source price among valid prices
                  const validPrices = Object.values(row.sources)
                    .map((s) => s.price)
                    .filter((p): p is number => p !== null && p > 0);
                  const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;

                  return (
                    <tr key={row.product_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-slate-200 text-sm">{row.title}</span>
                          <span className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            SKU: {row.sku} {row.brand ? `• ${row.brand}` : ""}
                          </span>
                        </div>
                      </td>

                      {/* Excel Sheet Original Base Price */}
                      <td className="px-4 py-3.5 font-black text-slate-900 dark:text-slate-200 bg-slate-50/60 border-x border-slate-200/80 dark:border-slate-700 text-base">
                        {row.excel_base_price !== null ? `$${row.excel_base_price.toFixed(2)}` : "—"}
                      </td>

                      {/* Target Source Columns */}
                      {sourceNames.map((sName) => {
                        const comp = row.sources[sName];
                        if (!comp || comp.price === null) {
                          return (
                            <td key={sName} className="px-4 py-3.5 text-xs text-slate-400 font-mono">
                              —
                            </td>
                          );
                        }

                        const isLowest = minPrice !== null && comp.price === minPrice;
                        const isCheaper = comp.price_diff != null && comp.price_diff <= 0;

                        return (
                          <td key={sName} className="px-4 py-3.5">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`font-black text-sm ${isLowest ? "text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg shadow-2xs" : "text-slate-900"}`}>
                                  {comp.price != null ? `$${Number(comp.price).toFixed(2)}` : "—"}
                                </span>
                              </div>
                              {comp.price_diff != null && (
                                <span
                                  className={`text-[11px] font-bold ${
                                    isCheaper ? "text-emerald-600" : "text-rose-600"
                                  }`}
                                >
                                  {comp.price_diff >= 0 ? "+" : ""}${Number(comp.price_diff).toFixed(2)}
                                  {comp.price_diff_percent != null ? ` (${Number(comp.price_diff_percent).toFixed(1)}%)` : ""}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 font-mono">
                                {comp.availability}
                              </span>
                            </div>
                          </td>
                        );
                      })}

                      <td className="px-4 py-3.5 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleOpenDetail(row.product_id)}
                        >
                          Inspect Details
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {/* Product Details & Full Specs Modal */}
      {selectedProduct && (
        <Modal
          open={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title={`Detailed Cross-Source Matrix: ${selectedProduct.title}`}
        >
          <div className="flex flex-col gap-5 max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
            <div className="bg-slate-950 text-white p-5 rounded-2xl flex justify-between items-center shadow-md">
              <div>
                <span className="text-xs text-slate-400 block uppercase font-bold">Product SKU</span>
                <span className="font-mono text-lg font-black text-indigo-300">{selectedProduct.sku}</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block uppercase font-bold">Excel Base Price</span>
                <span className="text-2xl font-black text-emerald-400">
                  {selectedProduct.current_price !== null ? `$${selectedProduct.current_price.toFixed(2)}` : "—"}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-200">Cross-Source Monitored Details:</h3>
              {selectedProduct.comparisons?.map((c) => (
                <div key={c.id} className="border border-slate-200 dark:border-slate-800/60 rounded-2xl p-4 bg-slate-50/80 dark:bg-slate-900/60 flex justify-between items-center shadow-2xs">
                  <div>
                    <span className="font-extrabold text-slate-900 dark:text-slate-200 text-sm">{c.source_name}</span>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{c.source_product_title}</p>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-1 block">Seller: {c.seller} • {c.availability}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-slate-900 dark:text-slate-200">
                      {c.price !== null ? `$${c.price.toFixed(2)}` : "—"}
                    </span>
                    {c.source_product_url && (
                      <a href={c.source_product_url} target="_blank" rel="noreferrer" className="block text-xs font-bold text-indigo-600 hover:text-indigo-800 underline mt-1">
                        Open Site ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800/60 mt-4">
            <Button onClick={() => setDetailModalOpen(false)}>Done</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

