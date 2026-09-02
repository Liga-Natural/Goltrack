import { Pool } from "pg";
import fs from "node:fs";
import path from "node:path";
import { seedDemoData } from "./demo-seed";

// Jogo runs on real Postgres now, not the local SQLite file this started
// with. That earlier version stored its database on Vercel's /tmp, which
// is wiped on every cold start — meaning every real signup (a team
// manager, a player claiming a passport, an organizer's own tournament)
// could vanish at any time. A real hosted database is the only fix for
// that; everything below exists to make the swap without having to
// rewrite every query in lib/models.ts by hand (see translateNamedParams).

function resolveConnectionString(): string {
  // Vercel's Postgres marketplace integrations (Neon, Supabase, etc.) each
  // name their env var slightly differently depending on which one was
  // connected — checking a few common names means the app works regardless
  // of which the account owner picked, without needing them to know or
  // report the exact name.
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING;
  if (!url) {
    throw new Error(
      "No database connection string found. Set DATABASE_URL (or POSTGRES_URL) in the environment — " +
        "on Vercel this is added automatically once a Postgres database is connected to the project " +
        "under Storage; locally, set it in .env.local."
    );
  }
  return url;
}

declare global {
  // eslint-disable-next-line no-var
  var __jogoPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __jogoReady: Promise<void> | undefined;
}

function getPool(): Pool {
  if (global.__jogoPool) return global.__jogoPool;
  const connectionString = resolveConnectionString();
  // Managed Postgres providers (Neon included) require TLS and commonly
  // present a certificate that isn't in Node's default trust store for a
  // serverless runtime; rejectUnauthorized:false is the standard, expected
  // setting for exactly this case (the connection is still encrypted, this
  // only skips CA verification).
  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
  });
  global.__jogoPool = pool;
  return pool;
}

// SQLite's node:sqlite driver took named parameters ($id, $email, ...)
// directly; node-postgres only supports positional ones ($1, $2, ...).
// Rewriting every query string and call site across lib/models.ts and
// lib/actions.ts to positional params would be a huge, error-prone diff
// for zero behavioral benefit — this instead rewrites the SQL text at
// query time: scan for $identifier tokens in order of first appearance,
// replace each with $1, $2, ... and pull the matching value out of the
// params object into a same-order array. Every existing query string and
// every existing $name-keyed params object throughout the codebase is
// unchanged.
const paramCache = new Map<string, { sql: string; names: string[] }>();

function translateNamedParams(sql: string): { sql: string; names: string[] } {
  const cached = paramCache.get(sql);
  if (cached) return cached;
  const names: string[] = [];
  const translated = sql.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (_match, name: string) => {
    let index = names.indexOf(name);
    if (index === -1) {
      names.push(name);
      index = names.length - 1;
    }
    return `$${index + 1}`;
  });
  const result = { sql: translated, names };
  paramCache.set(sql, result);
  return result;
}

function toPositionalParams(sql: string, params: Record<string, unknown>): { sql: string; values: unknown[] } {
  const { sql: translated, names } = translateNamedParams(sql);
  const values = names.map((name) => {
    // node:sqlite matched a $name placeholder against a params object key
    // of either `$name` or bare `name` — most call sites in this codebase
    // build an explicit `{ $id: ... }` object, but several (Users.create,
    // Tournaments.create, and others that pass a whole record straight
    // through as params) rely on the bare-key form working too. Checking
    // both preserves every existing call site exactly as it already reads,
    // instead of quietly requiring the `$`-prefixed form everywhere.
    const value = params[`$${name}`] !== undefined ? params[`$${name}`] : params[name];
    // node:sqlite treated an absent key as SQL NULL; pg needs an explicit
    // null rather than undefined, which it would otherwise reject.
    return value === undefined ? null : value;
  });
  return { sql: translated, values };
}

async function ensureReady(): Promise<void> {
  if (!global.__jogoReady) {
    global.__jogoReady = initialize();
  }
  return global.__jogoReady;
}

