"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ImageManager from "@/components/admin/ImageManager";
import { slugify } from "@/lib/slugify";
import { useToast } from "@/hooks/useToast";
import type { Product } from "@/types";

/* ─── Schema ─── */
const productSchema = z.object({
  name: z.string().min(2, "Product name is required"),
  slug: z.string().min(2, "Slug is required"),
  category: z.string().min(1, "Category is required"),
  description_short: z.string().max(160).optional(),
  material: z.string().optional(),
  price: z.coerce.number().min(1, "Price must be greater than 0"),
  compare_at_price: z.coerce.number().optional().nullable(),
  stock_status: z.boolean(),
  is_featured: z.boolean(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface VariantGroup {
  group: string;
  values: { label: string; priceOverride: number | null }[];
}

interface ProductSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  onSaved: () => void;
}

const CATEGORIES = [
  "Rings",
  "Necklaces",
  "Earrings",
  "Bracelets",
  "Cuffs",
  "Limited Edition",
];

export default function ProductSlideOver({
  isOpen,
  onClose,
  product,
  onSaved,
}: ProductSlideOverProps) {
  const isEditing = !!product;
  const { toast } = useToast();

  // Form
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ProductFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      name: "",
      slug: "",
      category: "Rings",
      description_short: "",
      material: "",
      price: 0,
      compare_at_price: null,
      stock_status: true,
      is_featured: false,
    },
  });

  // TipTap editor
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Write a full rich description...",
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-invert prose-sm focus:outline-none min-h-[160px] p-4",
      },
    },
  });

  // Tags
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // Variants
  const [variants, setVariants] = useState<VariantGroup[]>([]);
  const [variantsOpen, setVariantsOpen] = useState(false);

  // Images
  const [images, setImages] = useState<string[]>([]);

  // Status
  const [isPublished, setIsPublished] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (product && isOpen) {
      reset({
        name: product.name,
        slug: product.slug,
        category: product.category,
        description_short: product.description_short || "",
        material: product.material || "",
        price: product.price,
        compare_at_price: product.compare_at_price,
        stock_status: product.stock_status,
        is_featured: product.is_featured,
      });
      editor?.commands.setContent(product.description_full || "");
      setTags(product.tags || []);
      setImages(product.images || []);
      setVariants(
        (product.variants as unknown as VariantGroup[]) || []
      );
      setIsPublished(product.stock_status);
    } else if (!product && isOpen) {
      reset({
        name: "",
        slug: "",
        category: "Rings",
        description_short: "",
        material: "",
        price: 0,
        compare_at_price: null,
        stock_status: true,
        is_featured: false,
      });
      editor?.commands.setContent("");
      setTags([]);
      setImages([]);
      setVariants([]);
      setIsPublished(false);
    }
  }, [product, isOpen, reset, editor]);

  // Auto-generate slug from name
  const nameValue = watch("name");
  useEffect(() => {
    if (!isEditing && nameValue) {
      setValue("slug", slugify(nameValue));
    }
  }, [nameValue, isEditing, setValue]);

  // Tag handlers
  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setTagInput("");
    }
  };

  // Variant handlers
  const addVariantGroup = () => {
    setVariants([
      ...variants,
      { group: "", values: [{ label: "", priceOverride: null }] },
    ]);
    setVariantsOpen(true);
  };

  const updateVariantGroup = (index: number, group: string) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], group };
    setVariants(updated);
  };

  const updateVariantValues = (index: number, valuesStr: string) => {
    const updated = [...variants];
    updated[index] = {
      ...updated[index],
      values: valuesStr
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
        .map((label) => ({ label, priceOverride: null })),
    };
    setVariants(updated);
  };

  const removeVariantGroup = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  // Character counter for short description
  const shortDesc = watch("description_short") || "";

  // Product ID for image paths
  const productId = product?.id || `temp-${Date.now()}`;

  // Save
  const onSubmit = useCallback(
    async (data: ProductFormData, publish: boolean) => {
      setIsSaving(true);
      try {
        const payload = {
          ...data,
          description_full: editor?.getHTML() || "",
          tags,
          images,
          variants: variants as unknown as Record<string, unknown>[],
          stock_status: publish ? true : data.stock_status,
        };

        const url = isEditing
          ? `/api/admin/products/${product!.id}`
          : `/api/admin/products`;

        const res = await fetch(url, {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Save failed");
        }

        // Revalidate shop pages
        await fetch("/api/admin/revalidate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paths: ["/shop", `/shop/${data.slug}`, "/"],
          }),
        });

        toast.success(
          isEditing
            ? "Product updated successfully!"
            : publish
            ? "Product published to shop!"
            : "Product saved as draft"
        );
        onSaved();
        onClose();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save product"
        );
      } finally {
        setIsSaving(false);
      }
    },
    [editor, tags, images, variants, isEditing, product, onSaved, onClose, toast]
  );

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[680px] bg-background border-l border-borderDark flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-borderDark shrink-0">
              <h2 className="font-display text-xl font-bold">
                {isEditing ? "Edit Product" : "Add New Product"}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-surfaceLighter rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
              {/* SECTION 1: Basic Info */}
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-mutedText uppercase tracking-wider">
                  Basic Info
                </h3>

                <div>
                  <label className="block text-sm font-medium mb-1.5 text-mutedText">
                    Product Name *
                  </label>
                  <Input {...register("name")} placeholder="Onyx Ring" />
                  {errors.name && (
                    <p className="text-danger text-xs mt-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5 text-mutedText">
                    Slug
                  </label>
                  <Input {...register("slug")} placeholder="onyx-ring" />
                  <p className="text-xs text-mutedText/60 mt-1">
                    psy-jewels.com/shop/{watch("slug") || "..."}
                  </p>
                  {errors.slug && (
                    <p className="text-danger text-xs mt-1">
                      {errors.slug.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5 text-mutedText">
                    Category *
                  </label>
                  <select
                    {...register("category")}
                    className="flex h-10 w-full rounded border border-borderDark bg-background px-3 py-2 text-sm text-primaryText focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neon-cyan"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="text-danger text-xs mt-1">
                      {errors.category.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5 text-mutedText">
                    Short Description
                  </label>
                  <textarea
                    {...register("description_short")}
                    maxLength={160}
                    rows={2}
                    placeholder="A brief hook line..."
                    className="flex w-full rounded border border-borderDark bg-background px-3 py-2 text-sm text-primaryText focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neon-cyan resize-none"
                  />
                  <p className="text-xs text-mutedText/60 mt-1 text-right">
                    {shortDesc.length}/160
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5 text-mutedText">
                    Full Description
                  </label>
                  <div className="border border-borderDark rounded overflow-hidden">
                    <div className="bg-surfaceLighter p-2 border-b border-borderDark flex gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          editor?.chain().focus().toggleBold().run()
                        }
                        className={`px-2 py-1 text-xs font-bold rounded ${
                          editor?.isActive("bold")
                            ? "bg-borderDark text-white"
                            : "text-mutedText hover:bg-borderDark"
                        }`}
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          editor?.chain().focus().toggleItalic().run()
                        }
                        className={`px-2 py-1 text-xs italic rounded ${
                          editor?.isActive("italic")
                            ? "bg-borderDark text-white"
                            : "text-mutedText hover:bg-borderDark"
                        }`}
                      >
                        I
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          editor
                            ?.chain()
                            .focus()
                            .toggleHeading({ level: 2 })
                            .run()
                        }
                        className={`px-2 py-1 text-xs rounded ${
                          editor?.isActive("heading")
                            ? "bg-borderDark text-white"
                            : "text-mutedText hover:bg-borderDark"
                        }`}
                      >
                        H2
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          editor?.chain().focus().toggleBulletList().run()
                        }
                        className={`px-2 py-1 text-xs rounded ${
                          editor?.isActive("bulletList")
                            ? "bg-borderDark text-white"
                            : "text-mutedText hover:bg-borderDark"
                        }`}
                      >
                        • List
                      </button>
                    </div>
                    <EditorContent editor={editor} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5 text-mutedText">
                    Material
                  </label>
                  <Input
                    {...register("material")}
                    placeholder="925 Sterling Silver"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-mutedText">
                    Tags
                  </label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Type + Enter"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      className="max-w-xs"
                    />
                    <Button type="button" onClick={addTag} variant="outline">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="bg-surfaceLighter border border-borderDark px-2.5 py-1 rounded text-xs flex items-center gap-1.5"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() =>
                            setTags(tags.filter((tag) => tag !== t))
                          }
                          className="text-danger hover:text-red-400"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </section>

              {/* SECTION 2: Pricing & Status */}
              <section className="space-y-4 border-t border-borderDark pt-6">
                <h3 className="text-sm font-bold text-mutedText uppercase tracking-wider">
                  Pricing & Status
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-mutedText">
                      Price (₹) *
                    </label>
                    <Input
                      {...register("price")}
                      type="number"
                      placeholder="2999"
                    />
                    {errors.price && (
                      <p className="text-danger text-xs mt-1">
                        {errors.price.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-mutedText">
                      Compare-at Price (₹)
                    </label>
                    <Input
                      {...register("compare_at_price")}
                      type="number"
                      placeholder="3999"
                    />
                  </div>
                </div>

                <div className="flex gap-8">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register("stock_status")}
                      className="w-5 h-5 accent-neon-green bg-background border-borderDark rounded"
                    />
                    <span className="text-sm font-medium">In Stock</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register("is_featured")}
                      className="w-5 h-5 accent-neon-purple bg-background border-borderDark rounded"
                    />
                    <span className="text-sm font-medium">Featured</span>
                  </label>
                </div>
              </section>

              {/* SECTION 3: Variants */}
              <section className="border-t border-borderDark pt-6">
                <button
                  type="button"
                  onClick={() => setVariantsOpen(!variantsOpen)}
                  className="flex items-center justify-between w-full text-sm font-bold text-mutedText uppercase tracking-wider"
                >
                  Variants ({variants.length})
                  {variantsOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {variantsOpen && (
                  <div className="mt-4 space-y-4">
                    {variants.map((vg, i) => (
                      <div
                        key={i}
                        className="bg-surfaceLighter p-4 rounded border border-borderDark space-y-3"
                      >
                        <div className="flex items-center gap-2">
                          <Input
                            value={vg.group}
                            onChange={(e) =>
                              updateVariantGroup(i, e.target.value)
                            }
                            placeholder='Group name (e.g. "Size")'
                            className="flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => removeVariantGroup(i)}
                            className="p-2 hover:bg-danger/20 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-danger" />
                          </button>
                        </div>
                        <Input
                          value={vg.values.map((v) => v.label).join(", ")}
                          onChange={(e) =>
                            updateVariantValues(i, e.target.value)
                          }
                          placeholder="Values: XS, S, M, L, XL"
                        />
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addVariantGroup}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Add Variant Group
                    </Button>
                  </div>
                )}
              </section>

              {/* SECTION 4: Images */}
              <section className="border-t border-borderDark pt-6 space-y-4">
                <h3 className="text-sm font-bold text-mutedText uppercase tracking-wider">
                  Images
                </h3>
                <ImageManager
                  initialImages={images}
                  bucket="product-images"
                  folder={`products/${productId}`}
                  onChange={setImages}
                />
              </section>
            </div>

            {/* SECTION 5: Sticky save bar */}
            <div className="shrink-0 border-t border-borderDark bg-surface px-6 py-4 flex items-center justify-end gap-3">
              {!isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSaving}
                  onClick={handleSubmit((data) => onSubmit(data, false))}
                >
                  Save as Draft
                </Button>
              )}
              <Button
                type="button"
                variant="neon"
                disabled={isSaving}
                onClick={handleSubmit((data) => onSubmit(data, true))}
              >
                {isSaving
                  ? "Saving..."
                  : isEditing
                  ? "Save Changes"
                  : "Publish"}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
