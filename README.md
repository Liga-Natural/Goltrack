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
npm run dev    # http://localhost:3000 — dev.db is created and seeded with demo data automatically
```

For a production-like run: `npm run build && npm run start`.

To create a real (non-demo) organizer account: `npm run create-admin -- you@example.com "Your Name"`.

## What's implemented

- **Auth** — organizer signup/login, JWT session cookie, protected `/dashboard` routes.
- **Tournaments** — create with sport (Soccer, Futsal, Basketball, Flag Football), a per-sport team format (e.g. 7v7/9v9/11v11 for Soccer), bracket structure (round robin or groups + knockout), fields, groups, fee, and the tournament director's contact info.
- **Teams & rosters** — organizer-side management, unique one-time invite links per team (`/t/[slug]/invite/[token]`), plus open public registration (`/t/[slug]/register`) with a fee/payment step.
- **Scheduling** — round-robin group stage generator (circle method) spread across fields/time slots; a seeded single-elimination knockout bracket generator that pulls qualifiers straight from live standings.
- **Live scoring** — sideline score entry with Scheduled/Live/Final states and a Man of the Match pick; a public tournament page (`/t/[slug]`) showing live matches, standings, schedule, and bracket, refreshing every 5 seconds.
- **Referees** — add referees and assign them to matches.
- **Check-in** — team-level check-in toggle, plus a passport-ID lookup for on-site scanning.
- **Digital player passport** (`/passport/[playerId]`) — QR code, passport ID, check-in status, and a career-timeline summary.
- **Public league hub** — `/tournaments` lists every tournament; every team gets a public profile page with roster and results.
- **Branding** — original name/logo/color system, a mobile-responsive dashboard shell, and a marketing site including a no-login product showcase (`/tour`) and inquiry form (`/inquire`).

## Architecture notes

- **Next.js 14 (App Router) + TypeScript + Tailwind.** Mutations use React Server Actions (`lib/actions.ts`) instead of a separate REST layer; reads happen directly in server components via `lib/models.ts`.
- **Data layer:** `node:sqlite` (Node 22's built-in SQLite bindings), not an ORM. This was a deliberate substitution for Prisma — the sandbox this was built in blocks Prisma's engine-binary CDN, and `node:sqlite` needed nothing beyond Node itself. All queries live behind the `Users` / `Tournaments` / `Teams` / `Players` / `Matches` / `Referees` / `CheckIns` objects in `lib/models.ts`, so swapping the storage engine later only touches that one file plus `lib/db.ts`.
- **Payments:** the registration flow has a real fee step; without a Stripe key configured it completes as a labeled "demo" payment. Wire up real payments by setting `STRIPE_SECRET_KEY` and replacing the demo button in `app/t/[slug]/register/pay/page.tsx` with a Stripe Checkout redirect — the page already branches on whether the key is present.

## Known limitations / next steps for production

1. **Serverless persistence.** SQLite on a serverless platform (Vercel and similar) only has a writable, *ephemeral* `/tmp` — it resets on cold starts and isn't shared across instances. `lib/demo-seed.ts` recreates the demo tournament from scratch on every cold start so the public demo and `demo@goltrack.app` login always work, but any *real* organizer data (teams, rosters, payments) entered against a live deployment can vanish on the next cold start. For a real pilot with paying teams you'll want a hosted database (Postgres via Neon/Supabase/Vercel Postgres, or hosted libSQL/Turso) — swap `lib/db.ts` for a client against that instead; `lib/models.ts` is the only other file that touches SQL.
2. **Real payments.** Stripe (or another processor) needs to be wired in for real fee collection — see the note above.
3. **Player stats.** Passports currently show matches played/won for the player's team, not individual goal-scorer stats — add a `Goal` model + scorer entry in the score form to go further.
4. **Notifications.** No email/SMS is sent on registration, payment, or schedule changes yet.
5. **`node:sqlite` is still an experimental Node API.** It's been stable enough for this build, but pin your Node version (`engines.node` is already set to `22.x`) and keep an eye on Node release notes if you deploy long-term on it.

## Trademark note

"GolTrack" is an original name generated for this project — it has not been trademark-cleared. Do a proper search (USPTO + domain availability) before using it commercially, especially given the South Florida target market.
