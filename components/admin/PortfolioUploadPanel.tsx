"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Trash2 } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useToast } from "@/hooks/useToast";
import { createClient } from "@/lib/supabase";

interface UploadRow {
  id: string;
  file: File;
  previewUrl: string;
  publicUrl: string | null;
  artist_id: string;
  style_tag: string;
  description: string;
  uploading: boolean;
  progress: number;
}

interface Artist {
  id: string;
  name: string;
}

const STYLE_TAGS = [
  "Traditional",
  "Neo-trad",
  "Blackwork",
  "Fine-line",
  "Geometric",
  "Custom",
];

interface PortfolioUploadPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: () => void;
}

export default function PortfolioUploadPanel({
  isOpen,
  onClose,
  onUploaded,
}: PortfolioUploadPanelProps) {
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { upload } = useImageUpload();
  const { toast } = useToast();

  // Fetch artists
  useEffect(() => {
    if (isOpen) {
      const supabase = createClient();
      supabase
        .from("artists")
        .select("id, name")
        .order("name")
        .then(({ data }) => {
          if (data) setArtists(data);
        });
    }
  }, [isOpen]);

  // Drop handler
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newRows: UploadRow[] = acceptedFiles.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      publicUrl: null,
      artist_id: "",
      style_tag: "",
      description: "",
      uploading: false,
      progress: 0,
    }));
    setRows((prev) => [...prev, ...newRows]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/webp": [],
      "image/avif": [],
    },
    maxSize: 5 * 1024 * 1024,
  });

  // Update row field
  const updateRow = (id: string, field: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  // Remove row
  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Upload all
  const handleUploadAll = async () => {
    if (rows.length === 0) return;
    setIsSaving(true);

    try {
      const uploadedRows: UploadRow[] = [];

      for (const row of rows) {
        const artistPath = row.artist_id || "uncategorized";

        setRows((prev) =>
          prev.map((r) =>
            r.id === row.id ? { ...r, uploading: true } : r
          )
        );

        try {
          const result = await upload(row.file, "portfolio", artistPath);
          const publicUrl = result.url;
          uploadedRows.push({ ...row, publicUrl });
          setRows((prev) =>
            prev.map((r) =>
              r.id === row.id
                ? { ...r, uploading: false, progress: 100, publicUrl }
                : r
            )
          );
        } catch {
          setRows((prev) =>
            prev.map((r) =>
              r.id === row.id ? { ...r, uploading: false } : r
            )
          );
        }
      }

      // Insert rows into DB
      if (uploadedRows.length > 0) {
        const items = uploadedRows
          .filter((r) => r.publicUrl)
          .map((r) => ({
            image_url: r.publicUrl,
            artist_id: r.artist_id || null,
            style_tag: r.style_tag || null,
            description: r.description || null,
          }));

        const res = await fetch("/api/admin/portfolio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(items),
        });

        if (!res.ok) throw new Error("Failed to save portfolio items");

        // Revalidate
        await fetch("/api/admin/revalidate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paths: ["/studio", "/studio/gallery"],
          }),
        });

        toast.success(
          `${uploadedRows.length} photo(s) added to portfolio`
        );
        setRows([]);
        onUploaded();
        onClose();
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Upload failed"
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Escape key + body scroll lock
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handler);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
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
                Upload Photos
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-surfaceLighter rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-6">
              {/* Drop zone */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                  isDragActive
                    ? "border-neon-green bg-neon-green/5 shadow-glowGreen"
                    : "border-borderDark hover:border-[#3a3a3a]"
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-8 h-8 mx-auto mb-2 text-mutedText" />
                <p className="text-sm text-mutedText">
                  {isDragActive
                    ? "Drop images here..."
                    : "Drag & drop photos, or click to browse"}
                </p>
                <p className="text-xs text-mutedText/60 mt-1">
                  JPEG, PNG, WebP, AVIF — max 5MB each
                </p>
              </div>

              {/* Upload rows */}
              {rows.length > 0 && (
                <div className="space-y-4">
                  {rows.map((row) => (
                    <div
                      key={row.id}
                      className="flex gap-4 bg-surface border border-borderDark rounded p-3"
                    >
                      {/* Thumbnail */}
                      <div className="w-[60px] h-[60px] shrink-0 rounded overflow-hidden bg-surfaceLighter">
                        <img
                          src={row.previewUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Fields */}
                      <div className="flex-1 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={row.artist_id}
                            onChange={(e) =>
                              updateRow(row.id, "artist_id", e.target.value)
                            }
                            className="h-8 text-xs rounded border border-borderDark bg-background px-2 text-primaryText outline-none focus:ring-1 focus:ring-neon-cyan"
                          >
                            <option value="">Select Artist</option>
                            {artists.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name}
                              </option>
                            ))}
                          </select>
                          <select
                            value={row.style_tag}
                            onChange={(e) =>
                              updateRow(row.id, "style_tag", e.target.value)
                            }
                            className="h-8 text-xs rounded border border-borderDark bg-background px-2 text-primaryText outline-none focus:ring-1 focus:ring-neon-cyan"
                          >
                            <option value="">Style Tag</option>
                            {STYLE_TAGS.map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                        <Input
                          value={row.description}
                          onChange={(e) =>
                            updateRow(row.id, "description", e.target.value)
                          }
                          placeholder="Description (optional)"
                          className="h-8 text-xs"
                        />
                        {row.uploading && (
                          <div className="h-1 bg-borderDark rounded-full overflow-hidden">
                            <div
                              className="h-full bg-neon-green rounded-full transition-all"
                              style={{ width: `${row.progress}%` }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeRow(row.id)}
                        className="p-1.5 h-fit hover:bg-danger/20 rounded transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4 text-danger" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom bar */}
            {rows.length > 0 && (
              <div className="shrink-0 border-t border-borderDark bg-surface px-6 py-4 flex items-center justify-between">
                <span className="text-sm text-mutedText">
                  {rows.length} photo(s) ready
                </span>
                <Button
                  variant="neon"
                  onClick={handleUploadAll}
                  disabled={isSaving}
                >
                  {isSaving ? "Uploading..." : "Upload All"}
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
