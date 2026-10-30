# Pupmeow — launch readiness, testing & scale

**Last run:** 2026-10-20 (local production server `next build` + `next start` on `127.0.0.1:3000`)  
**Stakeholder summary (1,000-user stress test):** [STRESS_TEST_1000_FOR_LAUNCH.md](./STRESS_TEST_1000_FOR_LAUNCH.md)  
**Audience:** You + anyone helping with launch (Ronak / Pupmeow team)  
**Related:** [LOAD_TEST_1000_USERS.md](./LOAD_TEST_1000_USERS.md) (deeper 500–1,000 concurrency notes), [DEPLOY.md](../DEPLOY.md)

---

## 1. Executive summary

| Target | Verdict (today) | Notes |
|--------|-----------------|--------|
| **Feature / build health** | **Pass** | `npm test` (33 tests), `npm run typecheck`, `npm run build` all pass. |
| **~50 concurrent page loads** | **Pass** | Load harness: **50/50** OK (0% errors). |
| **~100 concurrent page loads** | **Pass** | Load harness: **100/100** OK (0% errors). |
| **~500 concurrent** | **Not validated yet** | Prior doc shows degradation ~500+ on a **single local Node** process; plan Vercel preview + Supabase Pro before marketing push. |
| **E2E (Playwright)** | **Blocked here** | Browsers not installed in this environment; run `npx playwright install` on your Mac, then `npm run test:e2e`. |

**Plain language:** The app is in good shape for a **soft launch** (roughly **50–100 people hitting pages at the same time**). That is not the same as **500 signed-in users** browsing, posting, and using notifications at once — we should grow test cases and run a **staging load test** before a big campaign.

---

## 2. What we ran (2026-10-20)

### Automated

| Command | Result |
|---------|--------|
| `npm test` | 33/33 Vitest tests passed |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| `PEAK_CONCURRENCY=100 BASE_URL=http://127.0.0.1:3000 npm run load-test` | Waves at **50** and **100**: **100% success**, no timeouts |
| `npm run test:e2e` | Failed — Playwright browser binary missing (install locally) |

### Load test numbers (HTTP only)

Each “user” = one concurrent HTTP request (anonymous traffic mix: `/lost`, `/adopt`, `/`, `/login`, etc.).

| Concurrent requests | Success | p95 latency (overall) | Listing routes (`/lost`, `/adopt`) |
|--------------------|---------|------------------------|-------------------------------------|
| 50 | 50/50 | ~4.1s* | ~100–250ms p95 |
| 100 | 100/100 | ~4.1s* | ~100–250ms p95 |

\*Overall p95 is dominated by **`/` landing** (~4s) when many landings hit together on **one** local server. Listings stay fast. On **Vercel**, the landing page benefits from edge caching (`revalidate = 300`) and multiple instances — expect better p95 than local for real traffic.

### Manual HTTP smoke (curl)

| Route | Expected | Observed |
|-------|----------|----------|
| `/`, `/login`, `/lost`, `/adopt`, `/privacy` | 200 | 200 |
| `/admin` (logged out) | Redirect to login | **307** → `/login?next=/admin` |

### Supabase DB-only script

`N=50 npx tsx scripts/load-test-db-only.mts` reported `fetch failed` from this runner (environment TLS/network). **Re-run on your laptop** after `DOTENV_CONFIG_PATH=.env.local`; if it still fails, check Supabase project is not paused and your network allows `*.supabase.co`.

---

## 3. How to run tests yourself

Prerequisites: Node 20+, `.env.local` with Supabase keys, dependencies installed (`npm ci`).

### Unit + types + production build

```bash
npm test
npm run typecheck
npm run build
npm run preflight   # all three + lint
```

### E2E smoke (browser)

```bash
npm run playwright:install   # uses macOS system CAs (fixes UNABLE_TO_GET_ISSUER_CERT_LOCALLY)
npm run dev    # or npm run start after build
npm run test:e2e
```

If install still fails (corporate proxy), use installed Google Chrome instead of downloading Chromium — see **Playwright TLS errors** in README.

Current smoke tests cover: landing, login (Google-only UI), public `/lost`, protected routes redirect to login.

### Load test (50–100 users)

Terminal 1:

```bash
npm run build && npm run start
```

Terminal 2:

```bash
# 50 + 100 concurrent request waves
PEAK_CONCURRENCY=100 BASE_URL=http://127.0.0.1:3000 npm run load-test

# Optional: include parallel Supabase reads (uses .env.local)
DOTENV_CONFIG_PATH=.env.local RUN_DB=1 PEAK_CONCURRENCY=100 npm run load-test

# DB only
DOTENV_CONFIG_PATH=.env.local N=100 npx tsx scripts/load-test-db-only.mts
```

Higher peaks (path to 500):

```bash
PEAK_CONCURRENCY=500 BASE_URL=http://127.0.0.1:3000 npm run load-test
```

**Better before launch:** repeat with `BASE_URL=https://your-preview.vercel.app` (production-like caching).

