# Pupmeow — Launch handoff

**Document version:** 20 October 2026  
**Product:** Pupmeow (pupmeow.in) — Delhi NCR pet community  
**Team contact:** pupmeow.team@gmail.com  
**Instagram:** https://www.instagram.com/pupmeow.in  

---

## 1. What Pupmeow is

Pupmeow is a **mobile-friendly website** (installable as a PWA) for **dog and cat families in Delhi NCR**:

- Community feed, profiles, pets & private health records  
- **Lost & Found** with area alerts, posters, WhatsApp-friendly sharing  
- **Free adoption** (no sales)  
- **Playdate / matchmaking** (contact only when both sides agree)  
- Optional **Kaia** AI helper (Google Gemini when enabled)  
- **Sign-in:** Google only (no email OTP / SMS login on the site)

**Not included:** native iOS/Android app; WhatsApp is for **listing contact**, not login.

**Stack:** Next.js 15 on **Vercel**, **Supabase** (Auth, Postgres + RLS, Storage, Realtime).

---

## 2. What was built and fixed (summary)

| Area | Status |
|------|--------|
| Google-only login | Done |
| Session verification on protected pages (Supabase `getUser`) | Done |
| Contact safety sheet before Call / WhatsApp | Done |
| Lost “I saw” → in-app notification + optional WhatsApp/call | Done (needs DB migration) |
| Admin `/admin`, ban with reason, audit log | Done (needs DB migration) |
| Public page caching (home listings, `/lost`, `/adopt`) | Done |
| Lighter middleware for anonymous `/` and `/login` | Done |
| UI: contrast on teal, 44px touch targets, copy cleanup | Done |
| Terms of Service | **Draft for review** (not legal advice) |
| Instagram icon (header, footer); contact lists DMs | Done |
| Tests: 33 unit, 4 Playwright smoke, load-test scripts | Done |
| GitHub `main` pushed (incl. Instagram icon crash fix) | Done |

**Repo docs:** `DEPLOY.md`, `docs/LAUNCH_READINESS_AND_TESTING.md`, `docs/STRESS_TEST_1000_FOR_LAUNCH.md`.

---

## 3. How features really work

| Feature | What users get |
|---------|----------------|
| **Google Maps** | On a lost post: embedded map + “Open in Google Maps” from **area / landmark text**. No Maps API key; no drag-a-pin map picker. |
| **Calendar** | “Add to calendar” → **Google Calendar** or download **.ics** (Apple/Outlook). Not automatic background reminders. |
| **WhatsApp** | After sign-in + safety sheet: opens **wa.me** with a prefilled message. Not WhatsApp Business API. |
| **Phone** | `tel:` link after sign-in; numbers not in public HTML. |
| **Admin** | In-app **`/admin`** when `profiles.role = 'admin'` for your Google email. Separate from Supabase dashboard team access. |

---

## 4. Before you tell everyone (checklist)

### Must-do on production

- [ ] **Vercel:** Latest `main` deployed; env vars set (Supabase URL/keys, `NEXT_PUBLIC_SITE_URL`, AI keys if Kaia on).  
- [ ] **Supabase migration:** Run `supabase/migrations/20261011001500_admin_audit_sightings.sql` (sightings RPC, ban reason, `admin_audit_log`).  
- [ ] **Supabase Auth:** Google **on**, Email **off**. Site URL `https://pupmeow.in` (+ Vercel preview redirect pattern in `DEPLOY.md`).  
- [ ] **Google Cloud:** OAuth consent screen **Published** (or test users while Testing).  
- [ ] **Admin SQL** (production):

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'pupmeow.team@gmail.com');
```

- [ ] **Live smoke test (~15 min):** Google sign-in → onboarding → lost post → map → safety sheet → WhatsApp → calendar reminder → `/admin`.  
- [ ] **Seed data:** If you ever ran `npm run seed` on prod, run `npm run remove-seed`.  
- [ ] **Terms:** Lawyer review of `/terms` before large marketing.

### First week (recommended)

- [ ] Load test on Vercel URL: `PEAK_CONCURRENCY=500 BASE_URL=https://your-site.vercel.app npm run load-test`  
- [ ] Optional Vercel env: `NEXT_PUBLIC_INSTAGRAM_URL=https://www.instagram.com/pupmeow.in` (already default in code).  
- [ ] Watch Supabase (errors, DB size, Realtime) and Vercel after soft launch.  
- [ ] Git remote (optional): `git remote set-url origin https://github.com/Pragylucky/PupMeow.git`

---

## 5. How many users — without “getting busted”

**Important:** “1,000 users” in tests meant **1,000 pages opened in the same second**, not 1,000 accounts or 1,000 people online all day.

| Scenario | Expectation |
|----------|-------------|
| Tens to **~100–200 families** browsing over a **day** | **Normal target** — fine on Vercel + Supabase (free/Pro). |
| **~50–100 simultaneous** page opens (e.g. WhatsApp link) | **Tested OK** after caching; **better on Vercel** than one laptop `npm run start`. |
| **~500 at once** | Possible slowness/timeouts — run preview load test; usually **slow, not data corruption**. |
| **~1,000 same-second spike** | Heavy on a **single** Node process; Vercel scales out but don’t promise zero wait in a viral second. |
| Many users with **notifications open** | Watch Supabase **Realtime** connection limits on your plan. |

**Safe message for partners:**  
*“Built for neighbourhood scale in Delhi NCR. Hundreds of families over time is the goal. A viral second might mean slow pages briefly; accounts and phone numbers stay protected by design.”*

**What stays safe under load:** Row Level Security; contact details only via server RPC for signed-in members; Google-only auth (no stored passwords).

---

## 6. Admin access (quick reference)

1. Sign in on the live site with **Google** as `pupmeow.team@gmail.com`.  
2. Finish onboarding.  
3. Run admin SQL above on **production** database.  
4. Open **https://pupmeow.in/admin** (or avatar → Moderation).

---

## 7. Useful commands

```bash
npm run dev
npm run build && npm run start    # local production mode
npm test
npm run playwright:install && npm run test:e2e
npm run load-test:100             # 50 + 100 concurrent HTTP requests
```

---

## 8. One-line pitch

*“Pupmeow is a free Delhi NCR community for lost pets, adoption and pet care — sign in with Google, your number stays hidden until you choose to share it, and we’ve tested for a real neighbourhood launch on professional hosting.”*

---

*Generated for internal launch planning. Update this file when major infra or legal text changes.*
