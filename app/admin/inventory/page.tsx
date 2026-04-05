"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, ChevronDown, ChevronRight, Save, Package } from "lucide-react";
import { useToast } from "@/hooks/useToast";

type InventoryVariant = {
  id: string;
  product_id: string;
  label: string;
  sku: string | null;
  stock_quantity: number;
  price_override: number | null;
};

type InventoryProduct = {
  id: string;
  name: string;
  slug: string;
  images: string[];
  stock_quantity: number | null;
  stock_status: boolean;
  category: string;
  variants: InventoryVariant[];
};

export default function AdminInventoryPage() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingStock, setEditingStock] = useState<Record<string, number>>({});
  const [editingVariantStock, setEditingVariantStock] = useState<Record<string, number>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const fetchInventory = async () => {
    try {
      const res = await fetch("/api/admin/inventory");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setProducts(data);
    } catch {
      toast.error("Failed to load inventory");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [products, search]);

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getStockStatus = (qty: number | null) => {
    if (qty === null || qty === undefined) return "unknown";
    if (qty === 0) return "out";
    if (qty <= 5) return "low";
    return "in";
  };

  const handleSaveProduct = async (product: InventoryProduct) => {
    const productStockKey = `product-${product.id}`;
    const newStock = editingStock[productStockKey];

    // Gather variant edits for this product
    const variantUpdates: { id: string; stock_quantity: number }[] = [];
    for (const v of product.variants) {
      const variantKey = `variant-${v.id}`;
      if (variantKey in editingVariantStock) {
        variantUpdates.push({
          id: v.id,
          stock_quantity: editingVariantStock[variantKey],
        });
      }
    }

    if (newStock === undefined && variantUpdates.length === 0) return;

    setSavingIds((prev) => new Set(prev).add(product.id));
    try {
      const body: Record<string, unknown> = {};
      if (newStock !== undefined) body.stock_quantity = newStock;
      if (variantUpdates.length > 0) body.variants = variantUpdates;

      const res = await fetch(`/api/admin/inventory/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save");

      // Clear edits
      if (newStock !== undefined) {
        setEditingStock((prev) => {
          const next = { ...prev };
          delete next[productStockKey];
          return next;
        });
      }
      for (const v of variantUpdates) {
        setEditingVariantStock((prev) => {
          const next = { ...prev };
          delete next[`variant-${v.id}`];
          return next;
        });
      }

      toast.success(`Updated stock for "${product.name}"`);
      await fetchInventory();
    } catch {
      toast.error("Failed to update stock");
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }
  };

  const hasEdits = (product: InventoryProduct) => {
    if (`product-${product.id}` in editingStock) return true;
    return product.variants.some((v) => `variant-${v.id}` in editingVariantStock);
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="font-sans font-semibold text-2xl text-bone">Inventory</h1>
          <p className="text-taupe text-caption mt-1">
            {products.length} product{products.length !== 1 ? "s" : ""} tracked
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="sticky top-0 bg-ink z-10 py-3 mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-taupe" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or category..."
            className="w-full border-0 border-b border-[#2a2a2a] bg-transparent pl-6 py-2 text-sm text-bone placeholder:text-taupe/60 focus:border-psy-green focus:outline-none transition-colors"
          />
        </div>
        <span className="ml-auto text-taupe text-caption">
          Showing {filteredProducts.length} of {products.length}
        </span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-surface border border-borderDark rounded overflow-hidden">
          <div className="divide-y divide-borderDark">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse bg-surfaceLighter/30" />
            ))}
          </div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-20 text-taupe">
          <Package className="w-10 h-10 mx-auto mb-4 text-taupe/40" />
          <p className="text-lg mb-2">No products found</p>
          <p className="text-sm">
            {search ? "Try adjusting your search" : "Products will appear here once added"}
          </p>
        </div>
      ) : (
        <div className="bg-surface border border-borderDark rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surfaceLighter border-b border-borderDark text-xs uppercase tracking-wider text-mutedText font-mono">
                  <th className="p-4 font-medium w-8"></th>
                  <th className="p-4 font-medium">Product</th>
                  <th className="p-4 font-medium">SKU / Variants</th>
                  <th className="p-4 font-medium">Stock Qty</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderDark text-sm">
                {filteredProducts.map((product) => {
                  const expanded = expandedRows.has(product.id);
                  const hasVariants = product.variants.length > 0;
                  const stockQty = product.stock_quantity ?? 0;
                  const status = getStockStatus(product.stock_quantity);
                  const productStockKey = `product-${product.id}`;
                  const currentStock =
                    productStockKey in editingStock
                      ? editingStock[productStockKey]
                      : stockQty;
                  const isLow = status === "low" || status === "out";

                  return (
                    <>
                      <tr
                        key={product.id}
                        className={`hover:bg-surfaceLighter/50 transition-colors ${
                          isLow ? "bg-terracotta/5" : ""
                        }`}
                      >
                        <td className="p-4">
                          {hasVariants && (
                            <button
                              onClick={() => toggleExpand(product.id)}
                              className="text-mutedText hover:text-bone transition-colors cursor-pointer"
                            >
                              {expanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {product.images?.[0] && (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="w-10 h-10 object-cover rounded"
                              />
                            )}
                            <div>
                              <p className="font-medium text-primaryText">
                                {product.name}
                              </p>
                              <p className="text-xs text-mutedText">
                                {product.category}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-mutedText text-xs">
                          {hasVariants
                            ? `${product.variants.length} variant${product.variants.length !== 1 ? "s" : ""}`
                            : "No variants"}
                        </td>
                        <td className="p-4">
                          <input
                            type="number"
                            min={0}
                            value={currentStock}
                            onChange={(e) =>
                              setEditingStock((prev) => ({
                                ...prev,
                                [productStockKey]: parseInt(e.target.value) || 0,
                              }))
                            }
                            className="w-20 bg-ink border border-borderDark rounded px-2 py-1 text-sm text-bone focus:border-psy-green focus:outline-none"
                          />
                        </td>
                        <td className="p-4">
                          {status === "out" ? (
                            <span className="px-2 py-1 text-[10px] uppercase font-bold rounded bg-danger/20 text-danger border border-danger/50">
                              Out of Stock
                            </span>
                          ) : status === "low" ? (
                            <span className="px-2 py-1 text-[10px] uppercase font-bold rounded bg-warning/20 text-warning border border-warning/50">
                              Low Stock
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-[10px] uppercase font-bold rounded bg-neon-green/20 text-neon-green border border-neon-green/50">
                              In Stock
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {hasEdits(product) && (
                            <button
                              onClick={() => handleSaveProduct(product)}
                              disabled={savingIds.has(product.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium uppercase tracking-wider border border-psy-green text-psy-green hover:bg-psy-green hover:text-ink transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              <Save className="w-3 h-3" />
                              {savingIds.has(product.id) ? "Saving..." : "Save"}
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Variant rows */}
                      {expanded &&
                        product.variants.map((variant) => {
                          const variantKey = `variant-${variant.id}`;
                          const vStock =
                            variantKey in editingVariantStock
                              ? editingVariantStock[variantKey]
                              : variant.stock_quantity;
                          const vStatus = getStockStatus(variant.stock_quantity);
                          const vIsLow = vStatus === "low" || vStatus === "out";

                          return (
                            <tr
                              key={variant.id}
                              className={`hover:bg-surfaceLighter/50 transition-colors ${
                                vIsLow ? "bg-terracotta/5" : "bg-surface"
                              }`}
                            >
                              <td className="p-4"></td>
                              <td className="p-4 pl-16">
                                <p className="text-sm text-mutedText">
                                  {variant.label}
                                </p>
                              </td>
                              <td className="p-4 font-mono text-xs text-mutedText">
                                {variant.sku || "—"}
                              </td>
                              <td className="p-4">
                                <input
                                  type="number"
                                  min={0}
                                  value={vStock}
                                  onChange={(e) =>
                                    setEditingVariantStock((prev) => ({
                                      ...prev,
                                      [variantKey]: parseInt(e.target.value) || 0,
                                    }))
                                  }
                                  className="w-20 bg-ink border border-borderDark rounded px-2 py-1 text-sm text-bone focus:border-psy-green focus:outline-none"
                                />
                              </td>
                              <td className="p-4">
                                {vStatus === "out" ? (
                                  <span className="px-2 py-1 text-[10px] uppercase font-bold rounded bg-danger/20 text-danger border border-danger/50">
                                    Out of Stock
                                  </span>
                                ) : vStatus === "low" ? (
                                  <span className="px-2 py-1 text-[10px] uppercase font-bold rounded bg-warning/20 text-warning border border-warning/50">
                                    Low Stock
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 text-[10px] uppercase font-bold rounded bg-neon-green/20 text-neon-green border border-neon-green/50">
                                    In Stock
                                  </span>
                                )}
                              </td>
                              <td className="p-4"></td>
                            </tr>
                          );
                        })}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
