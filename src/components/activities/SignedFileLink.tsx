import { ReactNode, useState, useEffect } from "react";
import { getSignedUrl } from "@/lib/storage-utils";

interface SignedFileLinkProps {
  bucket: string;
  path: string;
  children: ReactNode;
  className?: string;
}

export function SignedFileLink({ bucket, path, children, className }: SignedFileLinkProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSignedUrl(bucket, path, 3600).then((signed) => {
      if (!cancelled) setUrl(signed);
    });
    return () => { cancelled = true; };
  }, [bucket, path]);

  return (
    <a href={url || "#"} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}
