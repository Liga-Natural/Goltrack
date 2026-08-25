import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

// GolTrack uses Node's built-in `node:sqlite` module instead of an ORM.
// Why: this sandbox's network policy blocks Prisma's engine-binary CDN, and
// node:sqlite ships with Node 22+ with zero native/network dependencies —
// which also makes it trivial to run anywhere without a build step.
//
// Serverless note: on Vercel, the filesystem is read-only except /tmp, and
// /tmp is wiped between cold starts. For this MVP we copy the seeded db into
// /tmp on first use so the live demo has data and writes work for the life
// of a warm instance. For real production use, swap this file for a hosted
// Postgres/libSQL connection (the query helpers below are the only place
// that would need to change).

function resolveDbPath(): string {
  const isServerless = !!process.env.VERCEL;
  if (!isServerless) {
    return path.join(process.cwd(), "dev.db");
  }
  const tmpPath = "/tmp/matchgrid.db";
  if (!fs.existsSync(tmpPath)) {
    const bundledSeed = path.join(process.cwd(), "dev.db");
    if (fs.existsSync(bundledSeed)) {
      fs.copyFileSync(bundledSeed, tmpPath);
    }
  }
  return tmpPath;
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
  const schema = fs.readFileSync(path.join(process.cwd(), "lib", "schema.sql"), "utf-8");
  database.exec(schema);
  global.__goltrackDb = database;
  return database;
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

export function get<T = any>(sql: string, params: Record<string, unknown> = {}): T | undefined {
  const stmt = db.prepare(sql);
  return stmt.get(params as any) as T | undefined;
}

export function all<T = any>(sql: string, params: Record<string, unknown> = {}): T[] {
  const stmt = db.prepare(sql);
  return stmt.all(params as any) as T[];
}
