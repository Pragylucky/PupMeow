import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const n = Number(process.env.N ?? "200");

function percentile(sorted: number[], p: number) {
  const i = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, i)];
}

async function wave(label: string, query: () => Promise<{ error: { message: string } | null }>) {
  const startAll = performance.now();
  const results = await Promise.all(
    Array.from({ length: n }, async () => {
      const t0 = performance.now();
      const { error } = await query();
      return { ok: !error, ms: performance.now() - t0, error: error?.message };
    }),
  );
  const lat = results.map((r) => r.ms).sort((a, b) => a - b);
  const failed = results.filter((r) => !r.ok);
  console.log(
    JSON.stringify({
      label,
      n,
      wallMs: performance.now() - startAll,
      failed: failed.length,
      p50: percentile(lat, 50),
      p95: percentile(lat, 95),
      errors: [...new Set(failed.map((f) => f.error))].slice(0, 5),
    }),
  );
}

const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

await wave("lost_found_open_20", () =>
  client.from("lost_found").select("id,species,last_seen_area,status").eq("status", "open").limit(20),
);
await wave("posts_feed_10", () =>
  client.from("posts").select("id,created_at").order("created_at", { ascending: false }).limit(10),
);
