/**
 * Ensures storage buckets exist with the right limits (the 0012 migration also creates them).
 * Usage: npm run setup:storage
 */
import { admin } from "./lib";

const IMG = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const BUCKETS: { id: string; public: boolean; types: string[] }[] = [
  { id: "avatars", public: true, types: IMG },
  { id: "pets", public: true, types: IMG },
  { id: "posts", public: true, types: IMG },
  { id: "lost-found", public: true, types: IMG },
  { id: "adoptions", public: true, types: IMG },
  { id: "matchmaking", public: true, types: IMG },
  { id: "documents", public: false, types: [...IMG.filter((t) => t !== "image/gif"), "application/pdf"] },
];

async function main() {
  const sb = admin();
  const { data: existing } = await sb.storage.listBuckets();
  for (const b of BUCKETS) {
    const opts = { public: b.public, fileSizeLimit: 5 * 1024 * 1024, allowedMimeTypes: b.types };
    const has = existing?.some((e) => e.id === b.id);
    const { error } = has ? await sb.storage.updateBucket(b.id, opts) : await sb.storage.createBucket(b.id, opts);
    console.log(`${has ? "updated" : "created"} ${b.id}${error ? ` — ERROR ${error.message}` : ""}`);
  }
  console.log("Storage policies are created by supabase/migrations/20261011001200_storage.sql");
}

main().catch((e) => { console.error(e); process.exit(1); });
