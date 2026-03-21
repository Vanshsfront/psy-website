import { createClient } from "@/lib/supabase";

/**
 * Delete a file from a Supabase Storage bucket.
 */
export async function deleteFile(
  bucket: string,
  path: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw new Error(`Failed to delete file: ${error.message}`);
}

/**
 * Get the full public URL for a file in a Supabase Storage bucket.
 */
export function getPublicUrl(bucket: string, path: string): string {
  const supabase = createClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Extract the storage path from a full Supabase public URL.
 * Needed when deleting a file — the API expects a relative path,
 * but we usually store the full URL in the database.
 *
 * Example:
 *   Input:  "https://xyz.supabase.co/storage/v1/object/public/product-images/products/abc/img.webp"
 *   Output: "products/abc/img.webp"
 */
export function extractPathFromUrl(url: string): string {
  const marker = "/storage/v1/object/public/";
  const markerIndex = url.indexOf(marker);
  if (markerIndex === -1) return url;

  const afterMarker = url.substring(markerIndex + marker.length);
  // The first segment is the bucket name, rest is the path
  const slashIndex = afterMarker.indexOf("/");
  if (slashIndex === -1) return afterMarker;
  return afterMarker.substring(slashIndex + 1);
}
