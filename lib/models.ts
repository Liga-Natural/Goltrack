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
  format: Format;
  status: TournamentStatus;
  location: string | null;
  startDate: string;
  endDate: string;
  feeCents: number;
  fieldsCount: number;
  groupsCount: number;
  advancePerGroup: number;
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
  paid: number; // 0/1
  checkedIn: number; // 0/1
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
      `INSERT INTO tournaments (id, slug, name, sport, format, status, location, startDate, endDate, feeCents, fieldsCount, groupsCount, advancePerGroup, ownerId, createdAt)
       VALUES ($id,$slug,$name,$sport,$format,$status,$location,$startDate,$endDate,$feeCents,$fieldsCount,$groupsCount,$advancePerGroup,$ownerId,$createdAt)`,
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
  updateStatus(id: string, status: TournamentStatus) {
    run(`UPDATE tournaments SET status = $status WHERE id = $id`, { $id: id, $status: status } as any);
  },
  slugExists(slug: string): boolean {
    return !!Tournaments.bySlug(slug);
  },
};

// ---------- Teams ----------

export const Teams = {
  create(input: Omit<Team, "id" | "createdAt" | "paid" | "checkedIn" | "groupName"> & { paid?: boolean; groupName?: string | null }): Team {
    const t: Team = {
      id: uid(),
      tournamentId: input.tournamentId,
      name: input.name,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      groupName: input.groupName ?? null,
      paid: input.paid ? 1 : 0,
      checkedIn: 0,
      createdAt: nowIso(),
    };
    run(
      `INSERT INTO teams (id, tournamentId, name, contactName, contactEmail, groupName, paid, checkedIn, createdAt)
       VALUES ($id,$tournamentId,$name,$contactName,$contactEmail,$groupName,$paid,$checkedIn,$createdAt)`,
      t as any
    );
    return t;
  },
  byId(id: string): Team | undefined {
    return get<Team>(`SELECT * FROM teams WHERE id = $id`, { $id: id } as any);
  },
  listByTournament(tournamentId: string): Team[] {
    return all<Team>(`SELECT * FROM teams WHERE tournamentId = $tournamentId ORDER BY createdAt ASC`, { $tournamentId: tournamentId } as any);
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
  create(input: Omit<Match, "id">): Match {
    const m: Match = { ...input, id: uid() };
    run(
      `INSERT INTO matches (id, tournamentId, stage, round, groupName, homeTeamId, awayTeamId, homeLabel, awayLabel, homeScore, awayScore, field, scheduledAt, status, refereeId, orderIndex)
       VALUES ($id,$tournamentId,$stage,$round,$groupName,$homeTeamId,$awayTeamId,$homeLabel,$awayLabel,$homeScore,$awayScore,$field,$scheduledAt,$status,$refereeId,$orderIndex)`,
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
