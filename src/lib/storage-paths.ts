import { env } from "@/lib/env";

export const PUBLIC_BUCKETS = ["avatars", "pets", "posts", "lost-found", "adoptions", "matchmaking"] as const;
export type PublicBucket = (typeof PUBLIC_BUCKETS)[number];
export type Bucket = PublicBucket | "documents";

export function publicUrlPrefix(bucket: PublicBucket) {
  return `${env.supabaseUrl}/storage/v1/object/public/${bucket}/`;
}

/** True when `url` is a public object in `bucket` inside the user's own folder. */
export function isOwnUpload(url: string, bucket: PublicBucket, userId: string) {
  return url.startsWith(`${publicUrlPrefix(bucket)}${userId}/`);
}

/** All URLs belong to the user's folder in that bucket. */
export function allOwnUploads(urls: string[], bucket: PublicBucket, userId: string) {
  return urls.every((u) => isOwnUpload(u, bucket, userId));
}

/** Private documents are stored as paths "<userId>/<file>". */
export function isOwnDocumentPath(path: string, userId: string) {
  return /^[0-9a-f-]{36}\/[\w.-]+$/.test(path) && path.startsWith(`${userId}/`);
}
