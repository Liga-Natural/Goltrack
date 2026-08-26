import { randomBytes } from "node:crypto";
import { all, get, run, uid, nowIso } from "./db";

// ---------- Types ----------

export type Format = "ROUND_ROBIN" | "GROUPS_KNOCKOUT";
export type TournamentStatus = "DRAFT" | "REGISTRATION_OPEN" | "SCHEDULED" | "LIVE" | "COMPLETED";
export type Stage = "GROUP" | "KNOCKOUT";
export type MatchStatus = "SCHEDULED" | "LIVE" | "FINAL";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: string;
}

export interface Tournament {
  id: string;
  slug: string;
  name: string;
  sport: string;
  teamFormat: string; // e.g. "7v7", "9v9", "11v11", "5v5", "3v3"
  format: Format;
  status: TournamentStatus;
  location: string | null;
  startDate: string;
  endDate: string;
  feeCents: number;
  fieldsCount: number;
  groupsCount: number;
  advancePerGroup: number;
  supervisorName: string;
  supervisorEmail: string;
  supervisorPhone: string | null;
  ownerId: string;
  createdAt: string;
}

export interface Team {
  id: string;
  tournamentId: string;
  name: string;
  contactName: string;
  contactEmail: string;
  groupName: string | null;
  logoUrl: string | null; // legacy paste-a-URL fallback, superseded by the crest upload below
  crestMimeType: string | null;
  crestUpdatedAt: string | null;
  hasCrest: number; // 0/1 — computed from crestBlob IS NOT NULL; the blob itself is never selected here
  logoToken: string | null; // no-login self-service crest upload link for the team's own manager/coach
  paid: number; // 0/1
  checkedIn: number; // 0/1
  inviteToken: string | null; // set while the slot is an unclaimed invite link, cleared on claim
  invitedAt: string | null;
  createdAt: string;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  jerseyNumber: string | null;
  birthdate: string | null;
  passportId: string;
  createdAt: string;
}

export interface Match {
  id: string;
  tournamentId: string;
  stage: Stage;
  round: string;
  groupName: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeLabel: string | null;
  awayLabel: string | null;
  homeScore: number | null;
  awayScore: number | null;
  field: string | null;
  scheduledAt: string | null;
  status: MatchStatus;
  refereeId: string | null;
  motmPlayerId: string | null;
  orderIndex: number;
}

export interface Referee {
  id: string;
  tournamentId: string;
  name: string;
  contact: string | null;
}

export interface CheckIn {
  id: string;
  tournamentId: string;
  playerId: string;
  checkedInAt: string;
}

// ---------- Users ----------

export const Users = {
  create(email: string, passwordHash: string, name: string): User {
    const user: User = { id: uid(), email, passwordHash, name, createdAt: nowIso() };
    run(`INSERT INTO users (id, email, passwordHash, name, createdAt) VALUES ($id,$email,$passwordHash,$name,$createdAt)`, user as any);
    return user;
  },
  byEmail(email: string): User | undefined {
    return get<User>(`SELECT * FROM users WHERE email = $email`, { $email: email } as any);
  },
  byId(id: string): User | undefined {
    return get<User>(`SELECT * FROM users WHERE id = $id`, { $id: id } as any);
  },
};

// ---------- Tournaments ----------

