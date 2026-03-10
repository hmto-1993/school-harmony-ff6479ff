import { useState, useEffect } from "react";
import { getSignedUrl } from "@/lib/storage-utils";

/**
 * Hook to resolve a storage path/URL to a signed URL for private buckets.
 * Caches the result for the lifetime of the component.
 */
export function useSignedUrl(bucket: string, pathOrUrl: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!pathOrUrl) { setUrl(null); return; }
    let cancelled = false;
    getSignedUrl(bucket, pathOrUrl, 3600).then((signed) => {
      if (!cancelled) setUrl(signed);
    });
    return () => { cancelled = true; };
  }, [bucket, pathOrUrl]);

  return url;
}
