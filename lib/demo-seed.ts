import type { Pool, PoolClient } from "pg";
import bcrypt from "bcryptjs";

// Seeds the same "Coastal Cup" demo tournament that scripts/seed.ts creates,
// but runs as part of db.ts's own startup so the demo and the demo@jogo.app
// login work on a totally fresh database with zero manual steps.
//
// Deliberately self-contained (no imports from ./models or ./bracket): this
// runs while db.ts's own module is still being evaluated, before its
// exports are fully assigned, so anything that reached back into db.ts's
// exports would risk a "cannot access before initialization" error. Raw
// queries against the passed-in `pool` sidestep that entirely.

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

// Platform admin for the actual business owner, distinct from the public
// demo@jogo.app login below. Checked before the tournament-seed early-return
// below (and is idempotent on its own via the email check) so it's
// guaranteed on every fresh database regardless of whether the demo
// tournament already exists. The password hash below is bcrypt (one-way) —
// the plaintext was generated once and handed to the account owner
// directly, never committed anywhere.
//
// The id is a fixed constant, not uid(). That mattered under the old
// per-instance-ephemeral-SQLite setup (a session's cookie only carries a
// userId, and a randomly generated one could differ between independently
// seeded instances) and is kept fixed here too — harmless with a shared
// database, and it means an account created under the old setup and one
// seeded fresh here are guaranteed to be the same row rather than a
// duplicate.
const OWNER_ADMIN_ID = "c0de12cb-b24e-44b1-bb8f-d22f0e7c62f9";
const OWNER_ADMIN_EMAIL = "liganatural12@gmail.com";
const OWNER_ADMIN_PASSWORD_HASH = "$2a$10$eQnUpbU3N/5A8o9T95Mwj.Fi8xCUj/ofMnCvB2UbmD/.77.lwvvAi";
const DEMO_ADMIN_ID = "e3eb8d89-81ca-4bd4-9288-d19ae68faa42";

async function ensureOwnerAdminAccount(client: PoolClient): Promise<void> {
  const existing = await client.query(`SELECT id FROM users WHERE email = $1`, [OWNER_ADMIN_EMAIL]);
  if (existing.rows.length > 0) return;
  await client.query(
    `INSERT INTO users (id, email, passwordHash, name, role, createdAt) VALUES ($1,$2,$3,$4,$5,$6)`,
    [OWNER_ADMIN_ID, OWNER_ADMIN_EMAIL, OWNER_ADMIN_PASSWORD_HASH, "Liga Natural", "ADMIN", nowIso()]
  );
}

export async function seedDemoData(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await seedDemoDataUnsafe(client);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("seedDemoData failed:", err);
  } finally {
    client.release();
  }
}

async function seedDemoDataUnsafe(client: PoolClient): Promise<void> {
  await ensureOwnerAdminAccount(client);

  const already = await client.query(`SELECT id FROM tournaments WHERE slug = $1`, ["coastal-cup"]);
  if (already.rows.length > 0) return;

  let ownerId: string;
  const existingUser = await client.query(`SELECT id FROM users WHERE email = $1`, ["demo@jogo.app"]);
  if (existingUser.rows.length > 0) {
    ownerId = existingUser.rows[0].id;
  } else {
    ownerId = DEMO_ADMIN_ID;
    // ADMIN, not ORGANIZER: this is the one account the app creates for you
    // with zero setup, so it doubles as the platform superadmin login —
    // "Alex Rivera" both owns the demo tournament (as any organizer would)
    // and can see every tournament/account on the platform via /admin.
    await client.query(
      `INSERT INTO users (id, email, passwordHash, name, role, createdAt) VALUES ($1,$2,$3,$4,$5,$6)`,
      [ownerId, "demo@jogo.app", bcrypt.hashSync("demo1234", 10), "Alex Rivera", "ADMIN", nowIso()]
    );
  }

  const tournamentId = uid();
  const now = Date.now();
  await client.query(
    `INSERT INTO tournaments (id, slug, name, sport, teamFormat, format, status, location, startDate, endDate, feeCents, fieldsCount, groupsCount, advancePerGroup, supervisorName, supervisorEmail, supervisorPhone, ownerId, createdAt)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
    [
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
      nowIso(),
    ]
  );

  const teamIds: string[] = [];
  for (let i = 0; i < TEAM_SEED.length; i++) {
    const [name, contactName, contactEmail] = TEAM_SEED[i];
    const id = uid();
    const groupName = i % 2 === 0 ? "A" : "B";
    await client.query(
      `INSERT INTO teams (id, tournamentId, name, contactName, contactEmail, groupName, paid, checkedIn, createdAt)
       VALUES ($1,$2,$3,$4,$5,$6,1,0,$7)`,
      [id, tournamentId, name, contactName, contactEmail, groupName, nowIso()]
    );
    for (let j = 0; j < 8; j++) {
      await client.query(
        `INSERT INTO players (id, teamId, name, jerseyNumber, birthdate, passportId, createdAt)
         VALUES ($1,$2,$3,$4,NULL,$5,$6)`,
        [uid(), id, `${FIRST_NAMES[(i * 8 + j) % FIRST_NAMES.length]} ${name.split(" ")[0]}${j}`, String(j + 1), uid(), nowIso()]
      );
    }
    teamIds.push(id);
  }

  const ref1Id = uid();
  const ref2Id = uid();
  await client.query(`INSERT INTO referees (id, tournamentId, name, contact) VALUES ($1,$2,$3,$4)`, [
    ref1Id,
    tournamentId,
    "Chris Alvarado",
    "chris.ref@example.com",
  ]);
  await client.query(`INSERT INTO referees (id, tournamentId, name, contact) VALUES ($1,$2,$3,$4)`, [
    ref2Id,
    tournamentId,
    "Nina Petrov",
    "nina.ref@example.com",
  ]);

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
  for (let i = 0; i < rounds.length; i++) {
    const m = rounds[i];
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
    await client.query(
      `INSERT INTO matches (id, tournamentId, stage, round, groupName, homeTeamId, awayTeamId, homeLabel, awayLabel, homeScore, awayScore, field, scheduledAt, status, refereeId, orderIndex)
       VALUES ($1,$2,'GROUP',$3,$4,$5,$6,NULL,NULL,$7,$8,$9,$10,$11,$12,$13)`,
      [
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
        i,
      ]
    );
  }

  const firstTeamPlayers = await client.query(
    `SELECT id FROM players WHERE teamId = $1 ORDER BY createdAt ASC LIMIT 2`,
    [t0]
  );
  for (const p of firstTeamPlayers.rows as { id: string }[]) {
    await client.query(
      `INSERT INTO checkins (id, tournamentId, playerId, checkedInAt) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [uid(), tournamentId, p.id, nowIso()]
    );
  }
}