export const Tournaments = {
  create(input: Omit<Tournament, "id" | "createdAt">): Tournament {
    const t: Tournament = { ...input, id: uid(), createdAt: nowIso() };
    run(
      `INSERT INTO tournaments (id, slug, name, sport, teamFormat, format, status, location, startDate, endDate, feeCents, fieldsCount, groupsCount, advancePerGroup, supervisorName, supervisorEmail, supervisorPhone, ownerId, createdAt)
       VALUES ($id,$slug,$name,$sport,$teamFormat,$format,$status,$location,$startDate,$endDate,$feeCents,$fieldsCount,$groupsCount,$advancePerGroup,$supervisorName,$supervisorEmail,$supervisorPhone,$ownerId,$createdAt)`,
      t as any
    );
    return t;
  },
  bySlug(slug: string): Tournament | undefined {
    return get<Tournament>(`SELECT * FROM tournaments WHERE slug = $slug`, { $slug: slug } as any);
  },
  byId(id: string): Tournament | undefined {
    return get<Tournament>(`SELECT * FROM tournaments WHERE id = $id`, { $id: id } as any);
  },
  listByOwner(ownerId: string): Tournament[] {
    return all<Tournament>(`SELECT * FROM tournaments WHERE ownerId = $ownerId ORDER BY createdAt DESC`, { $ownerId: ownerId } as any);
  },
  listPublic(): Tournament[] {
    return all<Tournament>(
      `SELECT * FROM tournaments WHERE status != 'DRAFT' ORDER BY startDate DESC`
    );
  },
  updateStatus(id: string, status: TournamentStatus) {
    run(`UPDATE tournaments SET status = $status WHERE id = $id`, { $id: id, $status: status } as any);
  },
  slugExists(slug: string): boolean {
    return !!Tournaments.bySlug(slug);
  },
};

// ---------- Teams ----------

// Unique link tokens: 10 random bytes, base62-encoded (~14 chars — short
// enough to paste into a text message, long enough that guessing one is
// infeasible). Collisions are already astronomically unlikely at this
// length; generateToken()'s callers retry against their own uniqueness
// check if one ever fires, and the DB backs that up (see idx_teams_logoToken
// and the inviteToken UNIQUE column).
const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
function generateToken(): string {
  const bytes = randomBytes(10);
  let token = "";
  for (const byte of bytes) token += BASE62[byte % BASE62.length];
  return token;
}

// Every read below selects an explicit column list rather than `SELECT *`
// so that crestBlob — potentially a multi-MB image — is never pulled off
// disk for a team list or lookup that only needs metadata. hasCrest is a
// cheap computed flag; the actual bytes are only ever fetched by
// Teams.crestBytes(), used solely by the image-serving API route.
const TEAM_COLUMNS = `id, tournamentId, name, contactName, contactEmail, groupName, logoUrl, crestMimeType, crestUpdatedAt, (crestBlob IS NOT NULL) AS hasCrest, logoToken, paid, checkedIn, inviteToken, invitedAt, createdAt`;

