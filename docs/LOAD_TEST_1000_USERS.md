# Load test: ~1,000 concurrent visitors

**Date:** 2026-10-20  
**Environment:** Local production build (`next build` + `next start` on `127.0.0.1:3000`), traffic mixed to match expected public browsing (lost/adopt/landing/login).  
**Harness:** `scripts/load-test-1000.mts` (ramp 50 → 200 → 500 → 1,000 parallel requests per wave).  
**Not in scope:** 1,000 distinct signed-in sessions with Realtime (requires staging + token farm); Supabase direct parallel reads from this runner failed TLS (`UNABLE_TO_GET_ISSUER_CERT_LOCALLY`) — **re-run DB section on your laptop** with `NODE_EXTRA_CA_CERTS` or after `npx tsx scripts/load-test-db-only.mts`.

---

## Executive summary

| Concurrency | Success rate | p95 latency | Verdict |
|-------------|--------------|-------------|---------|
| 50 | **100%** | ~8.4s* | OK (warm-up skew on `/`) |
| 200 | **100%** | ~8.9s* | OK under moderate burst |
| 500 | **84.6%** | **120s** (timeouts) | **Degraded** — landing page queue |
| 1,000 | **43.5%** | **120s** (timeouts) | **Fails** — server saturated |

\*First waves include cold start; listing routes (`/lost`, `/adopt`) stayed ~170–1,700ms until the 1,000 wave.

**Bottom line:** The app is fine for a **small beta** (tens of simultaneous users on Vercel + Supabase). **~1,000 simultaneous hits on a single Node process** is beyond current architecture without caching, middleware slimming, and Supabase pooling. That is expected for a SSR Next app with **Supabase `getUser()` on almost every request**.

---

## What we simulated

Weighted random paths (anonymous / logged-out traffic):

| Route | Weight | Notes |
|-------|--------|--------|
| `/lost` | 35% | Public list + DB |
| `/adopt` | 25% | Public list + DB |
| `/` | 20% | Landing; `revalidate = 300` but still SSR per hit locally |
| `/login` | 8% | Auth UI |
| `/feed` | 7% | Middleware → 307 to `/login` |
| `/privacy` | 3% | Static marketing |
| `/robots.txt` | 2% | Excluded from heavy middleware matcher |

Each “user” = one concurrent HTTP request (not a sustained session). Peak wave = **1,000 parallel requests**.

---

## Errors observed

### 1. HTTP timeouts (500 & 1,000 waves)

- **Symptom:** `The operation was aborted due to timeout` (120s client timeout), `fetch failed`.
- **Share:** 15.4% failures @ 500 concurrent; **56.5%** @ 1,000 concurrent.
- **Hot spots:** `/` (landing) failed first under load; then `/lost` and `/adopt` backed up once the event loop and Supabase were saturated.
- **Likely cause:** Single-process Node + **per-request middleware** calling `supabase.auth.getUser()` + multiple server-side Supabase queries per page. No CDN edge cache on dynamic listing pages.

### 2. AI API probe returned 403 (not 401)

- **Request:** `POST /api/ai/chat` with `Origin: http://127.0.0.1:3000`.
- **Response:** `403 {"error":"Forbidden"}` from `sameOrigin()` in `src/lib/ai/guard.ts`.
- **Cause:** Host mismatch if the browser uses `localhost` but `Origin` is `127.0.0.1` (or vice versa). Real users on one canonical domain are fine; **fix for dev:** treat `localhost` and `127.0.0.1` as equivalent, or always use `NEXT_PUBLIC_SITE_URL` for origin checks.

### 3. Supabase parallel read script (runner environment)

- **Symptom:** 100% `TypeError: fetch failed` for 10–1,000 parallel REST calls from `scripts/load-test-db-only.mts`.
- **Cause:** TLS `unable to get local issuer certificate` in this CLI environment — **not necessarily a production bug**. Re-run on your machine against the same project to measure PostgREST p95.

### 4. Predicted errors at 1,000 **signed-in** users (not fully executed)

From architecture review (mark as **risk** until staging test):

| Risk | Why |
|------|-----|
| **Supabase Realtime connection limit** | Each active user opens a Realtime channel in `notification-bell.tsx`. Free/Pro tiers cap concurrent Realtime connections; 1,000 online users can exceed limits. |
| **Auth `getUser()` amplification** | Middleware validates JWT with Supabase on most routes → 1,000 users × navigation rate = high Auth API volume (latency + rate limits). |
| **Feed page DB cost** | Every feed load runs **4 parallel queries**, including `posts` **limit 200** only for hashtag sidebar (`feed/page.tsx`). At 1,000 active feeders this is heavy Postgres + egress. |
| **AI cost spikes** | Lost/found create: vision + embed **outside** the 30/day user cap; moderation LLM **outside** cap. Spam or viral lost posts → Gemini bill. |
| **Vercel function duration** | AI routes `maxDuration = 60`; many concurrent streams → higher compute bill on Pro. |
| **No CAPTCHA on login** | Documented in `SECURITY.md`; 1,000 bots can burn magic-link email quota. |

---

## Pros (what held up well)

