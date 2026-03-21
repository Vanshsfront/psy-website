"use client";

import { useState, useMemo } from "react";
import { Plus, Search } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { useProducts } from "@/hooks/useProducts";
import { useToast } from "@/hooks/useToast";
import ProductCard from "@/components/admin/ProductCard";
import ProductSlideOver from "@/components/admin/ProductSlideOver";
import { Button } from "@/components/ui/button";
import type { Product } from "@/types";

const CATEGORIES = [
  "All",
  "Rings",
  "Necklaces",
  "Earrings",
  "Bracelets",
  "Cuffs",
  "Limited Edition",
];

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Published", value: "published" },
  { label: "Draft", value: "draft" },
  { label: "Deleted", value: "deleted" },
];

const PAGE_SIZE = 20;

export default function AdminProductsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("");
  const [slideOpen, setSlideOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { toast } = useToast();

  // Fetch ALL products (no server-side filtering)
  const { products: allProducts, isLoading, mutate } = useProducts({});

  // Client-side filtering
  const filteredProducts = useMemo(() => {
    let result = allProducts;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }

    // Category filter
    if (category !== "All") {
      result = result.filter((p) => p.category === category);
    }

    // Status filter
    if (status === "published") {
      result = result.filter((p) => p.stock_status && !p.is_deleted);
    } else if (status === "draft") {
      result = result.filter((p) => !p.stock_status && !p.is_deleted);
    } else if (status === "deleted") {
      result = result.filter((p) => p.is_deleted);
    }

    return result;
  }, [allProducts, search, category, status]);

  // Windowed display
  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setSlideOpen(true);
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setSlideOpen(true);
  };

  const handleDelete = async (product: Product) => {
    setDeleteTarget(product);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/products/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");

      await fetch("/api/admin/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paths: ["/shop", `/shop/${deleteTarget.slug}`, "/"],
        }),
      });

      toast.success(`"${deleteTarget.name}" removed from shop`);
      mutate();
    } catch {
      toast.error("Failed to delete product");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="font-sans font-semibold text-2xl text-bone">Products</h1>
          <p className="text-taupe text-caption mt-1">
            {allProducts.length} product{allProducts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="neon" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" /> Add Product
        </Button>
      </div>

      {/* Filter bar */}
      <div className="sticky top-0 bg-ink z-10 py-3 mb-6 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-taupe" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            placeholder="Search products..."
            className="w-full border-0 border-b border-[#2a2a2a] bg-transparent pl-6 py-2 text-sm text-bone placeholder:text-taupe/60 focus:border-psy-green focus:outline-none transition-colors"
          />
        </div>

        {/* Category */}
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          className="h-10 border border-[#2a2a2a] bg-ink px-3 text-sm text-bone focus:ring-1 focus:ring-psy-green outline-none"
        >
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        {/* Status */}
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          className="h-10 border border-[#2a2a2a] bg-ink px-3 text-sm text-bone focus:ring-1 focus:ring-psy-green outline-none"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Count */}
        <span className="ml-auto text-taupe text-caption">
          Showing {Math.min(visibleCount, filteredProducts.length)} of{" "}
          {filteredProducts.length}
        </span>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square bg-[#1a1a1a] animate-pulse"
            />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-20 text-taupe">
          <p className="text-lg mb-2">No products found</p>
          <p className="text-sm">
            {search || category !== "All" || status
              ? "Try adjusting your filters"
              : "Click 'Add Product' to get started"}
          </p>
        </div>
      ) : (
        <>
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {visibleProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </AnimatePresence>

          {hasMore && (
            <div className="flex justify-center mt-12">
              <button
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="border border-[#2a2a2a] bg-transparent text-bone uppercase tracking-widest text-caption py-3 px-10 hover:border-psy-green hover:text-psy-green transition-all duration-300 cursor-pointer"
              >
                Load More
              </button>
            </div>
          )}
        </>
      )}

      {/* Slide-over */}
      <ProductSlideOver
        isOpen={slideOpen}
        onClose={() => {
          setSlideOpen(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
        onSaved={() => mutate()}
      />

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div
            className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setDeleteTarget(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-surface border border-[#2a2a2a] p-6 max-w-md w-full"
            >
              <h3 className="font-display text-lg font-bold text-bone mb-2">
                Delete Product
              </h3>
              <p className="text-sm text-taupe mb-6">
                Are you sure you want to remove &ldquo;{deleteTarget.name}
                &rdquo;? This will immediately unpublish it from the shop.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setDeleteTarget(null)}
                >
                  Cancel
                </Button>
                <button
                  onClick={confirmDelete}
                  className="h-10 px-4 bg-terracotta text-bone font-medium text-sm hover:bg-terracotta/80 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