export const Teams = {
  create(
    input: Omit<
      Team,
      "id" | "createdAt" | "paid" | "checkedIn" | "groupName" | "logoUrl" | "crestMimeType" | "crestUpdatedAt" | "hasCrest" | "logoToken" | "inviteToken" | "invitedAt"
    > & {
      paid?: boolean;
      groupName?: string | null;
      logoUrl?: string | null;
    }
  ): Team {
    let logoToken = generateToken();
    while (Teams.byLogoToken(logoToken)) logoToken = generateToken(); // defeat the astronomically unlikely collision
    const id = uid();
    const createdAt = nowIso();
    run(
      `INSERT INTO teams (id, tournamentId, name, contactName, contactEmail, groupName, logoUrl, logoToken, paid, checkedIn, inviteToken, invitedAt, createdAt)
       VALUES ($id,$tournamentId,$name,$contactName,$contactEmail,$groupName,$logoUrl,$logoToken,$paid,$checkedIn,NULL,NULL,$createdAt)`,
      {
        $id: id,
        $tournamentId: input.tournamentId,
        $name: input.name,
        $contactName: input.contactName,
        $contactEmail: input.contactEmail,
        $groupName: input.groupName ?? null,
        $logoUrl: input.logoUrl ?? null,
        $logoToken: logoToken,
        $paid: input.paid ? 1 : 0,
        $checkedIn: 0,
        $createdAt: createdAt,
      } as any
    );
    return Teams.byId(id)!;
  },
  // Creates an empty placeholder slot with a unique claim link — the
  // gotsport-style flow where an organizer invites a specific team before
  // that team has entered any of its own details. Also gets its own
  // logoToken up front, so the crest self-service link is ready the moment
  // the invite is claimed (no separate backfill step needed for new teams).
  createInvite(tournamentId: string): Team {
    let inviteToken = generateToken();
    while (Teams.byInviteToken(inviteToken)) inviteToken = generateToken();
    let logoToken = generateToken();
    while (Teams.byLogoToken(logoToken)) logoToken = generateToken();
    const id = uid();
    const now = nowIso();
    run(
      `INSERT INTO teams (id, tournamentId, name, contactName, contactEmail, groupName, logoUrl, logoToken, paid, checkedIn, inviteToken, invitedAt, createdAt)
       VALUES ($id,$tournamentId,'','','',NULL,NULL,$logoToken,0,0,$inviteToken,$invitedAt,$createdAt)`,
      { $id: id, $tournamentId: tournamentId, $logoToken: logoToken, $inviteToken: inviteToken, $invitedAt: now, $createdAt: now } as any
    );
    return Teams.byId(id)!;
  },
  byId(id: string): Team | undefined {
    return get<Team>(`SELECT ${TEAM_COLUMNS} FROM teams WHERE id = $id`, { $id: id } as any);
  },
  byInviteToken(token: string): Team | undefined {
    return get<Team>(`SELECT ${TEAM_COLUMNS} FROM teams WHERE inviteToken = $token`, { $token: token } as any);
  },
  // Looks up a team by its no-login crest-upload token. Unlike inviteToken,
  // this is never cleared after use — a coach can come back and replace the
  // crest later — so this alone can't tell you whether it's "already used".
  byLogoToken(token: string): Team | undefined {
    return get<Team>(`SELECT ${TEAM_COLUMNS} FROM teams WHERE logoToken = $token`, { $token: token } as any);
  },
  listByTournament(tournamentId: string): Team[] {
    return all<Team>(`SELECT ${TEAM_COLUMNS} FROM teams WHERE tournamentId = $tournamentId ORDER BY createdAt ASC`, { $tournamentId: tournamentId } as any);
  },
  // Fills in an invited slot's details and clears the token so the link
  // can't be claimed a second time.
  claimInvite(id: string, input: { name: string; contactName: string; contactEmail: string; logoUrl?: string | null }): Team | undefined {
    run(
      `UPDATE teams SET name=$name, contactName=$contactName, contactEmail=$contactEmail, logoUrl=$logoUrl, inviteToken=NULL WHERE id=$id`,
      {
        $id: id,
        $name: input.name,
        $contactName: input.contactName,
        $contactEmail: input.contactEmail,
        $logoUrl: input.logoUrl ?? null,
      } as any
    );
    return Teams.byId(id);
  },
  setGroup(id: string, groupName: string | null) {
    run(`UPDATE teams SET groupName = $groupName WHERE id = $id`, { $id: id, $groupName: groupName } as any);
  },
  setPaid(id: string, paid: boolean) {
    run(`UPDATE teams SET paid = $paid WHERE id = $id`, { $id: id, $paid: paid ? 1 : 0 } as any);
  },
  setCheckedIn(id: string, checkedIn: boolean) {
    run(`UPDATE teams SET checkedIn = $checkedIn WHERE id = $id`, { $id: id, $checkedIn: checkedIn ? 1 : 0 } as any);
  },
  // Retrofits a logoToken onto a team that predates this feature (created
  // before the migration, or seeded via demo-seed.ts's raw INSERT). Called
  // lazily wherever the link needs to be shown, rather than as a one-time
  // migration pass over every row.
  ensureLogoToken(id: string): string {
    const team = Teams.byId(id);
    if (!team) throw new Error("Team not found");
    if (team.logoToken) return team.logoToken;
    let token = generateToken();
    while (Teams.byLogoToken(token)) token = generateToken();
    run(`UPDATE teams SET logoToken = $token WHERE id = $id`, { $id: id, $token: token } as any);
    return token;
  },
  setCrest(id: string, bytes: Uint8Array, mimeType: string) {
    run(`UPDATE teams SET crestBlob = $blob, crestMimeType = $mimeType, crestUpdatedAt = $updatedAt WHERE id = $id`, {
      $id: id,
      $blob: bytes,
      $mimeType: mimeType,
      $updatedAt: nowIso(),
    } as any);
  },
  // The only place crestBlob is ever read out — used exclusively by the
  // /api/teams/[teamId]/crest route that serves the image.
  crestBytes(id: string): { blob: Uint8Array; mimeType: string } | undefined {
    const row = get<{ crestBlob: Uint8Array | null; crestMimeType: string | null }>(
      `SELECT crestBlob, crestMimeType FROM teams WHERE id = $id`,
      { $id: id } as any
    );
    if (!row || !row.crestBlob || !row.crestMimeType) return undefined;
    return { blob: row.crestBlob, mimeType: row.crestMimeType };
  },
  remove(id: string) {
    run(`DELETE FROM players WHERE teamId = $id`, { $id: id } as any);
    run(`DELETE FROM teams WHERE id = $id`, { $id: id } as any);
  },
};

