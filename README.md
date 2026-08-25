# GolTrack

Soccer & futsal tournament management software, in the spirit of KopaPlay: registration and payments, auto-balanced scheduling, brackets, live scoring, referee management, on-site check-in, and a QR digital player passport.

The name blends *gol* (Spanish for "goal") with "Track" — it tracks live scores, standings, and brackets in real time, which is literally what the platform does.

## Demo login

- Organizer dashboard: `/login` — **demo@goltrack.app** / **demo1234** (pre-filled on the login page)
- Public tournament page: `/t/coastal-cup`
- Try a player passport from the Teams tab in the dashboard (each player has a "passport →" link)

## Running locally

```bash
npm install
npm run seed   # creates dev.db with a demo organizer + sample tournament
npm run dev    # http://localhost:3000
```

For a production-like run: `npm run build && npm run start`.

## What's implemented

- **Auth** — organizer signup/login, JWT session cookie, protected `/dashboard` routes.
- **Tournaments** — create with sport, format (round robin or groups + knockout), fields, groups, fee.
- **Teams & rosters** — organizer-side management plus a public registration form (`/t/[slug]/register`) with a fee/payment step.
- **Scheduling** — round-robin group stage generator (circle method) spread across fields/time slots; a seeded single-elimination knockout bracket generator that pulls qualifiers straight from live standings.
- **Live scoring** — sideline score entry with Scheduled/Live/Final states; a public tournament page (`/t/[slug]`) showing live matches, standings, schedule, and bracket, refreshing every 5 seconds.
- **Referees** — add referees and assign them to matches.
- **Check-in** — team-level check-in toggle, plus a passport-ID lookup for on-site scanning.
- **Digital player passport** (`/passport/[playerId]`) — QR code, passport ID, check-in status, and a career-timeline summary.
- **Branding** — original name/logo/color system (not KopaPlay's), applied across a marketing landing page and the app shell.

## Architecture notes

- **Next.js 14 (App Router) + TypeScript + Tailwind.** Mutations use React Server Actions (`lib/actions.ts`) instead of a separate REST layer; reads happen directly in server components via `lib/models.ts`.
- **Data layer:** `node:sqlite` (Node 22's built-in SQLite bindings), not an ORM. This was a deliberate substitution for Prisma — the sandbox this was built in blocks Prisma's engine-binary CDN, and `node:sqlite` needed nothing beyond Node itself. All queries live behind the `Users` / `Tournaments` / `Teams` / `Players` / `Matches` / `Referees` / `CheckIns` objects in `lib/models.ts`, so swapping the storage engine later only touches that one file plus `lib/db.ts`.
- **Payments:** the registration flow has a real fee step; without a Stripe key configured it completes as a labeled "demo" payment. Wire up real payments by setting `STRIPE_SECRET_KEY` and replacing the demo button in `app/t/[slug]/register/pay/page.tsx` with a Stripe Checkout redirect — the page already branches on whether the key is present.

## Known limitations / next steps for production

1. **Serverless persistence.** SQLite on a serverless platform (Vercel and similar) only has a writable, *ephemeral* `/tmp` — it resets on cold starts and isn't shared across instances. This build copies a seeded `dev.db` into `/tmp` on first request so a live demo works and stays writable for a warm instance's lifetime, but for a real pilot with paying teams you'll want a hosted database (Postgres via Neon/Supabase/Vercel Postgres, or hosted libSQL/Turso) — swap `lib/db.ts` for a client against that instead.
2. **Real payments.** Stripe (or another processor) needs to be wired in for real fee collection — see the note above.
3. **Player stats.** Passports currently show matches played/won for the player's team, not individual goal-scorer stats — add a `Goal` model + scorer entry in the score form to go further.
4. **Notifications.** No email/SMS is sent on registration, payment, or schedule changes yet.
5. **`node:sqlite` is still an experimental Node API.** It's been stable enough for this build, but pin your Node version (`engines.node` is already set to `22.x`) and keep an eye on Node release notes if you deploy long-term on it.

## Trademark note

"GolTrack" is an original name generated for this project — it has not been trademark-cleared. Do a proper search (USPTO + domain availability) before using it commercially, especially given the South Florida target market.
