"use client";

import { createClient } from "@/lib/supabase/client";
import { env } from "@/lib/env";
import type { Bucket } from "@/lib/storage-paths";

/** Upload with real progress events (supabase-js has no progress callback), via the Storage REST API. */
export async function uploadWithProgress(opts: {
  bucket: Bucket;
  path: string;
  blob: Blob;
  contentType: string;
  onProgress?: (pct: number) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Please sign in again to upload.");

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${env.supabaseUrl}/storage/v1/object/${opts.bucket}/${opts.path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", env.supabaseAnonKey);
    xhr.setRequestHeader("Content-Type", opts.contentType);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "max-age=31536000");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else if (xhr.status === 413) reject(new Error("File is larger than 5 MB."));
      else reject(new Error("Upload failed. Tap retry."));
    };
    xhr.onerror = () => reject(new Error("Network error. Tap retry."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    opts.signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(opts.blob);
  });
}

export function publicUrl(bucket: Bucket, path: string) {
  return `${env.supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

export function randomName(ext: string) {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${id}.${ext}`;
}
