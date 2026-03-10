import { supabase } from "@/integrations/supabase/client";

/**
 * Generates a signed URL for a file in a private bucket.
 * Handles both legacy full URLs and new path-only formats.
 * Returns the original URL if it's not a storage path.
 */
export async function getSignedUrl(
  bucket: string,
  filePathOrUrl: string,
  expiresIn = 60 * 60 // 1 hour default
): Promise<string> {
  if (!filePathOrUrl) return "";

  // If it's already a full non-storage URL, return as-is
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  
  // Extract path from full Supabase storage URL if needed
  let path = filePathOrUrl;
  const storagePrefix = `${supabaseUrl}/storage/v1/object/public/${bucket}/`;
  if (filePathOrUrl.startsWith(storagePrefix)) {
    path = filePathOrUrl.replace(storagePrefix, "");
  } else if (filePathOrUrl.startsWith("http")) {
    // External URL, return as-is
    return filePathOrUrl;
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    console.warn("Failed to create signed URL:", error?.message);
    return filePathOrUrl;
  }

  return data.signedUrl;
}

/**
 * Hook-friendly: generates signed URLs for multiple files at once.
 */
export async function getSignedUrls(
  bucket: string,
  paths: string[],
  expiresIn = 60 * 60
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  await Promise.all(
    paths.map(async (p) => {
      results[p] = await getSignedUrl(bucket, p, expiresIn);
    })
  );
  return results;
}