// ---------- Players ----------

export const Players = {
  create(input: { teamId: string; name: string; jerseyNumber?: string | null; birthdate?: string | null }): Player {
    const p: Player = {
      id: uid(),
      teamId: input.teamId,
      name: input.name,
      jerseyNumber: input.jerseyNumber ?? null,
      birthdate: input.birthdate ?? null,
      passportId: uid(),
      createdAt: nowIso(),
    };
    run(
      `INSERT INTO players (id, teamId, name, jerseyNumber, birthdate, passportId, createdAt)
       VALUES ($id,$teamId,$name,$jerseyNumber,$birthdate,$passportId,$createdAt)`,
      p as any
    );
    return p;
  },
  byId(id: string): Player | undefined {
    return get<Player>(`SELECT * FROM players WHERE id = $id`, { $id: id } as any);
  },
  byPassportId(passportId: string): Player | undefined {
    return get<Player>(`SELECT * FROM players WHERE passportId = $passportId`, { $passportId: passportId } as any);
  },
  listByTeam(teamId: string): Player[] {
    return all<Player>(`SELECT * FROM players WHERE teamId = $teamId ORDER BY createdAt ASC`, { $teamId: teamId } as any);
  },
};

// ---------- Matches ----------

export const Matches = {
  create(input: Omit<Match, "id" | "motmPlayerId">): Match {
    const m: Match = { ...input, motmPlayerId: null, id: uid() };
    run(
      `INSERT INTO matches (id, tournamentId, stage, round, groupName, homeTeamId, awayTeamId, homeLabel, awayLabel, homeScore, awayScore, field, scheduledAt, status, refereeId, motmPlayerId, orderIndex)
       VALUES ($id,$tournamentId,$stage,$round,$groupName,$homeTeamId,$awayTeamId,$homeLabel,$awayLabel,$homeScore,$awayScore,$field,$scheduledAt,$status,$refereeId,$motmPlayerId,$orderIndex)`,
      m as any
    );
    return m;
  },
  byId(id: string): Match | undefined {
    return get<Match>(`SELECT * FROM matches WHERE id = $id`, { $id: id } as any);
  },
  listByTournament(tournamentId: string): Match[] {
    return all<Match>(`SELECT * FROM matches WHERE tournamentId = $tournamentId ORDER BY orderIndex ASC`, { $tournamentId: tournamentId } as any);
  },
  deleteByTournament(tournamentId: string) {
    run(`DELETE FROM matches WHERE tournamentId = $tournamentId`, { $tournamentId: tournamentId } as any);
  },
  updateScore(id: string, homeScore: number | null, awayScore: number | null, status: MatchStatus) {
    run(`UPDATE matches SET homeScore=$homeScore, awayScore=$awayScore, status=$status WHERE id=$id`, {
      $id: id,
      $homeScore: homeScore,
      $awayScore: awayScore,
      $status: status,
    } as any);
  },
  assignReferee(id: string, refereeId: string | null) {
    run(`UPDATE matches SET refereeId = $refereeId WHERE id = $id`, { $id: id, $refereeId: refereeId } as any);
  },
  setMotm(id: string, playerId: string | null) {
    run(`UPDATE matches SET motmPlayerId = $playerId WHERE id = $id`, { $id: id, $playerId: playerId } as any);
  },
  listByTeam(teamId: string): Match[] {
    return all<Match>(
      `SELECT * FROM matches WHERE homeTeamId = $teamId OR awayTeamId = $teamId ORDER BY orderIndex ASC`,
      { $teamId: teamId } as any
    );
  },
  setTeams(id: string, homeTeamId: string | null, awayTeamId: string | null) {
    run(`UPDATE matches SET homeTeamId=$homeTeamId, awayTeamId=$awayTeamId WHERE id=$id`, {
      $id: id,
      $homeTeamId: homeTeamId,
      $awayTeamId: awayTeamId,
    } as any);
  },
};

