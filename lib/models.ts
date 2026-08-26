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
  logoUrl: string | null;
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

// Unique registration-link tokens: 10 random bytes, base62-encoded (~14
// chars — short enough to paste into a text message, long enough that
// guessing one is infeasible). Collisions are already astronomically
// unlikely at this length, but the DB's UNIQUE constraint is the real
// backstop — regenerateInviteToken() below retries if it ever fires.
const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
function generateInviteToken(): string {
  const bytes = randomBytes(10);
  let token = "";
  for (const byte of bytes) token += BASE62[byte % BASE62.length];
  return token;
}

export const Teams = {
  create(
    input: Omit<Team, "id" | "createdAt" | "paid" | "checkedIn" | "groupName" | "logoUrl" | "inviteToken" | "invitedAt"> & {
      paid?: boolean;
      groupName?: string | null;
      logoUrl?: string | null;
    }
  ): Team {
    const t: Team = {
      id: uid(),
      tournamentId: input.tournamentId,
      name: input.name,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      groupName: input.groupName ?? null,
      logoUrl: input.logoUrl ?? null,
      paid: input.paid ? 1 : 0,
      checkedIn: 0,
      inviteToken: null,
      invitedAt: null,
      createdAt: nowIso(),
    };
    run(
      `INSERT INTO teams (id, tournamentId, name, contactName, contactEmail, groupName, logoUrl, paid, checkedIn, inviteToken, invitedAt, createdAt)
       VALUES ($id,$tournamentId,$name,$contactName,$contactEmail,$groupName,$logoUrl,$paid,$checkedIn,$inviteToken,$invitedAt,$createdAt)`,
      t as any
    );
    return t;
  },
  // Creates an empty placeholder slot with a unique claim link — the
  // gotsport-style flow where an organizer invites a specific team before
  // that team has entered any of its own details.
  createInvite(tournamentId: string): Team {
    let token = generateInviteToken();
    while (Teams.byInviteToken(token)) token = generateInviteToken(); // defeat the astronomically unlikely collision
    const t: Team = {
      id: uid(),
      tournamentId,
      name: "",
      contactName: "",
      contactEmail: "",
      groupName: null,
      logoUrl: null,
      paid: 0,
      checkedIn: 0,
      inviteToken: token,
      invitedAt: nowIso(),
      createdAt: nowIso(),
    };
    run(
      `INSERT INTO teams (id, tournamentId, name, contactName, contactEmail, groupName, logoUrl, paid, checkedIn, inviteToken, invitedAt, createdAt)
       VALUES ($id,$tournamentId,$name,$contactName,$contactEmail,$groupName,$logoUrl,$paid,$checkedIn,$inviteToken,$invitedAt,$createdAt)`,
      t as any
    );
    return t;
  },
  byId(id: string): Team | undefined {
    return get<Team>(`SELECT * FROM teams WHERE id = $id`, { $id: id } as any);
  },
  byInviteToken(token: string): Team | undefined {
    return get<Team>(`SELECT * FROM teams WHERE inviteToken = $token`, { $token: token } as any);
  },
  listByTournament(tournamentId: string): Team[] {
    return all<Team>(`SELECT * FROM teams WHERE tournamentId = $tournamentId ORDER BY createdAt ASC`, { $tournamentId: tournamentId } as any);
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
