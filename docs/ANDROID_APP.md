# Pupmeow Android app (PWA → APK)

The Android app is the **same website** at **[https://pupmeow.in](https://pupmeow.in)** opened full-screen (Trusted Web Activity). When you deploy site changes, the app updates automatically — no separate app codebase.

---

## Before you start

1. **Site live on `https://pupmeow.in`** (Vercel domain valid, SSL green).
2. **Vercel env:** `NEXT_PUBLIC_SITE_URL=https://pupmeow.in` → **Redeploy**.
3. On your phone, open **https://pupmeow.in** in Chrome — login and Kaia should work.

Quick PWA check in Chrome DevTools → **Application** → **Manifest** (after deploy):

- `start_url`: `/home`
- Icons: `/pwa-icon/192`, `/pwa-icon/512`, maskable

---

## Option A — Install without Play Store (fastest)

**On Android (Chrome):**

1. Open **https://pupmeow.in/home** (sign in once).
2. Menu (⋮) → **Install app** or **Add to Home screen**.
3. Icon appears like a native app.

Same PWA; not an APK file to share.

---

## Option B — Build an APK with PWABuilder (share / sideload)

1. Go to **[PWABuilder](https://www.pwabuilder.com/)**.
2. Enter **`https://pupmeow.in`** → **Start**.
3. Fix any warnings (icons/manifest usually pass after recent deploy).
4. **Package for stores** → **Android** → **Google Play** or **Other Android** (APK/AAB).
5. Fill in:
   - **App name:** Pupmeow  
   - **Package ID:** `in.pupmeow.app` (pick once; never change for Play Store)  
   - **Host:** `pupmeow.in`  
   - **Start URL:** `/home`  
6. Download the **Android package** (`.apk` for sideload, or `.aab` for Play Console).

**Test on your phone:**

- Enable **Install unknown apps** for your file manager (Settings → Security).
- Copy APK to phone → open → Install.
- Open **Pupmeow** → sign in with Google (same as web).

---

## Option C — Google Play Store (later)

1. Finish **Option B** and get an **AAB** (Android App Bundle).
2. **[Google Play Console](https://play.google.com/console)** → create app → **Internal testing** first.
3. **Digital Asset Links:** PWABuilder gives a **`assetlinks.json`**. Host it at:

   `https://pupmeow.in/.well-known/assetlinks.json`

   Add the file under `public/.well-known/assetlinks.json` in this repo (PWABuilder output), commit, deploy.

4. Store listing: screenshots, short description, privacy policy URL **`https://pupmeow.in/privacy`**.

---

## Add “Download for Android” on the site

After you have an APK or Play link:

- Link from footer / **`/get-app`** page to Play Store URL, or  
- Host the APK on Supabase Storage (public bucket) only if you accept sideload support load — Play Store is cleaner long-term.

---

## Troubleshooting

| Problem | Fix |
|--------|-----|
| PWABuilder “not a PWA” | Deploy latest `main`; check `https://pupmeow.in/manifest.webmanifest` in browser |
| PWABuilder red **Service Worker** | Wait for Vercel deploy, then re-run PWABuilder (SW registers from HTML + `/sw.js`). In Chrome DevTools → Application → Service workers, you should see `/sw.js` active on pupmeow.in |
| Google login fails in app | Supabase redirect URLs include `https://pupmeow.in/**`; Google OAuth **JavaScript origins** include `https://pupmeow.in` |
| Blank WebView | `NEXT_PUBLIC_SITE_URL` must be `https://pupmeow.in` on Vercel |
| TWA opens browser chrome | Complete **assetlinks.json** for verified TWA |

---

## What we do *not* need yet

- Separate Expo/React Native repo (same backend; optional later for push notifications).
- Rebuilding the app for every Kaia or UI fix — only redeploy **Vercel**.

**Contact:** [pupmeow.team@gmail.com](mailto:pupmeow.team@gmail.com)
