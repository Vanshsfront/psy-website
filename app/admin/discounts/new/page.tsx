"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";

const discountSchema = z.object({
  code: z.string().min(1, "Code is required"),
  type: z.enum(["percentage", "fixed"]),
  value: z.number().positive("Value must be greater than 0"),
  min_order_amount: z.number().positive().nullable().optional(),
  max_uses: z.number().int().positive().nullable().optional(),
  starts_at: z.string().nullable().optional(),
  expires_at: z.string().nullable().optional(),
});

type DiscountForm = z.infer<typeof discountSchema>;

export default function NewDiscountPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<DiscountForm>({
    resolver: zodResolver(discountSchema),
    defaultValues: {
      code: "",
      type: "percentage",
      value: undefined as unknown as number,
      min_order_amount: null,
      max_uses: null,
      starts_at: null,
      expires_at: null,
    },
  });

  const discountType = watch("type");

  const onSubmit = async (data: DiscountForm) => {
    setIsSubmitting(true);
    try {
      const body = {
        ...data,
        code: data.code.toUpperCase(),
        min_order_amount: data.min_order_amount || null,
        max_uses: data.max_uses || null,
        starts_at: data.starts_at || null,
        expires_at: data.expires_at || null,
      };

      const res = await fetch("/api/admin/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create discount");
      }

      toast.success("Discount created successfully");
      router.push("/admin/discounts");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create discount");
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
          href="/admin/discounts"
          className="inline-flex items-center gap-2 text-sm text-mutedText hover:text-bone transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Discounts
        </Link>
        <h1 className="font-sans font-semibold text-2xl text-bone">Create Discount</h1>
        <p className="text-taupe text-caption mt-1">
          Set up a new discount code for the shop
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-surface border border-borderDark rounded p-6 max-w-2xl space-y-6"
      >
        {/* Code */}
        <div>
          <label className={labelClass}>Discount Code</label>
          <input
            {...register("code")}
            placeholder="e.g. SUMMER20"
            className={`${inputClass} uppercase`}
          />
          {errors.code && <p className={errorClass}>{errors.code.message}</p>}
        </div>

        {/* Type + Value */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Type</label>
            <select {...register("type")} className={inputClass}>
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount (₹)</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>
              Value {discountType === "percentage" ? "(%)" : "(₹)"}
            </label>
            <input
              type="number"
              step={discountType === "percentage" ? "1" : "0.01"}
              {...register("value", { valueAsNumber: true })}
              placeholder={discountType === "percentage" ? "e.g. 20" : "e.g. 500"}
              className={inputClass}
            />
            {errors.value && <p className={errorClass}>{errors.value.message}</p>}
          </div>
        </div>

        {/* Min Order + Max Uses */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Min Order Amount (optional)</label>
            <input
              type="number"
              step="0.01"
              {...register("min_order_amount", { valueAsNumber: true })}
              placeholder="e.g. 1000"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Max Uses (optional)</label>
            <input
              type="number"
              {...register("max_uses", { valueAsNumber: true })}
              placeholder="e.g. 100"
              className={inputClass}
            />
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Start Date (optional)</label>
            <input
              type="datetime-local"
              {...register("starts_at")}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Expiry Date (optional)</label>
            <input
              type="datetime-local"
              {...register("expires_at")}
              className={inputClass}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-4 border-t border-borderDark">
          <Link href="/admin/discounts">
            <Button variant="ghost" type="button">
              Cancel
            </Button>
          </Link>
          <Button variant="neon" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Discount"}
          </Button>
        </div>
      </form>
    </>
  );
}
