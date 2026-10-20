# Security review — Pupmeow

Reviewed during Phase 13. Database checks were executed on PostgreSQL 16 + pgvector with stubbed Supabase schemas
(`scripts/dev/supabase-stub.sql` + `scripts/dev/rls-test.sql`, 26/26 passing). Re-run them any time with a local Postgres:

```bash
createdb pmtest && psql -d pmtest -f scripts/dev/supabase-stub.sql
for f in supabase/migrations/*.sql; do psql -v ON_ERROR_STOP=1 -d pmtest -f "$f"; done
psql -d pmtest -f scripts/dev/rls-test.sql
```

## 1. Row Level Security (every table)
RLS is enabled on all 20 tables. Default Supabase grants are revoked first, then only the needed privileges are granted.

| Table | Read | Write |
|---|---|---|
| profiles | everyone, except people in a block relationship | own row; **column grants** stop users from changing `role`, `is_banned`, AI counters |
| profile_private | owner only | owner only (WhatsApp, home area, notification prefs) |
| blocks | blocker only (blocked user can't see they're blocked) | blocker |
| pets | everyone except blocked | owner, active (non-banned) users |
| pet_health_records | **owner only** | owner, pet must belong to owner |
| posts | signed-in; hidden posts only to author/admin; blocked authors excluded | author; counters, `is_hidden`, hashtags are trigger/RPC-managed (no client grant) |
| likes / comments / follows | signed-in, visible posts only, block-aware | as self, active users; comment delete: author, post owner, admin |
| lost_found / adoptions | **public** (share pages) but `contact_value` has **no SELECT grant**; revealed only by `get_*_contact()` RPC to signed-in, non-banned, non-blocked users | author; status timestamps forced by triggers |
| pet_match_profiles | signed-in, active & not hidden, block-aware | owner; breeding age validated by trigger |
| match_requests | sender & recipient only | sender inserts (trigger sets `to_owner_id`, validates species/age/gender/blocks); only recipient can change status, once |
| notifications | owner only | created only by `SECURITY DEFINER` triggers; owner may mark read/delete |
| ai_conversations / ai_messages / ai_usage_log | **owner only** | owner |
| reports | reporter and admins | reporter (cannot fake `target_owner_id` or file `ai_flag`); admins via RPC |

Admin powers (`admin_set_hidden`, `admin_set_ban`, `admin_resolve_report`, `admin_dashboard_counts`) are `SECURITY DEFINER` functions that check `is_admin()` themselves; anon has no EXECUTE.
All definer functions use `set search_path = ''` (prevents search-path hijacking).

## 2. Server actions & API routes
Every server action calls `actionContext()` (verifies the JWT with Supabase Auth via `getUser()`, loads the profile, rejects banned / not-onboarded users) and validates input with zod (unknown keys stripped — no mass assignment). Ownership is enforced twice: `.eq("owner_id"/"author_id", userId)` in the query **and** RLS. Checked:
`profile.ts` (onboarding, settings, follow, block, delete account), `pets.ts`, `posts.ts`, `lost.ts`, `adoptions.ts`, `match.ts`, `reports.ts`, `admin.ts` (also checks `role === "admin"`), `assistant/actions.ts`.
API routes: `/api/ai/*` check auth, ban status, same-origin, and spend the daily AI budget atomically; `/api/export` returns only the caller's data.
Server Actions get Next.js' built-in Origin check (CSRF). `safeNext()` blocks open redirects in login/callback.

## 3. File uploads
- Buckets: 5 MB limit and MIME allow-list enforced **by Supabase Storage** (images only; `documents` also PDF).
- Policies: upload/update/delete only inside `<bucket>/<auth.uid()>/…`; banned users can't upload. `documents` is private, read only by the owner, served through 5-minute signed URLs from a server action that re-checks the path.
- Server actions re-check every submitted URL belongs to the caller's folder in the right bucket (`allOwnUploads`, `isOwnDocumentPath`), so users can't attach other people's files.
- AI vision only fetches images from our own Supabase Storage URL (prevents SSRF) and caps size.
- Client re-encodes images (strips EXIF incl. GPS location).

## 4. Rendered user input (XSS)
- All user text is rendered as React text nodes (auto-escaped). Hashtag/mention linkifier and the AI markdown renderer build React elements — no HTML injection; AI links limited to relative paths or `https://`.
- `dangerouslySetInnerHTML` is used only for (a) a static theme script in the root layout, (b) the QR-code SVG generated server-side from our own URL.
- Security headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`; `poweredByHeader` off.
- PostgREST filter strings built from search input are sanitised (`, ( ) % _ * : . ' "` removed).

## 5. Rate limits (database-enforced, so they also apply to direct API calls)
posts 10/hour · comments 60/hour · lost & found 5/day · adoptions 5/day · match requests 20/day · AI 30/day (all AI features share the budget; resets midnight IST).

## 6. Secrets
- `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `AI_PROVIDER` have no `NEXT_PUBLIC_` prefix, so Next.js never bundles them for the browser.
- Modules that use them import `server-only` (build fails if a client component imports them): `lib/supabase/admin.ts`, `lib/ai/provider.ts`, `lib/ai/moderation.ts`, `lib/ai/embeddings.ts`, `lib/ai/guard.ts`, `lib/auth.ts`, `lib/feed.ts`.
- The service-role client is used only after the caller is verified: account deletion (own id), AI moderation flags, embeddings, lost-match notifications, own-contact export.
- `.env.local` is git-ignored; `.env.example` has names only.

## 7. Moderation & abuse
AI + heuristic moderation on posts, comments, bios, listings, match profiles and request messages; blocks clear violations (incl. animal sales) and auto-flags borderline content into the admin queue. Report on every content type, block everywhere.

## Residual risks / follow-ups
- Images from deleted lost/adoption/match listings stay in storage until the account is deleted (posts and health documents are cleaned up immediately). Add a scheduled cleanup function later.
- No CAPTCHA on magic-link login; Supabase Auth's built-in email rate limits apply. Consider enabling Supabase's CAPTCHA (hCaptcha/Turnstile) before a big launch.
- Phone numbers are visible to any signed-in member who taps Contact (by design for lost pets). Members abusing this can be reported/banned.
- Add a Content-Security-Policy once third-party analytics are decided.
