"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCustomerStore } from "@/store/customerStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Plus, Trash2, Star } from "lucide-react";
import type { CustomerAddress } from "@/types";

export default function AddressesPage() {
  const router = useRouter();
  const { token, isLoggedIn } = useCustomerStore();
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    label: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    is_default: false,
  });

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/shop/account/login");
      return;
    }
    fetchAddresses();
  }, [isLoggedIn, router]);

  async function fetchAddresses() {
    try {
      const res = await fetch("/api/shop/addresses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAddresses(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.address || !form.city || !form.state || !form.pincode) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/shop/addresses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm({
          label: "",
          address: "",
          city: "",
          state: "",
          pincode: "",
          is_default: false,
        });
        setShowForm(false);
        fetchAddresses();
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/shop/addresses?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAddresses((prev) => prev.filter((a) => a.id !== id));
      }
    } catch {
      // silently fail
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-display-lg text-bone">Addresses</h1>
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            size="sm"
          >
            <Plus className="w-3.5 h-3.5 mr-2" />
            Add Address
          </Button>
        )}
      </div>

      {/* Add Address Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-surface border border-taupe/10 p-6 mb-8"
        >
          <h2 className="font-sans text-micro uppercase tracking-widest text-taupe mb-6">
            New Address
          </h2>
          <div className="space-y-4">
            <div>
              <label className="font-sans text-micro uppercase tracking-widest text-taupe block mb-2">
                Label (e.g. Home, Office)
              </label>
              <Input
                value={form.label}
                onChange={(e) =>
                  setForm((f) => ({ ...f, label: e.target.value }))
                }
                placeholder="Home"
              />
            </div>
            <div>
              <label className="font-sans text-micro uppercase tracking-widest text-taupe block mb-2">
                Address *
              </label>
              <Input
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
                placeholder="Street address, apartment, etc."
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="font-sans text-micro uppercase tracking-widest text-taupe block mb-2">
                  City *
                </label>
                <Input
                  value={form.city}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, city: e.target.value }))
                  }
                  placeholder="City"
                  required
                />
              </div>
              <div>
                <label className="font-sans text-micro uppercase tracking-widest text-taupe block mb-2">
                  State *
                </label>
                <Input
                  value={form.state}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, state: e.target.value }))
                  }
                  placeholder="State"
                  required
                />
              </div>
              <div>
                <label className="font-sans text-micro uppercase tracking-widest text-taupe block mb-2">
                  Pincode *
                </label>
                <Input
                  value={form.pincode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, pincode: e.target.value }))
                  }
                  placeholder="110001"
                  required
                />
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) =>
                  setForm((f) => ({ ...f, is_default: e.target.checked }))
                }
                className="w-4 h-4 accent-psy-green bg-transparent border-taupe/40"
              />
              <span className="font-sans text-caption text-taupe">
                Set as default address
              </span>
            </label>
          </div>
          <div className="flex gap-3 mt-6">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save Address"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Address List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="bg-surface border border-taupe/10 p-6 animate-pulse"
            >
              <div className="h-4 w-24 bg-taupe/10 rounded mb-3" />
              <div className="h-3 w-64 bg-taupe/10 rounded" />
            </div>
          ))}
        </div>
      ) : addresses.length === 0 && !showForm ? (
        <div className="bg-surface border border-taupe/10 p-12 text-center">
          <MapPin className="w-10 h-10 text-taupe/40 mx-auto mb-4" />
          <p className="font-sans text-body text-taupe mb-4">
            No saved addresses yet.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="font-sans text-micro uppercase tracking-widest text-psy-green hover:text-bone transition-colors duration-300 cursor-pointer"
          >
            Add Your First Address
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className="bg-surface border border-taupe/10 p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {addr.label && (
                    <span className="font-sans text-caption text-bone font-medium">
                      {addr.label}
                    </span>
                  )}
                  {addr.is_default && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-psy-green/20 text-psy-green border border-psy-green/50">
                      <Star className="w-2.5 h-2.5" />
                      Default
                    </span>
                  )}
                </div>
                <p className="font-sans text-caption text-taupe leading-relaxed">
                  {addr.address}
                  <br />
                  {addr.city}, {addr.state} {addr.pincode}
                </p>
              </div>
              <button
                onClick={() => handleDelete(addr.id)}
                disabled={deletingId === addr.id}
                className="flex items-center gap-1.5 font-sans text-micro uppercase tracking-widest text-taupe hover:text-red-400 transition-colors duration-300 flex-shrink-0 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deletingId === addr.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
