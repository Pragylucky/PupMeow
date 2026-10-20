# Decisions & assumptions

Everything below was decided without being able to ask. Each is easy to revisit.

## Stack & dependencies
- **Next.js 15.5 / React 19.1** (scaffolded with create-next-app@15). React pinned to ~19.1.2+ because `@ai-sdk/react` requires a patched 19.1.
- **Tailwind CSS v4** (what create-next-app installs). The theme lives in `src/app/globals.css` (`@theme`) instead of `tailwind.config.ts`.
- **Zod 4**, **Vercel AI SDK v7** (`ai`, `@ai-sdk/google`, `@ai-sdk/openai`), **@supabase/ssr 0.12**.
- Extra libraries (each needed):
  - `heic2any` — converts iPhone HEIC photos in the browser (lazy-loaded only when a HEIC file is picked).
  - `qrcode` — QR code on the printable lost-pet poster.
  - `server-only` — build-time guard so service-role / AI code can never be imported into client bundles.
  - `@ai-sdk/react` — installed for future `useChat` use; the assistant currently uses a small fetch-stream reader (fewer moving parts).
  - Dev: `prettier` + `prettier-plugin-tailwindcss`, `vitest`, `@playwright/test`, `tsx` (runs the seed/storage scripts), `dotenv`.
- **Fonts**: `next/font/local` with the Fredoka and Nunito variable fonts (OFL) copied from Fontsource into `src/app/fonts`. `next/font/google` needs network at build time; self-hosting is equally fast and avoids that dependency.

## Design
- Palette chosen for warmth + trust without the usual cream/terracotta look: teal primary `#0E7C72`, marigold secondary `#F6B21B` (a nod to Indian festivity, also the **dog** accent), rose accent `#E5486A` (likes), violet `#7A5AF5` as the **cat** accent. Cool off-white background. Dark mode via `prefers-color-scheme` plus a manual toggle (`data-theme`).
- The one "bold" moment is the hero illustration of a dog and cat peeking over the ledge; the rest stays quiet.

## Data & security
- **Column-level grants** hide sensitive columns: `lost_found.contact_value`, `adoptions.contact_value`, embeddings and AI counters are not selectable by clients. Contact is revealed only through `get_lost_found_contact` / `get_adoption_contact` RPCs that require a signed-in, non-banned, non-blocked user. Consequence: the app never uses `select("*")` on those tables (see `src/lib/columns.ts`).
- **profile_private** table holds WhatsApp number, true home area and notification preferences (owner-only). `profiles.area` is the *public* area and is set to NULL when "hide my area" is on.
- **Matchmaking contact**: accepted requests reveal each owner's WhatsApp from Settings via `get_match_contact`.
- **posts.species** (extra column): taken from the tagged pet, or chosen by the poster; NULL means a general post that shows for both Dog and Cat filters.
- **pet_health_records.weight_kg** (extra column) powers the weight chart.
- **pets.photo_urls** (extra) for the pet gallery; `photo_url` stays the cover photo.
- **adoptions.age_months** (extra, optional) powers the age filter; `age_text` remains the display value.
- **match_requests.purpose** (extra) so breeding rules can be enforced per request.
- **reports.reporter_id NULL** = auto-flagged by AI moderation; `ai_reason` stores why.
- Rate limits are enforced by `BEFORE INSERT` triggers so they also apply to direct API calls.
- AI daily limit (30) covers chat, "Fill with AI", "Write it for me" and vaccine suggestions. Moderation and embeddings are system calls and do not count. Resets at midnight IST.
- Feed cursor uses `created_at` (ties are vanishingly rare at this scale).
- Banned users are redirected in the app layout (not middleware) to avoid a DB call on every request.
- **Auth callback**: `/auth/callback` is a Route Handler (server PKCE exchange + session cookies on redirect). Middleware skips `/auth/callback` and `/auth/confirm` so PKCE cookies are not touched before the code exchange. Post-login routing lives in `src/lib/auth/post-sign-in.ts`.

## AI
- Defaults: Gemini `gemini-3.8-flash` / OpenAI `gpt-4o-mini`; embeddings `gemini-embedding-001` / `text-embedding-3-small`, both at **768 dimensions** (matches `vector(768)`).
- **Image embedding**: the vision model describes the first photo; that description + structured fields (species, breed, colour, gender, notes) are embedded as text. This works with both providers and gives better matches than raw image vectors for "brown indie with white chest"-type descriptions. Switching provider later requires re-embedding (different vector spaces).
- Moderation = fast regex heuristics (always on) + LLM classification when a key is set. AI failures fail open to heuristics so posting never breaks.
- Emergency detection is keyword-based on both client (instant banner) and server.

## Later phases
- **Routes**: public pages (lost, adopt, pet, profiles) share the app shell and show "Log in / Join" when logged out. Middleware protects private routes and adds `?next=`.
- **Lost & found matching threshold**: possible matches shown at ≥ 60% similarity; owners are notified at ≥ 78%. Tune in `src/lib/actions/lost.ts`.
- **Poster**: print-optimised A4 page (`/lost/[id]/poster`) rather than generating a PDF on the server — "Save as PDF" in the print dialog gives a PDF, with no extra PDF library.
- **AI assistant streaming** uses a plain text stream read with `fetch` instead of `useChat`, so chat history is saved server-side exactly once and the emergency flag travels in a response header.
- **Rewards on lost posts** are allowed (₹ amounts there are not treated as animal sales).
- **Match requests** carry a single purpose (playdate or breeding); a breeding request requires one male + one female with genders set.
- **Offline**: a small hand-written service worker (`public/sw.js`): network-first for pages with an `/offline` fallback, cache-first for static assets. No PWA library.
- **PWA icons** are rendered from the logo with `next/og` at `/pwa-icon/*` (no binary assets to maintain).
- **Admin "hide" on a profile** is a ban (profiles can't be hidden individually).
- **Legal pages** are plain-English drafts for your review (DPDP Act 2023, IT Rules 2021 grievance officer, no-sales rule, AI disclaimer). Public contact email is `pupmeow.team@gmail.com` (`CONTACT_EMAIL` in `src/lib/constants.ts`).
- **Mobile audit at 360px** was done by code review (no browser available in the build sandbox): bottom nav, header, grids (2 columns), filters (wrapping), section headers (wrapping) and sheets (full-width) were checked and fixed.