1. **No 5xx from application logic** in sub-200 concurrent waves — failures were timeouts/queueing, not unhandled crashes.
2. **Public listing routes** (`/lost`, `/adopt`) stayed stable longer than landing under stress (lower p95 until global saturation).
3. **Rate limits in Postgres** (posts, comments, listings, AI budget) protect **cost and abuse** even if someone bypasses the UI.
4. **AI gated** — without keys, Kaia and paid features stay off; with keys, **30 messages/user/day** caps chat/write/health.
5. **Landing ISR** — `revalidate = 300` on `/` reduces DB load for anonymous home traffic **once** edge/cache is warm (Vercel); local `next start` does not replicate CDN caching.
6. **Security model** — RLS, column grants, contact RPCs, upload path checks; load test did not expose data leaks.
7. **Image pipeline** — client WebP + 5MB cap limits storage/egress vs raw uploads.
8. **Feed redirect** (`/feed` → login) stayed relatively fast in early waves (middleware-only path for anonymous users).

---

## Fix backlog (prioritized)

### P0 — Before marketing to 1,000+ people

| # | Issue | Suggested fix |
|---|--------|----------------|
| 1 | Middleware `getUser()` on every page view | Skip auth refresh on clearly public paths (`/lost`, `/adopt`, `/privacy`, static marketing); or use Supabase cookie session locally without network round-trip where safe. |
| 2 | Feed hashtag scan (200 rows) | Replace with materialized tag counts, RPC, or cache (`unstable_cache` / Redis) with 5–15 min TTL. |
| 3 | Realtime at scale | Poll notifications every 60s on mobile, or enable Realtime only on `/notifications`; document Supabase plan connection headroom. |
| 4 | Canonical host for AI | Align `sameOrigin` with `NEXT_PUBLIC_SITE_URL`; allow localhost aliases in dev. |
| 5 | Custom SMTP + CAPTCHA | Before large signup campaigns (Supabase email limits). |

### P1 — Performance / cost

| # | Issue | Suggested fix |
|---|--------|----------------|
| 6 | Listing pages always dynamic SSR | Add `revalidate = 60` on `/lost` and `/adopt` list pages; use `tags` revalidation on new listing. |
| 7 | Moderation LLM on every post | Sample or throttle: only run LLM when heuristics `flag`, or cap LLM moderations/minute globally. |
| 8 | Lost embedding on create | Queue (Supabase Edge Function / cron) instead of blocking server action; disable embeddings until queue worker exists. |
| 9 | Gemini budget | GCP billing alert; optional global daily AI spend kill-switch in env. |

### P2 — Observability

| # | Issue | Suggested fix |
|---|--------|----------------|
| 10 | No APM | Vercel Analytics + Supabase dashboard alerts (CPU, connections, Auth errors). |
| 11 | Repeatable load tests | Add CI smoke k6 at 50 VUs; run 1,000 VU manually before big PR pushes. |

---

## Cost sketch: 1,000 registered users (not all online at once)

Assume **100 concurrent** at peak (10% of 1,000) — realistic for a community app:

| Service | Rough expectation |
|---------|-------------------|
| **Vercel Hobby** | May suffice early; watch bandwidth and serverless minutes if AI + OG images spike. |
| **Supabase Free** | Tight on egress, DB size, Realtime; **Pro** likely before sustained 1,000 MAU with photos. |
| **Gemini** | With 30 msgs/user/day cap: theoretical max 30k calls/day if every user maxes AI — set billing alerts. Embeddings + moderation add on top. |
| **Email (magic link)** | Custom SMTP required; Supabase built-in not viable at scale. |

Cheapest launch path remains: **deploy without AI env vars**, enable Kaia after you have SMTP + monitoring.

---

## Raw metrics (peak wave, n = 1,000)

- **Completed:** 435 / 1,000 (43.5%)
- **p50 / p95 / p99:** ~63.2s / 120.0s / 120.0s (timeout ceiling)
- **Status codes:** 401×0, 200×401, 307×34, 0×565 (network/timeout)

Per-route failures @ 1,000:

| Route | Requests | Failed |
|-------|----------|--------|
| lost_list | 345 | 166 |
| adopt_list | 264 | 125 |
| landing | 176 | 160 |
| login | 74 | 34 |
| feed_redirect | 73 | 39 |
| privacy | 39 | 23 |
| robots | 29 | 18 |

Full JSON: run the script and capture stdout, or see agent run on 2026-10-20 in project history.

---

## How to re-run

```bash
# Terminal 1
npm run build && npm run start -- -p 3000 -H 127.0.0.1

# Terminal 2
PEAK_CONCURRENCY=1000 RUN_DB=1 DOTENV_CONFIG_PATH=.env.local npx tsx scripts/load-test-1000.mts

# Supabase-only (on your laptop, after fixing TLS if needed)
N=200 npx tsx scripts/load-test-db-only.mts
```

Optional: test **authenticated** feed with Playwright + 10 stored sessions (future script) before claiming 1,000 logged-in users safe.

---

## Sign-off checklist

- [ ] Re-run load test on **Vercel preview** (closer to production caching).
- [ ] Re-run `load-test-db-only.mts` from your Mac (valid Supabase TLS).
- [ ] Confirm Supabase plan limits for Realtime + connections.
- [ ] Implement at least **P0 #1 and #2** before a large launch.
