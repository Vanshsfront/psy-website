"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import type { Discount } from "@/types";

function getDiscountStatus(d: Discount) {
  if (!d.is_active) return "inactive";
  if (d.expires_at && new Date(d.expires_at) < new Date()) return "expired";
  if (d.max_uses && d.used_count >= d.max_uses) return "maxed";
  if (d.starts_at && new Date(d.starts_at) > new Date()) return "scheduled";
  return "active";
}

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return "bg-neon-green/20 text-neon-green border border-neon-green/50";
    case "expired":
      return "bg-danger/20 text-danger border border-danger/50";
    case "maxed":
      return "bg-warning/20 text-warning border border-warning/50";
    case "scheduled":
      return "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50";
    case "inactive":
      return "bg-borderDark text-mutedText border border-borderDark";
    default:
      return "bg-borderDark text-white";
  }
}

export default function AdminDiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchDiscounts = async () => {
    try {
      const res = await fetch("/api/admin/discounts");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setDiscounts(data);
    } catch {
      toast.error("Failed to load discounts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this discount?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/discounts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Discount deactivated");
      await fetchDiscounts();
    } catch {
      toast.error("Failed to delete discount");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="font-sans font-semibold text-2xl text-bone">Discounts</h1>
          <p className="text-taupe text-caption mt-1">
            {discounts.length} discount{discounts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/admin/discounts/new">
          <Button variant="neon">
            <Plus className="w-4 h-4 mr-2" /> New Discount
          </Button>
        </Link>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-surface border border-borderDark rounded overflow-hidden mt-6">
          <div className="divide-y divide-borderDark">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse bg-surfaceLighter/30" />
            ))}
          </div>
        </div>
      ) : discounts.length === 0 ? (
        <div className="text-center py-20 text-taupe mt-6">
          <Tag className="w-10 h-10 mx-auto mb-4 text-taupe/40" />
          <p className="text-lg mb-2">No discounts yet</p>
          <p className="text-sm">Create a discount code to get started</p>
        </div>
      ) : (
        <div className="bg-surface border border-borderDark rounded overflow-hidden mt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surfaceLighter border-b border-borderDark text-xs uppercase tracking-wider text-mutedText font-mono">
                  <th className="p-4 font-medium">Code</th>
                  <th className="p-4 font-medium">Type</th>
                  <th className="p-4 font-medium">Value</th>
                  <th className="p-4 font-medium">Min Order</th>
                  <th className="p-4 font-medium">Uses</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Expires</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderDark text-sm">
                {discounts.map((d) => {
                  const status = getDiscountStatus(d);
                  return (
                    <tr
                      key={d.id}
                      className="hover:bg-surfaceLighter/50 transition-colors"
                    >
                      <td className="p-4">
                        <span className="font-mono font-bold text-neon-cyan text-xs">
                          {d.code}
                        </span>
                      </td>
                      <td className="p-4 text-mutedText capitalize text-xs">
                        {d.type}
                      </td>
                      <td className="p-4 font-mono font-bold">
                        {d.type === "percentage" ? `${d.value}%` : `₹${d.value}`}
                      </td>
                      <td className="p-4 text-mutedText text-xs">
                        {d.min_order_amount ? `₹${d.min_order_amount}` : "—"}
                      </td>
                      <td className="p-4 text-xs text-mutedText">
                        {d.used_count}
                        {d.max_uses ? ` / ${d.max_uses}` : " / ∞"}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 text-[10px] uppercase font-bold rounded ${getStatusBadge(
                            status
                          )}`}
                        >
                          {status === "maxed" ? "Maxed Out" : status}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-mutedText">
                        {d.expires_at
                          ? new Date(d.expires_at).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "Never"}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDelete(d.id)}
                          disabled={deletingId === d.id}
                          className="inline-flex items-center gap-1 text-danger hover:text-[#ff6b6b] transition-colors disabled:opacity-50 cursor-pointer"
                          title="Deactivate discount"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
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
