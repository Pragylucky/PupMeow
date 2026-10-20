/**
 * Simulates ~1000 concurrent visitors against a running Next production server.
 * Usage: BASE_URL=http://127.0.0.1:3000 npx tsx scripts/load-test-1000.mts
 * Optional: RUN_DB=1 — also stress PostgREST read paths (uses .env.local).
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const BASE = (process.env.BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const PEAK_CONCURRENCY = Number(process.env.PEAK_CONCURRENCY ?? "1000");
const RUN_DB = process.env.RUN_DB === "1";

type Sample = { ok: boolean; status: number; ms: number; route: string; error?: string };

const ROUTES: { path: string; weight: number; label: string }[] = [
  { path: "/lost", weight: 35, label: "lost_list" },
  { path: "/adopt", weight: 25, label: "adopt_list" },
  { path: "/", weight: 20, label: "landing" },
  { path: "/login", weight: 8, label: "login" },
  { path: "/feed", weight: 7, label: "feed_redirect" },
  { path: "/privacy", weight: 3, label: "privacy" },
  { path: "/robots.txt", weight: 2, label: "robots" },
];

function pickRoute(): string {
  const total = ROUTES.reduce((s, r) => s + r.weight, 0);
  let n = Math.random() * total;
  for (const r of ROUTES) {
    n -= r.weight;
    if (n <= 0) return r.path;
  }
  return ROUTES[0].path;
}

function labelFor(path: string) {
  return ROUTES.find((r) => r.path === path)?.label ?? path;
}

async function hit(path: string): Promise<Sample> {
  const route = labelFor(path);
  const start = performance.now();
  try {
    const res = await fetch(`${BASE}${path}`, {
      redirect: "manual",
      headers: { Accept: "text/html", "User-Agent": "PupmeowLoadTest/1.0" },
      signal: AbortSignal.timeout(120_000),
    });
    const ms = performance.now() - start;
    const ok = res.status < 500;
    return { ok, status: res.status, ms, route };
  } catch (err) {
    const ms = performance.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 0, ms, route, error: message };
  }
}

function percentile(sorted: number[], p: number) {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, i)];
}

function summarize(samples: Sample[]) {
  const byRoute = new Map<string, Sample[]>();
  for (const s of samples) {
    const list = byRoute.get(s.route) ?? [];
    list.push(s);
    byRoute.set(s.route, list);
  }
  const latencies = samples.map((s) => s.ms).sort((a, b) => a - b);
  const failed = samples.filter((s) => !s.ok);
  const statuses = new Map<number, number>();
  for (const s of samples) statuses.set(s.status, (statuses.get(s.status) ?? 0) + 1);

  const routeStats = [...byRoute.entries()].map(([route, list]) => {
    const l = list.map((x) => x.ms).sort((a, b) => a - b);
    const fail = list.filter((x) => !x.ok);
    return {
      route,
      count: list.length,
      fail: fail.length,
      p50: percentile(l, 50),
      p95: percentile(l, 95),
      p99: percentile(l, 99),
      max: l[l.length - 1] ?? 0,
    };
  });

  return {
    total: samples.length,
    failed: failed.length,
    failRate: samples.length ? (failed.length / samples.length) * 100 : 0,
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
    max: latencies[latencies.length - 1] ?? 0,
    statuses: [...statuses.entries()].sort((a, b) => a[0] - b[0]),
    errors: [...new Set(failed.map((f) => f.error).filter(Boolean))] as string[],
    routes: routeStats.sort((a, b) => b.count - a.count),
  };
}

async function runWave(concurrency: number): Promise<Sample[]> {
  const paths = Array.from({ length: concurrency }, () => pickRoute());
  return Promise.all(paths.map((p) => hit(p)));
}

async function warmup() {
  for (const p of ["/", "/lost", "/login"]) await hit(p);
}

async function runHttpPhases() {
  const phases = [50, 200, 500, PEAK_CONCURRENCY].filter((n, i, arr) => n <= PEAK_CONCURRENCY && (i === 0 || n > arr[i - 1]));
  const phaseResults: { concurrency: number; summary: ReturnType<typeof summarize> }[] = [];

  console.log(`\n[http] BASE_URL=${BASE} peak=${PEAK_CONCURRENCY}`);
  await warmup();

  for (const c of phases) {
    console.log(`[http] wave concurrency=${c} ...`);
    const samples = await runWave(c);
    const summary = summarize(samples);
    phaseResults.push({ concurrency: c, summary });
    console.log(
      `  ok=${summary.total - summary.failed}/${summary.total} p95=${summary.p95.toFixed(0)}ms p99=${summary.p99.toFixed(0)}ms max=${summary.max.toFixed(0)}ms`,
    );
    if (summary.errors.length) console.log(`  errors: ${summary.errors.slice(0, 5).join(" | ")}`);
    await new Promise((r) => setTimeout(r, 2000));
  }

  return phaseResults;
}

async function runDbReads() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return { skipped: true, reason: "missing NEXT_PUBLIC_SUPABASE_URL or anon key" };
  }

  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const n = PEAK_CONCURRENCY;
  console.log(`\n[db] ${n} parallel anon reads (lost_found + posts)...`);

  const tasks = Array.from({ length: n }, async (_, i) => {
    const start = performance.now();
    try {
      const q = i % 2 === 0
        ? client.from("lost_found").select("id,species,last_seen_area,status").eq("status", "open").limit(20)
        : client.from("posts").select("id,created_at").order("created_at", { ascending: false }).limit(10);
      const { error } = await q;
      const ms = performance.now() - start;
      return { ok: !error, ms, error: error?.message };
    } catch (err) {
      return { ok: false, ms: performance.now() - start, error: err instanceof Error ? err.message : String(err) };
    }
  });

  const results = await Promise.all(tasks);
  const latencies = results.map((r) => r.ms).sort((a, b) => a - b);
  const failed = results.filter((r) => !r.ok);
  return {
    skipped: false,
    total: n,
    failed: failed.length,
    failRate: (failed.length / n) * 100,
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
    max: latencies[latencies.length - 1] ?? 0,
    sampleErrors: [...new Set(failed.map((f) => f.error).filter(Boolean))].slice(0, 8),
  };
}

async function runAiGuard() {
  console.log("\n[api] unauthenticated POST /api/ai/chat (expect 401/503, no AI spend)...");
  const start = performance.now();
  try {
    const res = await fetch(`${BASE}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: BASE },
      body: JSON.stringify({ message: "load test" }),
      signal: AbortSignal.timeout(30_000),
    });
    const text = await res.text();
    return { status: res.status, ms: performance.now() - start, bodyPreview: text.slice(0, 120) };
  } catch (err) {
    return { status: 0, ms: performance.now() - start, bodyPreview: err instanceof Error ? err.message : String(err) };
  }
}

const httpPhases = await runHttpPhases();
const aiProbe = await runAiGuard();
const db = RUN_DB ? await runDbReads() : { skipped: true, reason: "RUN_DB not set" };

const peak = httpPhases[httpPhases.length - 1]?.summary;
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE,
  peakConcurrency: PEAK_CONCURRENCY,
  httpPhases,
  aiProbe,
  db,
  peakSummary: peak,
};

console.log("\n--- JSON report (paste into LOAD_TEST_1000_USERS.md) ---");
console.log(JSON.stringify(report, null, 2));
