# Pupmeow — test coverage report

**Generated:** 2026-10-20  
**Branch:** `main`  
**Commands:** `npm test` · `npm run test:coverage` · `npm run test:e2e` · `npm run load-test:100`

This document summarizes **what we test**, **latest results**, and **code coverage** for the `src/lib` layer (where most unit tests focus). UI routes and React components are covered mainly by Playwright smoke tests, not Vitest.

---

## Summary

| Suite | Count | Status | What it proves |
|-------|------:|--------|----------------|
| **Vitest (unit)** | **33** | ✅ Pass | Validations, safety helpers, post/report actions, AI config toggles |
| **Playwright (E2E smoke)** | **4** | Run locally | Public pages load; protected routes redirect to login |
| **HTTP load test** | 50 + 100 waves | ✅ Pass (dev server) | Landing/login/lost/feed paths under concurrent traffic |
| **Code coverage (`src/lib`)** | ~**17%** lines | Measured | Strong on **validations**; thin on actions/UI/Supabase |

**Plain language:** Automated tests give confidence for **forms, trust & safety rules, and a few server actions**. They do **not** yet prove full signed-in journeys (onboarding, lost post, admin) — those need Playwright on staging/production plus manual smoke (see [LAUNCH_HANDOFF.md](./LAUNCH_HANDOFF.md)).

---

## Unit tests (33) — `tests/unit/`

### Validations (`validations.test.ts`) — 15 tests

| Area | Behaviors checked |
|------|-------------------|
| **Indian phone** | Normalise `+91` / leading `0`; reject invalid series |
| **Username** | Lowercase; min length; no spaces |
| **Feed post** | Caption or photo required; max 6 images; only Supabase storage URLs; caption length cap |
| **Adoption** | Free adoption fields; block price/fee wording; no-sale ack; NGO name when `is_ngo` |
| **Lost & found** | Rewards allowed; no future dates; photo required |
| **Matchmaking** | Health ack; block stud-fee language |
| **Pet health** | Due date order; weight bounds |

### Server actions (`actions.test.ts`) — 6 tests

| Action | Behaviors checked |
|--------|-------------------|
| **`createPost`** | Requires sign-in; rejects another user’s storage path; blocks moderated text; inserts with profile city/area |
| **`submitReport`** | Validates reason; files report as current user |

### Utilities & safety (`utils.test.ts`) — 11 tests

| Module | Behaviors checked |
|--------|-------------------|
| **Age / birthday** | `ageInMonths`, `formatAge`, `birthdaySoon` |
| **WhatsApp** | `toWhatsAppNumber`, `whatsappLink` |
| **`safeNext`** | Blocks open redirects (`https://`, `//`, backslash tricks) |
| **Emergency (Kaia)** | Rat poison, seizure, breathing — vs benign puppy food question |
| **Heuristic moderation** | Sales blocked on listings; flagged on posts; abuse blocked |
| **`friendlyError`** | Rate limits; RLS permission wording |
| **Storage paths** | User can only use own folder; blocks `../` |

### AI config (`ai-config.test.ts`) — 3 tests

| Behavior | Detail |
|----------|--------|
| Missing API key | `isAiEnabled()` false |
| `AI_MODERATION_LLM=false` | Moderation LLM off; assistant can stay on |
| `AI_DAILY_LIMIT` | Clamped (max 30) |

### UI helper (`cn.test.ts`) — 3 tests

| Behavior | Detail |
|----------|--------|
| **`cn()`** | Tailwind class merge (later wins); arbitrary values; falsy args stripped |
| **Responsive display** | e.g. `hidden sm:block` with other utilities |

---

## E2E smoke (`tests/e2e/smoke.spec.ts`) — 4 tests

Run after browsers are installed:

```bash
npm run playwright:install
npm run test:e2e
```

| # | Test | Coverage |
|---|------|----------|
| 1 | Landing page loads | H1 “Pet neighbours”, “Join free” in `#main` |
| 2 | Login page loads | “Continue with Google” visible |
| 3 | Public `/lost` | “LOST & FOUND” without login; optional `E2E_LOST_ID` detail page |
| 4 | Protected `/feed` | Redirects to `/login?next=%2Ffeed` |

**Not in smoke (gaps):** Google OAuth, onboarding, posting, lost create, notifications, admin, Kaia chat.

---

## Load & stress (manual scripts)

Documented in [STRESS_TEST_1000_FOR_LAUNCH.md](./STRESS_TEST_1000_FOR_LAUNCH.md) and [LOAD_TEST_1000_USERS.md](./LOAD_TEST_1000_USERS.md).

| Run | Result (documented) |
|-----|---------------------|
| `npm run load-test:100` | 50 + 100 concurrent HTTP requests — **100% success** on local `next start` |
| `PEAK_CONCURRENCY=1000` | Heavier wave — use before big campaigns; re-run on **Vercel URL** |
| `npm run load-test:db` | Direct Supabase reads — run on your Mac with `.env.local` |

Paths exercised include `/`, `/login`, `/lost`, `/feed` (anonymous redirect).

---

## Code coverage (Vitest + v8)

**Scope:** `src/lib/**/*.{ts,tsx}` (excludes `src/types`, barrel `index.ts` files).

**Regenerate:**

```bash
npm run test:coverage
```

- **Terminal:** summary table  
- **HTML:** open `coverage/index.html` locally (folder is gitignored)

### Latest run (2026-10-20)

| Metric | Value |
|--------|------:|
| Statements | **14.89%** (232 / 1558) |
| Branches | **12.94%** (167 / 1290) |
| Functions | **19.45%** (50 / 257) |
| Lines | **17.16%** (207 / 1206) |

### Coverage by area (highlights)

| Area | Line coverage (approx.) | Notes |
|------|-------------------------|--------|
| **`lib/validations/*`** | **~88%** | Primary unit-test target |
| **`lib/ai/config.ts`** | **~93%** | Env toggles |
| **`lib/actions/reports.ts`** | **~80%** | `submitReport` |
| **`lib/actions/posts.ts`** | **~17%** | Happy path + guards only |
| **`lib/utils.ts`** | **~52%** | Age, WhatsApp, errors; not all helpers |
| **`lib/ai/moderation.ts`** | **~27%** | Heuristics only (LLM path untested) |
| **Auth, Supabase, middleware, most actions** | **0%** | Need integration/E2E tests |
| **React `src/app`, `src/components`** | *Not in Vitest scope* | Playwright / manual |

Low **overall % is expected** for a Next.js app where most code lives in pages and server actions; the number to watch for launch is **validations + trust paths at high coverage**, not 80% repo-wide.

---

## Recommended next tests (post-launch)

1. **Playwright:** signed-in flow with a staging Google test user (onboarding → home → one post).  
2. **Playwright:** `/lost/new` validation errors without submitting to prod DB.  
3. **Vitest:** `safeNext` + auth callback already covered; add `resolvePostSignInPath` with mocked Supabase.  
4. **Load:** `PEAK_CONCURRENCY=500 BASE_URL=https://<production>` after Vercel deploy.

---

## Quick commands

```bash
npm test                 # 33 unit tests
npm run test:coverage    # unit + lib coverage report
npm run test:e2e         # 4 smoke tests (needs Playwright browsers)
npm run preflight        # typecheck + lint + production build
npm run load-test:100    # HTTP load 50 + 100
```

---

*For stakeholder wording and launch checklist, see [LAUNCH_HANDOFF.md](./LAUNCH_HANDOFF.md) and [LAUNCH_READINESS_AND_TESTING.md](./LAUNCH_READINESS_AND_TESTING.md).*