---

## 4. Manual QA checklist (do before public launch)

Use **Google** with `pupmeow.team@gmail.com` on **production** Supabase after migrations.

### Auth & admin

- [ ] Google OAuth consent screen **Published** (or test users added while Testing).
- [ ] Supabase → Providers: **Google on**, **Email off**.
- [ ] SQL: `profiles.role = 'admin'` for `pupmeow.team@gmail.com`.
- [ ] Visit **`/admin`**: reports queue, ban with **reason**, audit log section (needs migration `20261011001500_admin_audit_sightings.sql`).

### Core flows (signed in)

- [ ] Onboarding completes.
- [ ] Add pet → post → comment → like.
- [ ] Lost report → another account sees listing → **safety sheet** → contact / **I saw** → owner gets notification.
- [ ] Adoption listing → contact gated behind login.
- [ ] Settings → export data / delete account (staging only).

### Core flows (signed out)

- [ ] `/lost` and `/adopt` readable.
- [ ] Lost detail: tip says **sign in** before “I saw”; contact block shows join CTA.
- [ ] `/admin` redirects to login.

### Non-functional

- [ ] Dark mode: primary (teal) buttons/text readable (`text-on-primary`).
- [ ] Mobile: primary buttons ≥ 44px tap targets.
- [ ] PWA install (optional): manifest + icons.

---

## 5. Capacity: 50–100 now vs 500 later

### What “50–100 users at once” means here

The load script models **50–100 simultaneous HTTP requests**, mostly anonymous browsing. That matches a small viral post or many people opening `/lost` links at once. **Today: pass** on local prod server for those waves.

### What 500 users will stress

| Layer | Risk at ~500 active users |
|-------|---------------------------|
| **Vercel** | Multiple serverless instances — usually OK for read-heavy traffic if pages cache well. |
| **Supabase Auth** | `getUser()` in middleware + layouts → many Auth API calls per navigation. |
| **Supabase Postgres** | Feed/home queries, lost list, notifications inserts. |
| **Realtime** | Notification bell opens a Realtime connection per active tab — watch connection limits on your plan. |
| **AI (Gemini)** | Lost/create + moderation — cost spikes if abused; keep env toggles documented in `src/lib/ai/config.ts`. |

### Recommended path to 500

1. **Soft launch** (now): ≤100 concurrent anonymous OK; monitor Vercel + Supabase dashboards.
2. **Staging load test**: `PEAK_CONCURRENCY=500` on **Vercel preview** + production Supabase **staging** project.
3. **Supabase**: Pro plan, connection pooling (Supavisor), indexes already in migrations; watch slow queries.
4. **App tweaks** (when metrics say so): more ISR on public lists, slimmer middleware on public routes (partially done), cap feed sidebar query, rate limits (already in DB).
5. **Test cases we’ll grow together** (next iterations):
   - Playwright: signed-in flow with test Google account (staging).
   - k6 or CI job at 50 VUs on preview deploy.
   - Soak test: 30 min at 20 RPS.
   - Signed-in session test (token pool) for `/home` + notifications.

---

## 6. Pre-launch dashboard checklist

| Item | Where |
|------|--------|
| Apply SQL migrations | Supabase → SQL or `supabase db push` |
| Google OAuth + redirect URLs | Google Cloud + Supabase URL config (see DEPLOY.md) |
| Disable email login | Supabase Auth providers |
| Env on Vercel | `NEXT_PUBLIC_SUPABASE_*`, AI keys, `AI_ENABLED` etc. |
| Remove seed data | `npm run remove-seed` on prod DB if ever run |
| Error monitoring | (Optional) Sentry / Vercel logs alerts |

---

## 7. Test inventory (current)

| Suite | Location | Count / scope |
|-------|----------|----------------|
| Unit | `tests/unit/*.test.ts` | Validations, utils, AI config, actions |
| Coverage report | [TEST_COVERAGE_REPORT.md](./TEST_COVERAGE_REPORT.md) | Full matrix + `npm run test:coverage` |
| E2E smoke | `tests/e2e/smoke.spec.ts` | Public pages + auth redirect |
| Load | `scripts/load-test-1000.mts` | HTTP waves 50 → peak |
| DB load | `scripts/load-test-db-only.mts` | Parallel PostgREST reads |

**Planned (with you):** admin ban audit, sighting RPC, contact safety sheet, Google-only login, and signed-in flows in Playwright.

---

## 8. Quick reference commands

```bash
npm run dev              # local development
npm run preflight        # typecheck + lint + build
npm test                 # unit tests
npm run test:e2e         # browser smoke (after playwright install)
npm run load-test        # default peak 1000; set PEAK_CONCURRENCY=100 for launch check
```

**Admin URL:** `https://pupmeow.in/admin` (after Google sign-in + `role = admin` in `profiles`).

---

## 9. Changelog

| Date | Change |
|------|--------|
| 2026-10-20 | Initial doc; 50/100 HTTP load pass; load-test phases fixed to include 100-wave; unit/build pass |
