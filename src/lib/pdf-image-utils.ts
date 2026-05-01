import { supabase } from "@/integrations/supabase/client";

type StorageObjectRef = {
  bucket: string;
  path: string;
};

const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
};

function inferImageMime(src: string): string {
  try {
    const pathname = new URL(src, getBrowserOrigin()).pathname;
    const ext = pathname.split(".").pop()?.toLowerCase() || "png";
    return IMAGE_MIME_BY_EXTENSION[ext] || "image/png";
  } catch {
    return "image/png";
  }
}

function getBrowserOrigin(): string {
  return typeof window !== "undefined" ? window.location.origin : "http://localhost";
}

function parseStorageObjectUrl(src: string): StorageObjectRef | null {
  try {
    const url = new URL(src, getBrowserOrigin());
    const marker = "/storage/v1/object/";
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex === -1) return null;

    let objectPath = url.pathname.slice(markerIndex + marker.length);
    if (objectPath.startsWith("public/")) objectPath = objectPath.slice("public/".length);
    if (objectPath.startsWith("sign/")) return null;

    const [bucket, ...pathParts] = objectPath.split("/");
    if (!bucket || pathParts.length === 0) return null;

    return {
      bucket: decodeURIComponent(bucket),
      path: decodeURIComponent(pathParts.join("/")),
    };
  } catch {
    return null;
  }
}

function blobToDataUrl(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

async function downloadStorageBlob(src: string): Promise<Blob | null> {
  const ref = parseStorageObjectUrl(src);
  if (!ref) return null;

  const { data, error } = await supabase.storage.from(ref.bucket).download(ref.path);
  if (error || !data) return null;
  return data.type ? data : new Blob([data], { type: inferImageMime(src) });
}

async function fetchImageBlob(src: string): Promise<Blob | null> {
  try {
    const response = await fetch(src, { mode: "cors", credentials: "omit" });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (blob.type && blob.type.startsWith("image/")) return blob;
    if (!blob.type || blob.type === "application/octet-stream") {
      return new Blob([blob], { type: inferImageMime(src) });
    }
    return null;
  } catch {
    return null;
  }
}

export async function imageUrlToDataUrl(src: string): Promise<string | null> {
  if (!src) return null;
  if (src.startsWith("data:")) return src;

  const storageBlob = await downloadStorageBlob(src);
  if (storageBlob) return blobToDataUrl(storageBlob);

  const fetchedBlob = await fetchImageBlob(src);
  if (fetchedBlob) return blobToDataUrl(fetchedBlob);

  return null;
}