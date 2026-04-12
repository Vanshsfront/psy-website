"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useProductCategories,
  type ProductCategory,
} from "@/hooks/useProductCategories";
import { useToast } from "@/hooks/useToast";
import { slugify } from "@/lib/slugify";

export default function AdminCategoriesPage() {
  const { categories, isLoading, mutate } = useProductCategories();
  const { toast } = useToast();

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/product-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug: slugify(name),
          sort_order: categories.length + 1,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create");
      }
      setNewName("");
      toast.success(`Category "${name}" created`);
      mutate();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create category"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    try {
      const res = await fetch(`/api/admin/product-categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug: slugify(name) }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Category updated");
      setEditingId(null);
      mutate();
    } catch {
      toast.error("Failed to update category");
    }
  };

  const handleDelete = async (cat: ProductCategory) => {
    if (!confirm(`Delete category "${cat.name}"? Products using this category will keep their current value.`))
      return;
    setDeletingId(cat.id);
    try {
      const res = await fetch(`/api/admin/product-categories/${cat.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success(`"${cat.name}" deleted`);
      mutate();
    } catch {
      toast.error("Failed to delete category");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-sans font-semibold text-2xl text-bone">
            Product Categories
          </h1>
          <p className="text-taupe text-caption mt-1">
            {categories.length} categor{categories.length !== 1 ? "ies" : "y"}
          </p>
        </div>
      </div>

      {/* Add new category */}
      <div className="flex gap-3 mb-8">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name..."
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="max-w-sm"
        />
        <Button variant="neon" onClick={handleAdd} disabled={saving || !newName.trim()}>
          <Plus className="w-4 h-4 mr-2" />
          {saving ? "Adding..." : "Add"}
        </Button>
      </div>

      {/* Category list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-6 h-6 border-2 border-psy-green border-t-transparent rounded-full animate-spin" />
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 text-taupe">
          No categories yet. Add one above.
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-3 bg-surface border border-borderDark rounded-lg px-4 py-3"
            >
              <GripVertical className="w-4 h-4 text-taupe/40 shrink-0" />

              {editingId === cat.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleUpdate(cat.id)
                    }
                    className="flex-1"
                    autoFocus
                  />
                  <Button
                    variant="neon"
                    size="sm"
                    onClick={() => handleUpdate(cat.id)}
                  >
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <>
                  <span className="text-bone text-sm flex-1">{cat.name}</span>
                  <span className="text-taupe text-micro font-mono">
                    {cat.slug}
                  </span>
                  <button
                    onClick={() => {
                      setEditingId(cat.id);
                      setEditName(cat.name);
                    }}
                    className="p-1.5 hover:bg-surface rounded transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5 text-taupe hover:text-bone" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat)}
                    disabled={deletingId === cat.id}
                    className="p-1.5 hover:bg-danger/20 rounded transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-danger" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