// ---------- Referees ----------

export const Referees = {
  create(input: { tournamentId: string; name: string; contact?: string | null }): Referee {
    const r: Referee = { id: uid(), tournamentId: input.tournamentId, name: input.name, contact: input.contact ?? null };
    run(`INSERT INTO referees (id, tournamentId, name, contact) VALUES ($id,$tournamentId,$name,$contact)`, r as any);
    return r;
  },
  listByTournament(tournamentId: string): Referee[] {
    return all<Referee>(`SELECT * FROM referees WHERE tournamentId = $tournamentId ORDER BY name ASC`, { $tournamentId: tournamentId } as any);
  },
};

// ---------- Check-ins ----------

export const CheckIns = {
  create(tournamentId: string, playerId: string): CheckIn {
    const existing = get<CheckIn>(`SELECT * FROM checkins WHERE tournamentId=$tournamentId AND playerId=$playerId`, {
      $tournamentId: tournamentId,
      $playerId: playerId,
    } as any);
    if (existing) return existing;
    const c: CheckIn = { id: uid(), tournamentId, playerId, checkedInAt: nowIso() };
    run(`INSERT INTO checkins (id, tournamentId, playerId, checkedInAt) VALUES ($id,$tournamentId,$playerId,$checkedInAt)`, c as any);
    return c;
  },
  listByTournament(tournamentId: string): CheckIn[] {
    return all<CheckIn>(`SELECT * FROM checkins WHERE tournamentId = $tournamentId`, { $tournamentId: tournamentId } as any);
  },
  listByPlayer(playerId: string): CheckIn[] {
    return all<CheckIn>(`SELECT * FROM checkins WHERE playerId = $playerId`, { $playerId: playerId } as any);
  },
};

// ---------- Inquiries ----------
// Public, no-account "ask us about a tournament" submissions.

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  tournamentType: string | null;
  message: string;
  createdAt: string;
}

export const Inquiries = {
  create(input: { name: string; email: string; phone?: string | null; tournamentType?: string | null; message: string }): Inquiry {
    const i: Inquiry = {
      id: uid(),
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      tournamentType: input.tournamentType ?? null,
      message: input.message,
      createdAt: nowIso(),
    };
    run(
      `INSERT INTO inquiries (id, name, email, phone, tournamentType, message, createdAt)
       VALUES ($id,$name,$email,$phone,$tournamentType,$message,$createdAt)`,
      i as any
    );
    return i;
  },
};

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
