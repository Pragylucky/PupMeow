# Pupmeow redesign: what changed and how to install

## Install (2 minutes, no new setup)

1. Copy everything from this zip over your existing `pupmeow` folder. Say "Replace" when asked.
   Your `.env.local` is **not** in the zip, so your keys stay as they are.
2. Run `npm install` (no new packages were added, this just makes sure everything is in sync).
3. Run `npm run dev` and open http://localhost:3000.

- **No new database migrations.** Your Supabase setup stays as it is.
- **One Supabase setting for the 6-digit login code:** in Supabase → Authentication → Email Templates,
  open **Magic Link** and **Confirm signup** and make sure the email body contains `{{ .Token }}`
  (for example: `Your Pupmeow code is {{ .Token }}`). The sign-in link in the email still works too.
- Google sign-in works once Google is turned on in Supabase → Authentication → Providers.

## What's new

- Every page redesigned to the Figma look: section colours (Lost red, Adopt marigold, Playdates violet,
  Care teal, Kaia cream), pill buttons, coloured cards, a right-hand rail on desktop and a bottom bar on phones.
- New **Home** page (`/home`): greeting, your pets' next reminders, lost pets near you, feed, adoption.
  Logged-in people land here instead of the feed.
- No Hindi in the interface. Users add real photos; the cartoon dog/cat only shows when there's no photo.
- Proper web login: Google, or email with a 6-digit code (typo fixes like gmial.com → gmail.com,
  resend timer, "Open Gmail" button).
- Dark mode and a theme picker (Settings → Appearance).

## Buttons that now work end to end (tested in a real browser)

- **WhatsApp / Call** on lost, found and adoption posts (number shown only to signed-in members).
- **"I saw him / her"**: sends the owner a WhatsApp with where and when you saw the pet.
- **Share on WhatsApp, Share, Copy link** everywhere.
- **Printable A4 poster** with QR code, and **"Image for WhatsApp"** (a ready-made PNG poster).
- **Map** on lost posts plus "Open in Google Maps".
- **"[Pet] is missing"** on a pet's page opens a pre-filled lost report.
- **Mark reunited / Mark adopted**, with a celebration.
- **Remind me → Google Calendar or .ics file** (Apple/Outlook calendar) for vaccines, tick and deworming.
- **Mark as given**: records today's dose and sets the next due date automatically.
- **Playdates**: request, accept/decline, WhatsApp unlocks after both say yes, "Plan on calendar".
- **Kaia**: emergency banner with "24×7 vets near me", past chats.
- Notifications (mark all read), settings save, download my data, admin hide/ban with a report detail panel.

## New files worth knowing

- `src/app/(app)/home/` – Home page
- `src/app/(app)/lost/[id]/poster/image/` – WhatsApp poster image
- `src/app/fonts/og/` – fonts for share images (open-source OFL licence included)
- `src/components/brand/` – mascot art, stamps, date tiles
- `src/lib/calendar.ts` – Google Calendar links and .ics files
