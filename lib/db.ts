import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { seedDemoData } from "./demo-seed";

// GolTrack uses Node's built-in `node:sqlite` module instead of an ORM.
// Why: this sandbox's network policy blocks Prisma's engine-binary CDN, and
// node:sqlite ships with Node 22+ with zero native/network dependencies —
// which also makes it trivial to run anywhere without a build step.
//
// Serverless note: on Vercel, the filesystem is read-only except /tmp, and
// /tmp is wiped on every cold start, so real organizer data entered against
// a live deployment can vanish. For real production use, swap this file for
// a hosted Postgres/libSQL connection (the query helpers below are the only
// place that would need to change). The demo tournament survives this fine
// either way, because seedDemoData() below recreates it from scratch on
// every cold start.

function resolveDbPath(): string {
  const isServerless = !!process.env.VERCEL;
  return isServerless ? "/tmp/matchgrid.db" : path.join(process.cwd(), "dev.db");
}

declare global {
  // eslint-disable-next-line no-var
  var __goltrackDb: DatabaseSync | undefined;
}

function getDb(): DatabaseSync {
  if (global.__goltrackDb) return global.__goltrackDb;
  const dbPath = resolveDbPath();
  const database = new DatabaseSync(dbPath);
  database.exec("PRAGMA foreign_keys = ON;");
  // Next's build step imports every route module (each opening this same file)
  // concurrently from separate workers; WAL + a busy timeout keep that from
  // failing with "database is locked" instead of just waiting its turn.
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec("PRAGMA busy_timeout = 5000;");
  const schema = fs.readFileSync(path.join(process.cwd(), "lib", "schema.sql"), "utf-8");
  database.exec(schema);
  runMigrations(database);
  seedDemoData(database);
  global.__goltrackDb = database;
  return database;
}

// `CREATE TABLE IF NOT EXISTS` (above) only creates tables that don't exist
// yet — it never adds columns to a table that's already there. Any column
// added to schema.sql after the app has real data needs an explicit,
// idempotent ALTER TABLE here so an existing database picks it up without
// losing what's already in it. Never DROP or rewrite a table this way.
function ensureColumn(database: DatabaseSync, table: string, column: string, ddl: string) {
  const existing = database.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (existing.some((c) => c.name === column)) return;
  database.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

function runMigrations(database: DatabaseSync) {
  ensureColumn(database, "teams", "crestBlob", "crestBlob BLOB");
  ensureColumn(database, "teams", "crestMimeType", "crestMimeType TEXT");
  ensureColumn(database, "teams", "crestUpdatedAt", "crestUpdatedAt TEXT");
  ensureColumn(database, "teams", "logoToken", "logoToken TEXT");
  // logoToken's inline UNIQUE in schema.sql only takes effect on a brand-new
  // CREATE TABLE; a database that already existed before this column was
  // added just got it via ALTER TABLE ADD COLUMN above, and SQLite can't
  // attach a UNIQUE constraint through ALTER TABLE. This index is what
  // actually enforces uniqueness for that case — must run after the column
  // above is guaranteed to exist. IF NOT EXISTS makes it a no-op afterward.
  database.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_logoToken ON teams(logoToken) WHERE logoToken IS NOT NULL;`);
}

export const db = getDb();

export function uid(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

// Thin helpers to keep call sites readable: node:sqlite's StatementSync
// returns typed rows already, these just centralize prepare+run/all/get.
export function run(sql: string, params: Record<string, unknown> = {}) {
  const stmt = db.prepare(sql);
  return stmt.run(params as any);
}

// node:sqlite hands back rows with a null prototype rather than plain object
// literals. That's invisible almost everywhere, but React's RSC serializer
// rejects null-prototype objects when a server component passes one straight
// into a "use client" component ("Classes or null prototypes are not
// supported"). Spreading into a fresh `{}` gives every row a normal
// prototype so query results are safe to pass to client components anywhere
// in the app, not just call sites that happen to need it today.
export function get<T = any>(sql: string, params: Record<string, unknown> = {}): T | undefined {
  const stmt = db.prepare(sql);
  const row = stmt.get(params as any);
  return row ? ({ ...(row as object) } as T) : undefined;
}

export function all<T = any>(sql: string, params: Record<string, unknown> = {}): T[] {
  const stmt = db.prepare(sql);
  return (stmt.all(params as any) as object[]).map((row) => ({ ...row })) as T[];
}
