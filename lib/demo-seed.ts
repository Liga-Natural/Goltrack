import type { DatabaseSync } from "node:sqlite";
import bcrypt from "bcryptjs";

// Seeds the same "Coastal Cup" demo tournament that scripts/seed.ts creates,
// but runs synchronously inside db.ts's getDb() so the demo and the
// demo@jogo.app login work on a totally fresh database with zero manual
// steps — which matters on serverless, where /tmp is wiped on every cold
// start and nobody is around to run `npm run seed`.
//
// Deliberately self-contained (no imports from ./models or ./bracket): this
// runs while db.ts's own module is still being evaluated, before its `db`
// export is assigned, so anything that reached back into db.ts's exports
// would hit a "cannot access before initialization" error. Raw statements
// against the passed-in `database` sidestep that entirely.

function uid(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

const TEAM_SEED: [name: string, contact: string, email: string][] = [
  ["Riverside Rovers", "Coach Dana", "dana@riversiderovers.example"],
  ["Bay City FC", "Marco Ibarra", "marco@baycityfc.example"],
  ["Sunset Strikers", "Priya Nair", "priya@sunsetstrikers.example"],
  ["Ironclad United", "Jamal Reed", "jamal@ironcladutd.example"],
  ["Palmetto Pumas", "Rosa Delgado", "rosa@palmettopumas.example"],
  ["Harborview Hawks", "Tomas Kwan", "tomas@harborviewhawks.example"],
];

const FIRST_NAMES = ["Sam", "Jordan", "Casey", "Riley", "Morgan", "Taylor", "Avery", "Quinn"];

export function seedDemoData(database: DatabaseSync): void {
  // Next's build step (and every serverless cold start) can spin up several
  // workers that each call getDb() against the same fresh file at once. A
  // plain "check then insert" races between processes and trips a UNIQUE
  // constraint when two of them both see "not seeded yet". BEGIN IMMEDIATE
  // takes the write lock up front so a second process's check-and-insert
  // waits (via the busy_timeout set in db.ts) until the first one commits,
  // and then correctly sees the row already there.
  try {
    database.exec("BEGIN IMMEDIATE");
    seedDemoDataUnsafe(database);
    database.exec("COMMIT");
  } catch (err) {
    try {
      database.exec("ROLLBACK");
    } catch {
      // no transaction was open — nothing to roll back
    }
    console.error("seedDemoData failed (likely a benign race with another process):", err);
  }
}

// Platform admin for the actual business owner, distinct from the public
// demo@jogo.app login above. Runs before the tournament-seed early-return
// below (and is idempotent on its own via the email check) so it's
// guaranteed on every cold start regardless of whether the demo tournament
// already exists — Vercel wipes /tmp on every cold start (see db.ts), so a
// one-off script like scripts/create-admin.ts run against a local dev.db
// would never reach the live site; seeding here is what actually does.
// The password hash below is bcrypt (one-way) — the plaintext was
// generated once and handed to the account owner directly, never
// committed anywhere.
//
// The id is a fixed constant, not uid() — this matters specifically
// because Vercel gives each cold-started serverless instance its own
// independent /tmp database (see db.ts). A login's session cookie only
// carries a userId; if that id were freshly randomized by whichever
// instance happened to seed it, a session created on one instance would
// point to a row that a *different* instance's independently-seeded
// database never created with that id, and getCurrentUser() would
// silently fail to find the user — bouncing straight back to /login with
// no error, on every request that lands on a different instance than the
// one that handled the login. A fixed id sidesteps that: every instance
// seeds the exact same row.
const OWNER_ADMIN_ID = "c0de12cb-b24e-44b1-bb8f-d22f0e7c62f9";
const OWNER_ADMIN_EMAIL = "liganatural12@gmail.com";
const OWNER_ADMIN_PASSWORD_HASH = "$2a$10$eQnUpbU3N/5A8o9T95Mwj.Fi8xCUj/ofMnCvB2UbmD/.77.lwvvAi";

function ensureOwnerAdminAccount(database: DatabaseSync): void {
  const existing = database.prepare(`SELECT id FROM users WHERE email = ?`).get(OWNER_ADMIN_EMAIL);
  if (existing) return;
  database
    .prepare(`INSERT INTO users (id, email, passwordHash, name, role, createdAt) VALUES (?,?,?,?,?,?)`)
    .run(OWNER_ADMIN_ID, OWNER_ADMIN_EMAIL, OWNER_ADMIN_PASSWORD_HASH, "Liga Natural", "ADMIN", nowIso());
}

function seedDemoDataUnsafe(database: DatabaseSync): void {
  ensureOwnerAdminAccount(database);

  const already = database.prepare(`SELECT id FROM tournaments WHERE slug = ?`).get("coastal-cup");
  if (already) return;

  // Fixed id, same reasoning as OWNER_ADMIN_ID above: this account is
  // deterministically re-seeded on every cold-started serverless instance,
  // and a session's cookie only carries a userId, so every instance has to
  // land on the exact same row or logins randomly stop resolving depending
  // on which instance a later request happens to hit.
  const DEMO_ADMIN_ID = "e3eb8d89-81ca-4bd4-9288-d19ae68faa42";
  let ownerId: string;
  const existingUser = database.prepare(`SELECT id FROM users WHERE email = ?`).get("demo@jogo.app") as
    | { id: string }
    | undefined;
  if (existingUser) {
    ownerId = existingUser.id;
  } else {
    ownerId = DEMO_ADMIN_ID;
    // ADMIN, not ORGANIZER: this is the one account the app creates for you
    // with zero setup, so it doubles as the platform superadmin login —
    // "Alex Rivera" both owns the demo tournament (as any organizer would)
    // and can see every tournament/account on the platform via /admin.
    database
      .prepare(`INSERT INTO users (id, email, passwordHash, name, role, createdAt) VALUES (?,?,?,?,?,?)`)
      .run(ownerId, "demo@jogo.app", bcrypt.hashSync("demo1234", 10), "Alex Rivera", "ADMIN", nowIso());
  }

  const tournamentId = uid();
  const now = Date.now();
  database
    .prepare(
      `INSERT INTO tournaments (id, slug, name, sport, teamFormat, format, status, location, startDate, endDate, feeCents, fieldsCount, groupsCount, advancePerGroup, supervisorName, supervisorEmail, supervisorPhone, ownerId, createdAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      tournamentId,
      "coastal-cup",
      "Coastal Cup Youth Invitational",
      "Soccer",
      "9v9",
      "GROUPS_KNOCKOUT",
      "LIVE",
      "Magic City Fields, Miami FL",
      new Date(now - 86400000).toISOString(),
      new Date(now + 86400000).toISOString(),
      15000,
      2,
      2,
      2,
      "Alex Rivera",
      "demo@jogo.app",
      null,
      ownerId,
      nowIso()
    );

  const teamIds = TEAM_SEED.map(([name, contactName, contactEmail], i) => {
    const id = uid();
    const groupName = i % 2 === 0 ? "A" : "B";
    database
      .prepare(
        `INSERT INTO teams (id, tournamentId, name, contactName, contactEmail, groupName, paid, checkedIn, createdAt)
         VALUES (?,?,?,?,?,?,1,0,?)`
      )
      .run(id, tournamentId, name, contactName, contactEmail, groupName, nowIso());
    for (let j = 0; j < 8; j++) {
      database
        .prepare(
          `INSERT INTO players (id, teamId, name, jerseyNumber, birthdate, passportId, createdAt)
           VALUES (?,?,?,?,NULL,?,?)`
        )
        .run(uid(), id, `${FIRST_NAMES[(i * 8 + j) % FIRST_NAMES.length]} ${name.split(" ")[0]}${j}`, String(j + 1), uid(), nowIso());
    }
    return id;
  });

  const ref1Id = uid();
  const ref2Id = uid();
  database
    .prepare(`INSERT INTO referees (id, tournamentId, name, contact) VALUES (?,?,?,?)`)
    .run(ref1Id, tournamentId, "Chris Alvarado", "chris.ref@example.com");
  database
    .prepare(`INSERT INTO referees (id, tournamentId, name, contact) VALUES (?,?,?,?)`)
    .run(ref2Id, tournamentId, "Nina Petrov", "nina.ref@example.com");

  const [t0, t1, t2, t3, t4, t5] = teamIds; // group A: t0,t2,t4 · group B: t1,t3,t5
  const rounds: { group: "A" | "B"; round: number; home: string; away: string }[] = [
    { group: "A", round: 1, home: t0, away: t2 },
    { group: "B", round: 1, home: t1, away: t3 },
    { group: "A", round: 2, home: t0, away: t4 },
    { group: "B", round: 2, home: t1, away: t5 },
    { group: "A", round: 3, home: t2, away: t4 },
    { group: "B", round: 3, home: t3, away: t5 },
  ];
  const startTime = now - 3 * 3600000;
  rounds.forEach((m, i) => {
    let homeScore: number | null = null;
    let awayScore: number | null = null;
    let status = "SCHEDULED";
    if (i < 4) {
      homeScore = (i * 2) % 4;
      awayScore = (i * 3 + 1) % 4;
      status = "FINAL";
    } else if (i === 4) {
      homeScore = 1;
      awayScore = 1;
      status = "LIVE";
    }
    const field = m.group === "A" ? "Field 1" : "Field 2";
    const scheduledAt = new Date(startTime + (m.round - 1) * 45 * 60000).toISOString();
    database
      .prepare(
        `INSERT INTO matches (id, tournamentId, stage, round, groupName, homeTeamId, awayTeamId, homeLabel, awayLabel, homeScore, awayScore, field, scheduledAt, status, refereeId, orderIndex)
         VALUES (?,?,'GROUP',?,?,?,?,NULL,NULL,?,?,?,?,?,?,?)`
      )
      .run(
        uid(),
        tournamentId,
        `Group ${m.group} - Round ${m.round}`,
        m.group,
        m.home,
        m.away,
        homeScore,
        awayScore,
        field,
        scheduledAt,
        status,
        i % 2 === 0 ? ref1Id : ref2Id,
        i
      );
  });

  const firstTeamPlayers = database
    .prepare(`SELECT id FROM players WHERE teamId = ? ORDER BY createdAt ASC LIMIT 2`)
    .all(t0) as { id: string }[];
  for (const p of firstTeamPlayers) {
    database
      .prepare(`INSERT OR IGNORE INTO checkins (id, tournamentId, playerId, checkedInAt) VALUES (?,?,?,?)`)
      .run(uid(), tournamentId, p.id, nowIso());
  }
}
