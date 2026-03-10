import { useState, useEffect } from "react";
import { getSignedUrl } from "@/lib/storage-utils";

interface SignedImageProps {
  bucket: string;
  path: string;
  alt?: string;
  className?: string;
}

export function SignedImage({ bucket, path, alt = "", className }: SignedImageProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSignedUrl(bucket, path, 3600).then((signed) => {
      if (!cancelled) setUrl(signed);
    });
    return () => { cancelled = true; };
  }, [bucket, path]);

  if (!url) return null;
  return <img src={url} alt={alt} className={className} />;
}
