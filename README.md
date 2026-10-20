# Pupmeow 🐾 — Delhi's pet community

A mobile-first community website for dog and cat families in Delhi NCR: share moments, report lost & found pets, free adoption, playdate/breeding matchmaking, pet profiles with private health records, and a friendly AI pet-care assistant.

Built with Next.js 15 (App Router, Server Components & Server Actions), TypeScript (strict), Tailwind CSS v4, Supabase (Auth, Postgres + RLS, Storage, Realtime, pgvector) and the Vercel AI SDK (Google Gemini or OpenAI).

---

## Contents
1. [Features](#features)
2. [Project structure](#project-structure)
3. [Local setup](#local-setup)
4. [Supabase settings](#supabase-settings)
5. [Google OAuth setup](#google-oauth-setup)
6. [AI setup](#ai-setup)
7. [Make yourself admin](#make-yourself-admin)
8. [Deploy to Vercel](#deploy-to-vercel)
9. [Manual test checklist (phone)](#manual-test-checklist-phone)
10. [Scripts & tests](#scripts--tests)
11. [Known limitations & roadmap](#known-limitations--roadmap)

Also see **DEPLOY.md** (GitHub → Vercel → go live), **Pupmeow-Upload-Guide.docx** (step-by-step handoff), **DECISIONS.md**, and **SECURITY.md**.

---

## Features
- **Dog / Cat / Both toggle** at the top of every section, remembered in your profile, a cookie (for server rendering) and localStorage. Species is a Postgres enum, ready for more animals.
- **Auth & onboarding**: Google or email magic link; unique username with live check; area picker with 120+ NCR areas; avatar; bio; optional quick add-pet. Suspended-account page for banned users.
- **Community feed**: Nearby / My city / Following / All tabs, infinite scroll (10 per page), pull-to-refresh, posts with up to 6 photos, hashtags & @mentions, pet tags, preview before posting, double-tap to like, share (Web Share / copy link), edit/delete/report, post detail with comments and likes list, hashtag pages, search (people, pets, posts, hashtags).
- **Notifications** with a live bell (Supabase Realtime): likes, comments, follows, mentions, match requests/answers, lost pets near you, AI lost-pet matches. Per-type preferences.
- **Pet profiles & health**: gallery, age, "Birthday soon 🎂", owner card, tagged posts; private vaccination/medication/vet/weight records, weight chart, certificate uploads (private bucket, signed URLs), "Upcoming care" list.
- **Lost & Found**: Lost/Found/Reunited tabs, area/date filters, public share pages that work without login, contact (WhatsApp deep link with prefilled message) for members only, **dynamic Open Graph images** for WhatsApp/X previews, **printable A4 poster with QR code**, "Reunited 🎉" celebration + happy-story post, alerts to people in the same area.
- **Adoption**: filters (species, area, age, gender, vaccinated, sterilised), NGO/shelter listings, no-sales rule enforced by validation + moderation, "I'm interested" contact, share pages with OG images, mark adopted, "Happy tails".
- **Matchmaking**: opt-in profiles (playdate/breeding/both), photos, papers, health confirmation, private health certificate; browse with filters; requests with message; accept/decline; contact revealed to both owners only after acceptance. Minimum breeding ages (dogs 18 mo, cats 12 mo) and "no payments" enforced in the database; pause/remove profile; report.
- **Kaia, the AI helper** (Gemini or OpenAI): streaming assistant with saved chats, pet-aware advice (breed, age, weight, health records), India-specific care, **emergency detection banner**, site guidance with links, "Fill with AI" from a photo, "Write it for me" drafts, AI vaccine suggestions, **lost & found smart matching with pgvector**, AI moderation with auto-flagging. 30 AI messages/day/user. Gracefully hidden ("coming soon") without a key.
- **Safety & admin**: report modal everywhere, block/unblock, admin dashboard (counts, reports queue with content preview & AI reason, hide/restore/dismiss/resolve, ban/unban, user search, recent signups).
- **Polish**: PWA (installable, offline page), icons generated from the logo, sitemap & robots, on-brand 404/error pages, dark mode, reduced-motion support, Privacy Policy (DPDP Act 2023), Terms and Community Guidelines, data export (JSON) and full account deletion.

## Project structure
```
src/
  app/                    Routes (App Router)
    (app)/                Pages inside the app shell (feed, lost, adopt, match, pets, assistant, admin…)
    (marketing)/          About, Privacy, Terms, Guidelines, Contact
    api/                  Route handlers: AI (chat/vision/write/health), data export
    auth/                 OAuth / magic-link callbacks, sign-out
    login/ onboarding/ suspended/ offline/
    page.tsx              Landing page (logged-out)
  components/
    ui/                   Reusable UI kit (Button, Input, Modal/BottomSheet, Tabs, Toast, Combobox…)
    features/             Feature components (feed, listings, pets, ai, upload, safety, species…)
    layout/               App shell: header, sidebar, bottom nav, create sheet, notification bell
    marketing/            Landing & footer pieces
  lib/
    supabase/             Clients: browser, server, middleware, admin (service role, server-only)
    actions/              Server actions (all auth + ownership checked)
    validations/          zod schemas for every input
    ai/                   Provider switch, prompts, moderation, embeddings, emergency detection
  types/                  database.ts (DB row types), models.ts (joined view models)
  middleware.ts           Session refresh + route protection
supabase/migrations/      SQL migrations, one file per area (run in order)
scripts/                  seed.ts, setup-storage.ts, dev/ (local Postgres test harness)
tests/                    unit (Vitest) and e2e (Playwright)
```

## Local setup

### Prerequisites
- Node.js 20+ (22 recommended) and npm
- A free Supabase project (https://supabase.com) — create one in the **Mumbai (ap-south-1)** region for low latency in Delhi
- Optional: a Gemini or OpenAI API key for AI features

### 1. Install
```bash
npm install
cp .env.example .env.local
```

### 2. Environment variables (`.env.local`)
| Variable | What it is | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (safe in the browser; RLS protects data) | same page → `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret.** Used server-side for account deletion, AI moderation flags, embeddings, seeding | same page → `service_role` key. Never expose or commit it |
| `NEXT_PUBLIC_SITE_URL` | Base URL used in share links, QR codes, sitemap | `http://localhost:3000` locally; your domain in production |
| `AI_PROVIDER` | `google` or `openai`. Leave empty to disable AI | — |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini key (if `AI_PROVIDER=google`) | https://aistudio.google.com/app/apikey |
| `OPENAI_API_KEY` | OpenAI key (if `AI_PROVIDER=openai`) | https://platform.openai.com/api-keys |

### 3. Database
pgvector is enabled by the first migration (`create extension vector`). You can also enable it in Supabase → Database → Extensions → **vector**.

**Option A — SQL editor (simplest):** open Supabase → SQL Editor, and run each file in `supabase/migrations/` **in filename order** (0001 → 0014). Each file is self-contained.

**Option B — Supabase CLI:**
```bash
npm i -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

### 4. Storage buckets
The storage migration (`…001200_storage.sql`) creates the 7 buckets (`avatars, pets, posts, lost-found, adoptions, matchmaking` public; `documents` private) with 5 MB limits and MIME rules, plus the folder-ownership policies. If your project restricts inserting into `storage.buckets` from SQL, run:
```bash
npm run setup:storage
```
then re-run only the `create policy` statements from that migration.

### 5. Seed sample data (optional)
```bash
npm run seed
```
Creates 6 sample members (`@asha_dwarka`, `@rohan_noida`, …), pets, health records, posts, lost & found (including a found Labrador that resembles a lost one), adoptions, match profiles and a pending match request. It downloads sample photos from placedog.net / cataas.com and falls back to generated images when offline.

### 6. Run
```bash
npm run dev
```
Open http://localhost:3000. Sign up with your own email/Google account to explore.

**Auth checklist (personal machine / normal home Wi‑Fi):**
1. Use **only** `.env.local` (copy from `.env.example`) — not a committed `.env` file.
2. `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
3. Supabase → **Authentication → URL configuration**: Site URL `http://localhost:3000`, Redirect URLs include `http://localhost:3000/**`
4. Google Cloud OAuth client: redirect URI `https://<project-ref>.supabase.co/auth/v1/callback` (from Supabase → Google provider)
5. After changing auth code, restart `npm run dev` and use a fresh login tab (or clear cookies for `localhost`).

On some **corporate laptops**, Node may fail HTTPS to Supabase (`fetch failed` / certificate errors). Use a personal PC, phone hotspot, or ask IT for the corporate root CA and set `NODE_EXTRA_CA_CERTS` when running `npm run dev`.

### Regenerating database types
`src/types/database.ts` is hand-maintained to match the migrations (the app uses explicit row types). To generate the official Supabase types instead:
```bash
SUPABASE_PROJECT_ID=<project-ref> npm run db:types
```
(If you do, keep the exported type names used by the app or adjust imports.)

## Supabase settings
**Authentication → Providers**
- **Email**: enabled. "Confirm email" can stay on (magic links confirm automatically).
- **Google**: enabled with the Client ID & Secret from the next section.

**Authentication → URL Configuration**
- **Site URL**: `http://localhost:3000` during development; change to `https://your-domain` in production.
- **Redirect URLs** (add all you use):
  - `http://localhost:3000/**`
  - `https://your-domain/**`
  - `https://*-your-vercel-team.vercel.app/**` (optional, for Vercel preview deployments)

The app sends users to `/auth/callback?next=…`, which is covered by the wildcard.

**Authentication → Emails (optional)**: customise the magic-link template subject to "Your Pupmeow sign-in link". For production, set up custom SMTP (e.g. Resend, Amazon SES) — Supabase's built-in email is rate-limited to a few emails per hour.

**Database → Replication / Realtime**: the migration adds `public.notifications` to the `supabase_realtime` publication. Check under Database → Publications → `supabase_realtime` that **notifications** is listed (toggle it on if not). No other tables need Realtime.

## Google OAuth setup
1. Go to https://console.cloud.google.com → create (or pick) a project, e.g. "Pupmeow".
2. **APIs & Services → OAuth consent screen**: User type **External**; app name "Pupmeow"; support email; logo (optional); authorised domain: your production domain and `supabase.co`; scopes: `email`, `profile`, `openid`. Add yourself as a test user while in "Testing", then **Publish app** before launch.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID** → Application type **Web application**.
   - **Authorised JavaScript origins**: `http://localhost:3000` and `https://your-domain`
   - **Authorised redirect URIs**: `https://<your-project-ref>.supabase.co/auth/v1/callback` (copy it from Supabase → Authentication → Providers → Google)
4. Copy the **Client ID** and **Client secret** into Supabase → Authentication → Providers → Google → Save.

## AI setup
- **Gemini (recommended for cost)**: create a key at https://aistudio.google.com/app/apikey → `AI_PROVIDER=google`, `GOOGLE_GENERATIVE_AI_API_KEY=…`. Uses `gemini-3.8-flash` and `gemini-embedding-001`.
- **OpenAI**: create a key at https://platform.openai.com/api-keys (add billing) → `AI_PROVIDER=openai`, `OPENAI_API_KEY=…`. Uses `gpt-4o-mini` and `text-embedding-3-small`.
- Models are set in `src/lib/ai/provider.ts`.
- **Limits**: 30 AI actions per user per day (chat messages, Fill with AI, Write it for me, vaccine suggestions), reset at midnight IST. Change `AI_DAILY_LIMIT` in `src/lib/constants.ts` (the DB caps it at 30; edit `consume_ai_message` to raise). Usage is logged in `ai_usage_log`.
- **Cost notes** (rough, check current pricing): a chat reply is ~1–2k tokens, so with flash/mini models 1,000 active users each sending 10 messages/day costs a few US dollars per day. Moderation and lost-pet embeddings also call the AI (not counted against users). Set spending caps in Google AI Studio / OpenAI.
- **No key?** AI buttons are hidden, the assistant shows "coming soon", and moderation falls back to built-in keyword rules.
- **Switching provider** later: re-embed lost & found posts (vectors differ between providers) — posts created after the switch are embedded automatically.

## Make yourself admin
After signing up, run in the Supabase SQL editor:
```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```
Then open `/admin` (also in the avatar menu).

## Deploy to Vercel
1. Push the project to a GitHub/GitLab repo (`.env.local` is git-ignored).
2. In Vercel → **Add New → Project** → import the repo. Framework: Next.js (auto). Build command `npm run build`, output default, Node 20+.
3. **Environment variables** (Production + Preview): all seven from `.env.example`. Set `NEXT_PUBLIC_SITE_URL=https://your-domain`.
4. Deploy. Region: in Project Settings → Functions, choose **Mumbai (bom1)** to sit next to Supabase.
5. **Update Supabase**: Site URL → `https://your-domain`; add `https://your-domain/**` to Redirect URLs.
6. **Update Google**: add `https://your-domain` to Authorised JavaScript origins (redirect URI stays the Supabase one).
7. **Custom domain**: Vercel → Project → Settings → Domains → add `pupmeow.in` (and `www`); follow the DNS instructions at your registrar; Vercel issues HTTPS automatically. Update `NEXT_PUBLIC_SITE_URL` and redeploy.
8. **Analytics (optional)**: Vercel → Analytics → Enable, then `npm i @vercel/analytics` and add `<Analytics />` from `@vercel/analytics/next` to `src/app/layout.tsx`. Speed Insights works the same way.
9. Test the share preview: paste a `/lost/<id>` link into WhatsApp — it should show the pet photo and "LOST: …". (WhatsApp caches previews; use a new link when testing changes.)

## Manual test checklist (phone)
Use Chrome on Android or Safari on iPhone. Tick each:
- [ ] Open the site logged out → landing page, recent lost/adoption cards, FAQ.
- [ ] Sign up with Google, and separately with an email magic link (open the link on the same phone).
- [ ] Onboarding: username availability check, pick area, upload avatar (try an iPhone HEIC photo), add a pet.
- [ ] Toggle Dog / Cat / Both — content filters everywhere; reload — choice is remembered.
- [ ] My pets → add pet with photos; "Fill with AI" suggests breed; edit; see birthday badge if within 14 days.
- [ ] Health: add vaccination with next due date + certificate photo/PDF; open certificate; add 2 weights → chart; "Suggest upcoming" (AI) → add reminders; see them in "Upcoming care".
- [ ] New post with 3 photos (reorder, remove one), caption with #hashtag and @mention, tag a pet, Preview → Post.
- [ ] Feed: tabs, scroll to load more, pull down to refresh, double-tap photo to like, share button.
- [ ] Comment on a post; delete your comment; open the likes list; open a hashtag page; search for a user/pet.
- [ ] From a second account: follow, like, comment, mention → first account gets live notifications (bell badge updates without reload); mark all read.
- [ ] Report a lost pet → open its page logged out (incognito) → "Join Pupmeow to contact"; share link on WhatsApp shows photo + "LOST: …"; Download poster → print / save PDF; scan the QR.
- [ ] As another member in the same area, check you got a "lost pet near you" notification; tap Contact owner → WhatsApp opens with a prefilled message.
- [ ] Post a found pet that looks similar → "Possible matches" shows the lost post; lost owner gets a notification (AI enabled).
- [ ] Mark lost post "Reunited 🎉" → celebration banner → "Share the happy story".
- [ ] Adoption: try a description with "₹5000" → blocked; publish a free listing; "I'm interested" from another account; mark adopted → appears in Happy tails.
- [ ] Matchmaking: add WhatsApp in Settings; opt a pet in (try breeding with a young pet → blocked); from another account send a request; accept → both see WhatsApp/Call; pause profile.
- [ ] AI assistant: ask a question with a pet selected; ask "my dog ate rat poison" → red "See a vet now" banner; history, new chat, delete chat; "Write it for me" on a post.
- [ ] Report a post; block a user → their content disappears; unblock in Settings.
- [ ] Admin: open `/admin`, see the report, hide the post, ban/unban the user (banned user sees the suspended page).
- [ ] Settings → Download my data (JSON); Delete account (type DELETE) → logged out, data gone.
- [ ] Add to Home Screen; open the installed app; turn on airplane mode → offline page.
- [ ] Dark mode (system setting or avatar menu → Light / dark).

## Scripts & tests
| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run format` | Prettier |
| `npm run seed` | Sample data (needs service role key) |
| `npm run remove-seed` | Delete all `@seed.pupmeow.test` demo users (run before production) |
| `npm run setup:storage` | Create/update storage buckets via the API |
| `npm run db:types` | Generate Supabase types (needs `SUPABASE_PROJECT_ID` + CLI login) |
| `npm test` | Vitest unit tests (validation schemas, utilities, server actions with mocked Supabase) |
| `npm run test:e2e` | Playwright smoke tests (landing, login, public lost page, auth redirect). First run `npx playwright install chromium`. Builds must exist (`npm run build`). Set `E2E_LOST_ID=<uuid>` to also test a lost detail page |

Database security tests (optional, needs a local PostgreSQL 16 with pgvector) — see SECURITY.md.

## Known limitations & roadmap
**Known limitations (v1)**
- Only Delhi NCR and only dogs and cats (both are easy to extend: add areas in `src/lib/constants.ts`; `alter type species_type add value 'rabbit'` + breed lists).
- No in-app chat; owners connect over WhatsApp/phone.
- Images from deleted lost/adoption/match listings stay in storage until the account is deleted (see SECURITY.md).
- "Image embedding" uses an AI description of the photo + details (works with both providers); a true image-vector model could improve matching.
- The Lighthouse 90+ target was designed for (server rendering, next/image, small client bundles ~105–200 kB first load, route skeletons) but couldn't be measured in the build environment — run Lighthouse on your Vercel URL.
- Email deliverability depends on your SMTP setup (see Supabase settings).

**Roadmap**
1. **Mobile apps** (React Native / Expo) reusing the same Supabase backend, RLS and RPCs; push notifications via Expo + a `notifications` webhook.
2. **Service providers directory & booking**: vets, groomers, walkers, boarding with verified badges, reviews and slot booking.
3. **Events**: adoption drives, pet meetups, vaccination camps with RSVPs.
4. **Messaging**: in-app 1:1 chat (Supabase Realtime) with block/report.
5. More cities, more species, NGO verification, multilingual UI (Hindi).
