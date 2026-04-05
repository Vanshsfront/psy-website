"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Trash2, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import type { Collection } from "@/types";

type CollectionWithCount = Collection & { product_count: number };

export default function AdminCollectionsPage() {
  const [collections, setCollections] = useState<CollectionWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCollections = async () => {
    try {
      const res = await fetch("/api/admin/collections");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setCollections(data);
    } catch {
      toast.error("Failed to load collections");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/collections/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success(`"${name}" deleted`);
      await fetchCollections();
    } catch {
      toast.error("Failed to delete collection");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="font-sans font-semibold text-2xl text-bone">Collections</h1>
          <p className="text-taupe text-caption mt-1">
            {collections.length} collection{collections.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/admin/collections/new">
          <Button variant="neon">
            <Plus className="w-4 h-4 mr-2" /> New Collection
          </Button>
        </Link>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/3] bg-surface border border-borderDark rounded animate-pulse"
            />
          ))}
        </div>
      ) : collections.length === 0 ? (
        <div className="text-center py-20 text-taupe mt-6">
          <FolderOpen className="w-10 h-10 mx-auto mb-4 text-taupe/40" />
          <p className="text-lg mb-2">No collections yet</p>
          <p className="text-sm">Create a collection to organize your products</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {collections.map((c) => (
            <div
              key={c.id}
              className="bg-surface border border-borderDark rounded overflow-hidden group hover:border-psy-green/30 transition-colors"
            >
              {/* Image */}
              <div className="aspect-[16/9] bg-surfaceLighter relative overflow-hidden">
                {c.image_url ? (
                  <img
                    src={c.image_url}
                    alt={c.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FolderOpen className="w-10 h-10 text-borderDark" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-primaryText">{c.name}</h3>
                    <p className="text-xs text-mutedText mt-1">
                      {c.product_count} product{c.product_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 text-[10px] uppercase font-bold rounded ${
                        c.is_active
                          ? "bg-neon-green/20 text-neon-green border border-neon-green/50"
                          : "bg-borderDark text-mutedText border border-borderDark"
                      }`}
                    >
                      {c.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                {c.description && (
                  <p className="text-xs text-mutedText mt-2 line-clamp-2">
                    {c.description}
                  </p>
                )}

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-borderDark">
                  <span className="text-[10px] text-mutedText font-mono">
                    /{c.slug}
                  </span>
                  <button
                    onClick={() => handleDelete(c.id, c.name)}
                    disabled={deletingId === c.id}
                    className="text-danger hover:text-[#ff6b6b] transition-colors disabled:opacity-50 cursor-pointer"
                    title="Delete collection"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
