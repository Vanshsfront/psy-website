"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import type { Product } from "@/types";

const collectionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  image_url: z.string().optional(),
});

type CollectionForm = z.infer<typeof collectionSchema>;

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function NewCollectionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [productSearch, setProductSearch] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CollectionForm>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      image_url: "",
    },
  });

  const nameValue = watch("name");

  // Auto-generate slug from name
  useEffect(() => {
    if (nameValue) {
      setValue("slug", slugify(nameValue));
    }
  }, [nameValue, setValue]);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("/api/admin/products");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setProducts(data);
      } catch {
        toast.error("Failed to load products");
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, productSearch]);

  const toggleProduct = (id: string) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onSubmit = async (data: CollectionForm) => {
    setIsSubmitting(true);
    try {
      const body = {
        ...data,
        description: data.description || null,
        image_url: data.image_url || null,
        product_ids: Array.from(selectedProducts),
      };

      const res = await fetch("/api/admin/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create collection");
      }

      toast.success("Collection created successfully");
      router.push("/admin/collections");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create collection"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "w-full bg-ink border border-borderDark rounded px-3 py-2.5 text-sm text-bone placeholder:text-taupe/60 focus:border-psy-green focus:outline-none transition-colors";
  const labelClass = "block text-xs uppercase tracking-widest text-mutedText mb-2";
  const errorClass = "text-danger text-xs mt-1";

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/collections"
          className="inline-flex items-center gap-2 text-sm text-mutedText hover:text-bone transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Collections
        </Link>
        <h1 className="font-sans font-semibold text-2xl text-bone">
          Create Collection
        </h1>
        <p className="text-taupe text-caption mt-1">
          Group products into a curated collection
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-6">
        {/* Collection details */}
        <div className="bg-surface border border-borderDark rounded p-6 space-y-6">
          <div>
            <label className={labelClass}>Name</label>
            <input
              {...register("name")}
              placeholder="e.g. Summer Collection"
              className={inputClass}
            />
            {errors.name && <p className={errorClass}>{errors.name.message}</p>}
          </div>

          <div>
            <label className={labelClass}>Slug</label>
            <input
              {...register("slug")}
              placeholder="auto-generated-from-name"
              className={inputClass}
            />
            {errors.slug && <p className={errorClass}>{errors.slug.message}</p>}
          </div>

          <div>
            <label className={labelClass}>Description (optional)</label>
            <textarea
              {...register("description")}
              rows={3}
              placeholder="A brief description of this collection..."
              className={`${inputClass} resize-none`}
            />
          </div>

          <div>
            <label className={labelClass}>Image URL (optional)</label>
            <input
              {...register("image_url")}
              placeholder="https://example.com/image.jpg"
              className={inputClass}
            />
          </div>
        </div>

        {/* Product selector */}
        <div className="bg-surface border border-borderDark rounded p-6">
          <div className="flex items-center justify-between mb-4">
            <label className={labelClass}>
              Products ({selectedProducts.size} selected)
            </label>
          </div>

          {/* Product search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-taupe" />
            <input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search products..."
              className={`${inputClass} pl-9`}
            />
          </div>

          {/* Product list */}
          <div className="max-h-80 overflow-y-auto border border-borderDark rounded divide-y divide-borderDark">
            {loadingProducts ? (
              <div className="p-4 text-center text-mutedText text-sm">
                Loading products...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-4 text-center text-mutedText text-sm">
                No products found
              </div>
            ) : (
              filteredProducts.map((product) => (
                <label
                  key={product.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-surfaceLighter/50 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedProducts.has(product.id)}
                    onChange={() => toggleProduct(product.id)}
                    className="w-4 h-4 rounded border-borderDark bg-ink text-psy-green focus:ring-psy-green accent-psy-green"
                  />
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {product.images?.[0] && (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-8 h-8 object-cover rounded"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm text-bone truncate">{product.name}</p>
                      <p className="text-[10px] text-mutedText">
                        {product.category} · ₹{product.price}
                      </p>
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-4">
          <Link href="/admin/collections">
            <Button variant="ghost" type="button">
              Cancel
            </Button>
          </Link>
          <Button variant="neon" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Collection"}
          </Button>
        </div>
      </form>
    </>
  );
}
