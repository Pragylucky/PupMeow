# Deploy Pupmeow (GitHub → Vercel)

Do this on your **personal laptop** after login works locally.

---

## 0. Personal laptop (before deploy)

1. Copy the project (Git clone or USB). **Do not** rely on Git for secrets — copy **`.env.local`** separately (AirDrop/USB).
2. `npm install` → `npm run dev` → sign in (Google + email).
3. `npm run preflight` (typecheck + lint + build).
4. Optional: add AI in `.env.local` (`AI_PROVIDER=google` + Gemini key), restart dev, test Kaia.

---

## 1. Clean the database (no demo users)

```bash
npm run remove-seed
```

---

## 2. Push to GitHub (safe — no secrets)

```bash
cd pupmeow
git init
git add .
git commit -m "Initial Pupmeow app ready for deploy"
```

Create an empty repo on GitHub (private recommended), then:

```bash
git remote add origin https://github.com/YOUR_USER/pupmeow.git
git branch -M main
git push -u origin main
```

**Never commit:** `.env`, `.env.local`, service role keys. Only `.env.example` is in the repo.

---

## 3. Vercel (recommended host)

1. https://vercel.com → **Add New → Project** → import your GitHub repo.
2. Framework: **Next.js** (auto). Build: `npm run build`. Output: default.
3. **Environment variables** (Production) — copy from your `.env.local`:

| Variable | Production value |
|----------|------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Same Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Same service role (secret) |
| `NEXT_PUBLIC_SITE_URL` | `https://pupmeow.in` (or your domain) |
| `AI_PROVIDER` | `google` or `openai` (optional) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | If using Gemini (optional) |
| `OPENAI_API_KEY` | If using OpenAI (optional) |

4. **Deploy**. Region: **Mumbai (bom1)** if available.
5. Add **custom domain** in Vercel → point DNS at your registrar.

---

## 4. Supabase (production URLs)

**Authentication → URL configuration**

- **Site URL:** `https://pupmeow.in` (your live domain)
- **Redirect URLs:** `https://pupmeow.in/**` and `https://*-your-vercel-team.vercel.app/**` (preview deploys only — use your Vercel team slug, not `*.vercel.app`)

Keep `http://localhost:3000/**` for local dev.

**Auth providers:** enable **Google** only; disable **Email** (magic link / OTP) in Authentication → Providers so sign-in matches the app.

---

## 5. Google OAuth

Google Cloud → your OAuth client:

- **Authorised JavaScript origins:** `https://pupmeow.in` (and `http://localhost:3000` for dev)
- **Redirect URI:** unchanged — `https://<project-ref>.supabase.co/auth/v1/callback`

Publish the OAuth consent screen before public launch.

---

## 6. Make yourself admin (production)

Supabase → SQL Editor:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'your@email.com');
```

---

## 7. Smoke test on live URL

- [ ] Log in (Google + email)
- [ ] Onboarding → feed → one post
- [ ] Lost listing → share link in WhatsApp (preview image)
- [ ] Add to Home Screen (PWA)
- [ ] If AI keys set: Kaia FAB appears; if not, FAB and sidebar “Kaia” stay hidden

---

## 8. Before real users (trust & email)

- [ ] Update contact emails on site (support/privacy) if needed
- [ ] Supabase **custom SMTP** for magic links (built-in mail is rate-limited)
- [ ] Legal pages reviewed (Privacy, Terms, Guidelines)
- [ ] `npm run setup:storage` if buckets missing

---

## What hides automatically in production

- Next.js **dev indicator** (bottom-left “N”) — off via `devIndicators: false`; production build has no dev overlay.
- **Kaia (AI)** FAB + sidebar link — only when `AI_PROVIDER` + API key are set in Vercel env.
- **“Fill with AI” / “Write it for me”** — same `isAiEnabled()` check on forms.

---

## APK later

Web + PWA first. Play Store APK can wrap the same URL (TWA) or use Expo later — same Supabase backend.