// Next's build step (and every serverless cold start) can have several
// workers each call getDb() against the same fresh database concurrently.
// Unlike SQLite's file-level locking, Postgres's own CREATE TABLE IF NOT
// EXISTS is not safe under concurrent connections — two workers can both
// pass the "IF NOT EXISTS" check before either commits, then collide when
// both actually try to create the table. A session-level advisory lock
// (an arbitrary constant, scoped to this app) serializes the one-time
// schema+migrations+seed sequence across every worker; whichever one gets
// there first does the real work whilst the rest block, and by the time
// they get their turn everything already exists so it's a no-op.
const INIT_LOCK_ID = 5748219;

async function initialize(): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [INIT_LOCK_ID]);
    const schema = fs.readFileSync(path.join(process.cwd(), "lib", "schema.sql"), "utf-8");
    await client.query(schema);
    await runMigrations(pool);
    await seedDemoData(pool);
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [INIT_LOCK_ID]);
    client.release();
  }
}

// `CREATE TABLE IF NOT EXISTS` (above) only creates tables that don't exist
// yet — it never adds columns to a table that's already there. Any column
// added to schema.sql after the app has real data needs an explicit,
// idempotent ALTER TABLE here so an existing database picks it up without
// losing what's already in it. Never DROP or rewrite a table this way.
async function ensureColumn(pool: Pool, table: string, column: string, ddl: string) {
  const existing = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
    [table, column.toLowerCase()]
  );
  if (existing.rows.length > 0) return;
  await pool.query(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

async function runMigrations(pool: Pool) {
  await ensureColumn(pool, "teams", "crestblob", "crestBlob BYTEA");
  await ensureColumn(pool, "teams", "crestmimetype", "crestMimeType TEXT");
  await ensureColumn(pool, "teams", "crestupdatedat", "crestUpdatedAt TEXT");
  await ensureColumn(pool, "teams", "logotoken", "logoToken TEXT");
  await ensureColumn(pool, "teams", "userid", "userId TEXT");
  await ensureColumn(pool, "players", "userid", "userId TEXT");
  await ensureColumn(pool, "users", "role", "role TEXT NOT NULL DEFAULT 'ORGANIZER'");
  await ensureColumn(pool, "site_settings", "theme", "theme TEXT NOT NULL DEFAULT 'dark'");
  // Divisions are stored as a JSON array of strings on the tournament
  // rather than as their own table: they are a fixed list chosen once in the
  // creation wizard and only ever read back whole, so a join table would
  // buy nothing but an extra query on every applicant form render.
  await ensureColumn(pool, "tournaments", "divisions", "divisions TEXT");
  // A club badge uploaded with the application, before any team row exists
  // to hang it on. Copied onto the team at acceptance.
  await ensureColumn(pool, "applications", "crestblob", "crestBlob BYTEA");
  await ensureColumn(pool, "applications", "crestmimetype", "crestMimeType TEXT");
  // logoToken's inline UNIQUE in schema.sql only takes effect on a brand-new
  // CREATE TABLE; a database that already existed before this column was
  // added just got it via ALTER TABLE ADD COLUMN above, which can't attach
  // a UNIQUE constraint through Postgres's ALTER TABLE ADD COLUMN either.
  // This index is what actually enforces uniqueness for that case — must
  // run after the column above is guaranteed to exist. IF NOT EXISTS makes
  // it a no-op afterward.
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_logoToken ON teams(logoToken) WHERE logoToken IS NOT NULL;`);
  // Waivers, recorded by the organizer rather than collected by Jogo: this is
  // a date-stamped "we have this club's paperwork on file", not an e-signature
  // (there is no document store, and the finance UI says so where it shows).
  await ensureColumn(pool, "teams", "waiverreceivedat", "waiverReceivedAt TEXT");
  // The legal identity that has to appear on a printed invoice for it to be
  // usable as an accounting record. Site-wide, on the same single-row table as
  // the other branding settings, and edited from /dashboard/settings.
  await ensureColumn(pool, "site_settings", "businessname", "businessName TEXT");
  await ensureColumn(pool, "site_settings", "businessaddress", "businessAddress TEXT");
  await ensureColumn(pool, "site_settings", "taxid", "taxId TEXT");
  // Invoice numbers are quoted to clubs and cited in accounts, so two
  // invoices sharing one is a genuine correctness problem rather than an
  // untidiness. The index is what enforces it: lib/invoices.ts only proposes
  // the next number, and a collision between two simultaneous issuers has to
  // fail loudly here instead of producing a duplicate.
  // Account administration. status defaults to ACTIVE so every account that
  // predates this column keeps working exactly as it did; permissions stays
  // NULL, which lib/permissions.ts reads as "this role's defaults" rather
  // than as an empty grant.
  await ensureColumn(pool, "users", "status", "status TEXT NOT NULL DEFAULT 'ACTIVE'");
  await ensureColumn(pool, "users", "permissions", "permissions TEXT");
  await ensureColumn(pool, "users", "organization", "organization TEXT");
  await ensureColumn(pool, "users", "phone", "phone TEXT");
  await ensureColumn(pool, "users", "lastsigninat", "lastSignInAt TEXT");
  await ensureColumn(pool, "users", "invitedbyuserid", "invitedByUserId TEXT");
  // An invite token is a bearer credential — two invites sharing one would let
  // the wrong person claim the wrong role.
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_platform_payouts_tournament ON platform_payouts(tournamentId);`);
  // Player profile fields. Position is free text rather than an enum: the
  // vocabulary differs by sport and by club, and a fixed list would be wrong
  // for the first futsal or basketball event.
  await ensureColumn(pool, "players", "position", "position TEXT");
  await ensureColumn(pool, "players", "secondaryposition", "secondaryPosition TEXT");
  await ensureColumn(pool, "players", "graduationyear", "graduationYear INTEGER");
  await ensureColumn(pool, "players", "videourl", "videoUrl TEXT");
  await ensureColumn(pool, "players", "videoprivacy", "videoPrivacy TEXT NOT NULL DEFAULT 'PRIVATE'");
  // Linking a referee row to an account is what lets a referee sign in and
  // score their own matches — the missing half the scorepad's comment named.
  await ensureColumn(pool, "referees", "userid", "userId TEXT");
  await ensureColumn(pool, "referees", "certification", "certification TEXT");
  await ensureColumn(pool, "referees", "ratingpct", "ratingPct INTEGER");
  await ensureColumn(pool, "lineups", "arrows", "arrows TEXT");
  // Live event status for spectators — OPEN | DELAY | SUSPENDED — plus the
  // organizer's own words about it.
  await ensureColumn(pool, "tournaments", "eventstatus", "eventStatus TEXT NOT NULL DEFAULT 'OPEN'");
  await ensureColumn(pool, "tournaments", "eventstatusnote", "eventStatusNote TEXT");
  await ensureColumn(pool, "tournaments", "eventstatusat", "eventStatusAt TEXT");
  // Broadcast priority. Urgent messages also surface as a banner on the
  // public page, which is what makes "in-app alert" mean anything.
  await ensureColumn(pool, "application_messages", "priority", "priority TEXT NOT NULL DEFAULT 'STANDARD'");
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_match_events_match ON match_events(matchId);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_match_events_player ON match_events(playerId);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_match_events_tournament ON match_events(tournamentId);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_player_metrics_player ON player_metrics(playerId);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_player_availability_match ON player_availability(matchId);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_referee_fees_referee ON referee_fees(refereeId);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_referee_fees_match ON referee_fees(matchId);`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_invites_token ON user_invites(token);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_tournament_staff_user ON tournament_staff(userId);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_tournament_staff_tournament ON tournament_staff(tournamentId);`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_number ON invoices(number);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_invoices_tournament ON invoices(tournamentId);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoiceId);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON invoice_payments(invoiceId);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_invoice_installments_invoice ON invoice_installments(invoiceId);`);
  // One-time backfill: on any database seeded before roles existed, the demo
  // account (the only user this app creates for you automatically) should
  // be the platform admin rather than falling through to the ORGANIZER
  // default above. Idempotent — a no-op once it's already ADMIN.
  await pool.query(`UPDATE users SET role = 'ADMIN' WHERE email = 'demo@jogo.app' AND role != 'ADMIN';`);
}

export function uid(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

// Thin helpers to keep call sites readable, mirroring the previous
// node:sqlite-backed run/get/all shape — every caller elsewhere in the
// codebase is unchanged except for now needing `await`.
//
// One more mismatch node:sqlite never had: an unquoted column name in
// Postgres DDL is folded to all-lowercase (passwordHash becomes
// passwordhash), and every row pg hands back uses that folded name — but
// every model, action, and component in this app reads rows via the exact
// camelCase names declared in schema.sql and the TypeScript interfaces
// (user.passwordHash, team.tournamentId, ...). Rather than quote every
// column in every query and DDL statement across the codebase, this maps
// each folded lowercase key back to its real camelCase name on the way
// out — the fixed list below is every column in schema.sql that isn't
// already all-lowercase, plus hasCrest, the one computed-alias column
// that gets folded the same way.
const CAMEL_CASE_COLUMNS: Record<string, string> = {
  accentcolor: "accentColor",
  advancepergroup: "advancePerGroup",
  acceptcash: "acceptCash",
  awayscoreverified: "awayScoreVerified",
  clearedat: "clearedAt",
  eventstatus: "eventStatus",
  eventstatusat: "eventStatusAt",
  eventstatusnote: "eventStatusNote",
  distancehundredths: "distanceHundredths",
  graduationyear: "graduationYear",
  marshalname: "marshalName",
  marshalsignature: "marshalSignature",
  matchid: "matchId",
  ratingpct: "ratingPct",
  refereename: "refereeName",
  refereesignature: "refereeSignature",
  respondedat: "respondedAt",
  secondaryposition: "secondaryPosition",
  sprint40hundredths: "sprint40Hundredths",
  submittedat: "submittedAt",
  topspeedhundredths: "topSpeedHundredths",
  verticaljumphundredths: "verticalJumpHundredths",
  videoprivacy: "videoPrivacy",
  videourl: "videoUrl",
  yoyohundredths: "yoyoHundredths",
  acceptcheck: "acceptCheck",
  acceptedat: "acceptedAt",
  acceptwire: "acceptWire",
  acceptzelle: "acceptZelle",
  amountcents: "amountCents",
  balanceduedays: "balanceDueDays",
  depositbasis: "depositBasis",
  depositcents: "depositCents",
  depositmode: "depositMode",
  depositpercent: "depositPercent",
  earlybirddiscountcents: "earlyBirdDiscountCents",
  earlybirduntil: "earlyBirdUntil",
  flatcents: "flatCents",
  latefeeafter: "lateFeeAfter",
  latefeecents: "lateFeeCents",
  manualapproval: "manualApproval",
  multiteamminteams: "multiTeamMinTeams",
  multiteampercent: "multiTeamPercent",
  offlineinstructions: "offlineInstructions",
  passthrough: "passThrough",
  payoutcents: "payoutCents",
  percentbps: "percentBps",
  reminderdaysafter: "reminderDaysAfter",
  reminderdaysbefore: "reminderDaysBefore",
  reminderonduedate: "reminderOnDueDate",
  tiermonthlycents: "tierMonthlyCents",
  tiername: "tierName",
  applicationid: "applicationId",
  expiresat: "expiresAt",
  invitedbyname: "invitedByName",
  invitedbyuserid: "invitedByUserId",
  lastsigninat: "lastSignInAt",
  revokedat: "revokedAt",
  billtoclub: "billToClub",
  billtocontact: "billToContact",
  billtoemail: "billToEmail",
  billtophone: "billToPhone",
  businessaddress: "businessAddress",
  businessname: "businessName",
  discountcents: "discountCents",
  discountcode: "discountCode",
  dueat: "dueAt",
  installmentcount: "installmentCount",
  invoiceid: "invoiceId",
  issuedat: "issuedAt",
  itemcount: "itemCount",
  paidat: "paidAt",
  paidcents: "paidCents",
  processingfeecents: "processingFeeCents",
  recordedat: "recordedAt",
  recordedbyname: "recordedByName",
  taxid: "taxId",
  teamcount: "teamCount",
  unitpricecents: "unitPriceCents",
  waiverreceivedat: "waiverReceivedAt",
  awaylabel: "awayLabel",
  awayscore: "awayScore",
  awayteamid: "awayTeamId",
  checkedin: "checkedIn",
  checkedinat: "checkedInAt",
  contactemail: "contactEmail",
  contactname: "contactName",
  createdat: "createdAt",
  crestblob: "crestBlob",
  crestmimetype: "crestMimeType",
  crestupdatedat: "crestUpdatedAt",
  enddate: "endDate",
  feecents: "feeCents",
  fieldscount: "fieldsCount",
  groupname: "groupName",
  groupscount: "groupsCount",
  hascrest: "hasCrest",
  homelabel: "homeLabel",
  homescore: "homeScore",
  hometeamid: "homeTeamId",
  invitetoken: "inviteToken",
  invitedat: "invitedAt",
  jerseynumber: "jerseyNumber",
  clubname: "clubName",
  decidedat: "decidedAt",
  manageremail: "managerEmail",
  managername: "managerName",
  managerphone: "managerPhone",
  logotoken: "logoToken",
  logourl: "logoUrl",
  motmplayerid: "motmPlayerId",
  orderindex: "orderIndex",
  ownerid: "ownerId",
  passportid: "passportId",
  passwordhash: "passwordHash",
  paymentstatus: "paymentStatus",
  playerid: "playerId",
  refereeid: "refereeId",
  recipientcount: "recipientCount",
  rostercount: "rosterCount",
  scheduledat: "scheduledAt",
  startdate: "startDate",
  supervisoremail: "supervisorEmail",
  supervisorname: "supervisorName",
  supervisorphone: "supervisorPhone",
  teamformat: "teamFormat",
  teamname: "teamName",
  teamid: "teamId",
  tournamentid: "tournamentId",
  tournamentname: "tournamentName",
  tournamenttype: "tournamentType",
  updatedat: "updatedAt",
  userid: "userId",
};

function camelizeRow<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    out[CAMEL_CASE_COLUMNS[key] ?? key] = row[key];
  }
  return out as T;
}

export async function run(sql: string, params: Record<string, unknown> = {}): Promise<{ changes: number }> {
  await ensureReady();
  const pool = getPool();
  const { sql: translated, values } = toPositionalParams(sql, params);
  const result = await pool.query(translated, values);
  return { changes: result.rowCount ?? 0 };
}

export async function get<T = any>(sql: string, params: Record<string, unknown> = {}): Promise<T | undefined> {
  await ensureReady();
  const pool = getPool();
  const { sql: translated, values } = toPositionalParams(sql, params);
  const result = await pool.query(translated, values);
  return result.rows[0] ? camelizeRow<T>(result.rows[0]) : undefined;
}

export async function all<T = any>(sql: string, params: Record<string, unknown> = {}): Promise<T[]> {
  await ensureReady();
  const pool = getPool();
  const { sql: translated, values } = toPositionalParams(sql, params);
  const result = await pool.query(translated, values);
  return result.rows.map((row) => camelizeRow<T>(row));
}

