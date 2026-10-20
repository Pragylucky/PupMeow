# Stress test — “1,000 users at once” (plain-language summary)

**Date:** 20 Oct 2026  
**What we did:** Simulated many people opening Pupmeow pages **at the same instant** (like everyone tapping a WhatsApp link in the same second).  
**Where:** Your laptop, one production build (`npm run start`) — **harder than real Vercel**, which runs **many servers** and caching.

Use this doc when you explain reliability to friends, NGOs, or press.

---

## One sentence you can say out loud

> “We tested heavy traffic. For a normal launch — dozens or hundreds of people browsing lost pets and signing up — the site holds up. If a **huge** crowd hits the **exact same second**, pages might load slowly for a bit, but **accounts and data stay protected**; we host on Vercel and Supabase, not one old laptop.”

---

## What “1,000 users” means in the test

| Real life | What the test does |
|-----------|-------------------|
| 1,000 people **registered** on Pupmeow | Not simulated (would need 1,000 Google logins). |
| 1,000 people **online all day** | Not simulated. |
| 1,000 people **open a page in the same second** | **Yes** — worst-case spike. |

Each “user” = one browser opening `/lost`, `/adopt`, home, or login **once**, at the same time.

---

## Results (20 Oct 2026 run)

| Spike size (same second) | Pages that loaded OK | Plain English |
|------------------------|----------------------|---------------|
| **50** | **50 / 50 (100%)** | Comfortable for a neighbourhood alert or small launch. |
| **100** | **100 / 100** on a fresh server (earlier run); **90 / 100** immediately after the 1,000-wave test (server still hot, ~60s p95) | Treat **~100 simultaneous** as your **soft-launch comfort zone** on one machine after a **fresh** `npm run start`; **re-test on Vercel** before a big campaign. |
| **200** | **200 / 200** but **very slow** (~1–2 min for some pages) | Works, but people would notice slowness. |
| **500** | **~417 / 500 (~83%)** | Starts to break on **one** server — timeouts, not “data leaked”. |
| **1,000** | **~160 / 1,000 (~16%)** | **One laptop server** is overloaded; **not** how Vercel behaves at scale, but shows we need CDN/caching for viral spikes. |

**Important:** `/lost` and `/adopt` lists often stayed **under ~0.5s** even when the home page was slow — the **lost-pet flow** is what matters most, and it stayed relatively healthy until the biggest waves.

**Security check:** Anonymous call to the AI chat API returned **blocked** (no free Gemini spend from strangers).

---

## What did *not* break

- No sign of **random 500 errors** from app bugs in the 50-user wave.
- **Database rules (RLS)** are unchanged — load tests don’t bypass login; phone numbers stay server-side.
- **Playwright smoke tests** (4 flows) pass on your machine after copy fixes.
- **Unit tests** (33) pass.

---

## What *can* feel “broken” under a viral spike

1. **Slow or spinning pages** for 30–120 seconds if everyone opens the site together.  
2. **Home page** is heavier than `/lost` — marketing traffic hits that first.  
3. **Signed-in users** cost more (Google auth check per request) — fine at normal use, heavy in artificial 1,000-click tests.  
4. **Realtime notifications** — many tabs open = many connections; watch Supabase plan limits as you grow.

None of that is “the app exploded and lost data” — it’s **capacity and speed**, fixable with hosting + caching + a bigger Supabase plan.

---

## What you should do before telling “everyone”

### Must-do (production)

1. **Push code + deploy on Vercel** (not only laptop).  
2. **Google OAuth** consent screen **Published**.  
3. Supabase: **Google on**, **Email off**; correct **redirect URLs** for `pupmeow.in`.  
4. Run **SQL migration** `20261011001500_admin_audit_sightings.sql` on production.  
5. **Admin** for `pupmeow.team@gmail.com` (SQL in DEPLOY.md).  
6. **15-minute phone test** on live site: sign in, post lost pet, map, safety sheet, WhatsApp, calendar reminder.

### Strongly recommended before a **500+ person** WhatsApp blast

```bash
npm run build
# On Vercel preview URL:
PEAK_CONCURRENCY=500 BASE_URL=https://YOUR-PREVIEW.vercel.app npm run load-test
```

If preview passes better than laptop (it usually does), you can honestly say you load-tested on **production-like** hosting.

---

## How to re-run the test yourself

```bash
npm run build
npm run start
# New terminal:
PEAK_CONCURRENCY=1000 BASE_URL=http://127.0.0.1:3000 npm run load-test
```

Smaller check:

```bash
npm run load-test:100
```

Full technical detail: [LOAD_TEST_1000_USERS.md](./LOAD_TEST_1000_USERS.md)  
Launch checklist: [LAUNCH_READINESS_AND_TESTING.md](./LAUNCH_READINESS_AND_TESTING.md)

---

## Honest positioning for launch day

| Audience message | Accurate? |
|------------------|-----------|
| “Free, safe lost-pet alerts for Delhi NCR” | Yes, after prod deploy + OAuth. |
| “Your number is hidden until you choose to share” | Yes (members-only contact RPC). |
| “We tested for heavy traffic” | Yes — see table above. |
| “1,000 people can all use it with zero delay at once” | **No** — nobody guarantees that on v1 without enterprise scale; **slow is possible** in a viral second; **data stays safe**. |
| “Good for hundreds of families joining over a week” | **Yes**, with Vercel + Supabase on a normal plan. |

---

*Generated after automated load run 2026-10-20; re-run after major perf changes or before large marketing.*
