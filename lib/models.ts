import { randomBytes } from "node:crypto";
import { all, get, run, uid, nowIso } from "./db";
import {
  DEFAULT_PAYMENT_RULES,
  DEFAULT_PLATFORM_FEE,
} from "./pricing";
import type { PaymentRules, PlatformFeeConfig } from "./pricing";

// ---------- Types ----------

export type Format = "ROUND_ROBIN" | "GROUPS_KNOCKOUT" | "SINGLE_ELIM";
export type TournamentStatus = "DRAFT" | "REGISTRATION_OPEN" | "SCHEDULED" | "LIVE" | "COMPLETED";
export type Stage = "GROUP" | "KNOCKOUT";
export type MatchStatus = "SCHEDULED" | "LIVE" | "FINAL";
// ADMIN is the platform owner (super admin), ORGANIZER runs tournaments
// (director / staff admin), REFEREE works matchdays, TEAM_MANAGER runs one
// club, PLAYER holds a passport. The stored strings are unchanged for the
// four that already existed — renaming them would orphan every live account.
export type Role = "ADMIN" | "ORGANIZER" | "REFEREE" | "TEAM_MANAGER" | "PLAYER";

export const ALL_ROLES: Role[] = ["ADMIN", "ORGANIZER", "REFEREE", "TEAM_MANAGER", "PLAYER"];

export function isRole(value: string): value is Role {
  return (ALL_ROLES as string[]).includes(value);
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
  /** ACTIVE | INVITED | SUSPENDED — see lib/permissions.ts. */
  status: string;
  /** JSON array of Permission, or null meaning "this role's defaults". */
  permissions: string | null;
  organization: string | null;
  phone: string | null;
  lastSignInAt: string | null;
  invitedByUserId: string | null;
  createdAt: string;
}

/** Everything about a user except the password hash. */
export interface UserSummary {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: string;
  permissions: string | null;
  organization: string | null;
  phone: string | null;
  lastSignInAt: string | null;
  invitedByUserId: string | null;
  createdAt: string;
}

export interface UserInvite {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  organization: string | null;
  role: Role;
  permissions: string | null;
  token: string;
  invitedByUserId: string;
  invitedByName: string | null;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
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
  /** JSON array of division names, e.g. ["U10 Gold","U12 Premier"]. Null on
      tournaments created before divisions existed. */
  divisions: string | null;
  ownerId: string;
  /** OPEN | DELAY | SUSPENDED — what the public page tells spectators. */
  eventStatus: string;
  eventStatusNote: string | null;
  eventStatusAt: string | null;
  createdAt: string;
}

export type ApplicationStatus = "PENDING" | "ACCEPTED" | "WAITLISTED" | "DECLINED";
export type PaymentStatus = "UNPAID" | "DEPOSIT_PAID" | "INVOICE_REQUESTED" | "PAID";

export interface Application {
  id: string;
  tournamentId: string;
  teamName: string;
  clubName: string | null;
  division: string | null;
  managerName: string;
  managerEmail: string;
  managerPhone: string | null;
  rosterCount: number;
  notes: string | null;
  status: ApplicationStatus;
  paymentStatus: PaymentStatus;
  teamId: string | null;
  createdAt: string;
  decidedAt: string | null;
}

export interface ApplicationMessage {
  id: string;
  priority?: string;
  tournamentId: string;
  template: string | null;
  audience: string;
  subject: string;
  body: string;
  recipients: string;
  recipientCount: number;
  status: string;
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
  hasCrest: number | boolean; // computed from crestBlob IS NOT NULL — Postgres returns boolean, every caller only ever truthy-checks it
  logoToken: string | null; // no-login self-service crest upload link for the team's own manager/coach
  paid: number; // 0/1
  checkedIn: number; // 0/1
  inviteToken: string | null; // set while the slot is an unclaimed invite link, cleared on claim
  invitedAt: string | null;
  userId: string | null; // the team manager account, if the team registered with a password
  waiverReceivedAt: string | null; // organizer-recorded "paperwork is on file"; Jogo does not collect signatures
  createdAt: string;
}

export interface Player {
  id: string;
  /** Null until a coach adds a self-registered player to their squad. */
  teamId: string | null;
  userId: string | null; // the player/parent account, if the passport has been claimed
  name: string;
  jerseyNumber: string | null;
  birthdate: string | null;
  passportId: string;
  position: string | null;
  secondaryPosition: string | null;
  graduationYear: number | null;
  videoUrl: string | null;
  /** PUBLIC | SCOUTS | PRIVATE — enforced where the video renders. */
  videoPrivacy: string;
  gender: string | null;
  photoMimeType: string | null;
  photoUpdatedAt: string | null;
  /** PASSED | FAILED — what the browser's detector saw. A pre-screen only. */
  faceCheckStatus: string | null;
  /** Detector confidence, 0–100. */
  faceCheckScore: number | null;
  faceCheckAt: string | null;
  /** BIRTH_CERTIFICATE | PASSPORT | GOVERNMENT_ID */
  ageDocType: string | null;
  ageDocMimeType: string | null;
  ageDocUploadedAt: string | null;
  /** PENDING | VERIFIED | REJECTED — decided by a human, never by the upload. */
  ageStatus: string | null;
  ageVerifiedAt: string | null;
  ageVerifiedByName: string | null;
  ageReviewNote: string | null;
  /** The club the player asked to join, before a coach accepts them. */
  requestedTeamId: string | null;
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
  /** The account this official signs in with, once linked. */
  userId: string | null;
  certification: string | null;
  ratingPct: number | null;
}

export interface CheckIn {
  id: string;
  tournamentId: string;
  playerId: string;
  checkedInAt: string;
}

// ---------- Users ----------

export const Users = {
  // role is a required argument, never left to the column's SQL-level
  // default — a lesson learned the hard way elsewhere in this file (see
  // setAccentColor/setTheme below): that default is baked in at CREATE
  // TABLE time and doesn't move just because schema.sql's text changes, so
  // every call site names the role it actually wants.
  async create(
    email: string,
    passwordHash: string,
    name: string,
    role: Role,
    extra: { status?: string; permissions?: string | null; organization?: string | null; phone?: string | null; invitedByUserId?: string | null } = {}
  ): Promise<User> {
    const user: User = {
      id: uid(),
      email,
      passwordHash,
      name,
      role,
      status: extra.status ?? "ACTIVE",
      permissions: extra.permissions ?? null,
      organization: extra.organization ?? null,
      phone: extra.phone ?? null,
      lastSignInAt: null,
      invitedByUserId: extra.invitedByUserId ?? null,
      createdAt: nowIso(),
    };
    await run(
      `INSERT INTO users (id, email, passwordHash, name, role, status, permissions, organization, phone, invitedByUserId, createdAt)
       VALUES ($id,$email,$passwordHash,$name,$role,$status,$permissions,$organization,$phone,$invitedByUserId,$createdAt)`,
      user as any
    );
    return user;
  },
  async byEmail(email: string): Promise<User | undefined> {
    return get<User>(`SELECT * FROM users WHERE email = $email`, { $email: email } as any);
  },
  async byId(id: string): Promise<User | undefined> {
    return get<User>(`SELECT * FROM users WHERE id = $id`, { $id: id } as any);
  },
  // Aggregate counts only — /admin's overview stat tiles have no reason to
  // pull every user row (passwordHash included) across the platform just
  // to count them.
  async countsByRole(): Promise<Record<Role, number>> {
    const rows = await all<{ role: Role; n: number }>(`SELECT role, COUNT(*) AS n FROM users GROUP BY role`);
    const counts: Record<Role, number> = { ADMIN: 0, ORGANIZER: 0, REFEREE: 0, TEAM_MANAGER: 0, PLAYER: 0 };
    for (const row of rows) counts[row.role] = Number(row.n);
    return counts;
  },
  // Explicit columns, never SELECT *: this feeds the admin user table, and a
  // wildcard would pull every account's password hash across the process
  // boundary to render a list of names.
  async listAll(): Promise<UserSummary[]> {
    return all<UserSummary>(
      `SELECT id, email, name, role, status, permissions, organization, phone, lastSignInAt, invitedByUserId, createdAt
         FROM users ORDER BY createdAt DESC`
    );
  },
  async setRoleAndPermissions(
    id: string,
    role: Role,
    permissions: string | null,
    organization: string | null
  ): Promise<void> {
    await run(
      `UPDATE users SET role = $role, permissions = $permissions, organization = $organization WHERE id = $id`,
      { $id: id, $role: role, $permissions: permissions, $organization: organization } as any
    );
  },
  async setStatus(id: string, status: string): Promise<void> {
    await run(`UPDATE users SET status = $status WHERE id = $id`, { $id: id, $status: status } as any);
  },
  async touchSignIn(id: string): Promise<void> {
    await run(`UPDATE users SET lastSignInAt = $at WHERE id = $id`, { $id: id, $at: nowIso() } as any);
  },
  async countActiveAdmins(excludeId?: string): Promise<number> {
    const row = await get<{ n: number }>(
      // The ::text casts are load-bearing: Postgres cannot infer a bare
      // parameter's type inside IS NULL, and without them this throws
      // "could not determine data type of parameter $1" — which surfaced to
      // the admin as a database error where a plain refusal belonged.
      `SELECT COUNT(*) AS n FROM users WHERE role = 'ADMIN' AND status = 'ACTIVE' AND ($exclude::text IS NULL OR id <> $exclude::text)`,
      { $exclude: excludeId ?? null } as any
    );
    return Number(row?.n ?? 0);
  },
};

// ---------- Match events, metrics, lineups, officials ----------

export type MatchEventType = "GOAL" | "ASSIST" | "YELLOW" | "RED";

export interface MatchEvent {
  id: string;
  matchId: string;
  tournamentId: string;
  teamId: string | null;
  playerId: string | null;
  type: MatchEventType;
  minute: number | null;
  note: string | null;
  clearedAt: string | null;
  recordedByName: string | null;
  createdAt: string;
}

const EVENT_COLUMNS = `id, matchId, tournamentId, teamId, playerId, type, minute, note, clearedAt, recordedByName, createdAt`;

export const MatchEvents = {
  async create(input: Omit<MatchEvent, "id" | "createdAt" | "clearedAt">): Promise<MatchEvent> {
    const row: MatchEvent = { id: uid(), clearedAt: null, createdAt: nowIso(), ...input };
    await run(
      `INSERT INTO match_events (${EVENT_COLUMNS})
       VALUES ($id,$matchId,$tournamentId,$teamId,$playerId,$type,$minute,$note,NULL,$recordedByName,$createdAt)`,
      row as any
    );
    return row;
  },
  async byId(id: string): Promise<MatchEvent | undefined> {
    return get<MatchEvent>(`SELECT ${EVENT_COLUMNS} FROM match_events WHERE id = $id`, { $id: id } as any);
  },
  async listByMatch(matchId: string): Promise<MatchEvent[]> {
    return all<MatchEvent>(
      `SELECT ${EVENT_COLUMNS} FROM match_events WHERE matchId = $matchId ORDER BY minute NULLS LAST, createdAt ASC`,
      { $matchId: matchId } as any
    );
  },
  async listByTournament(tournamentId: string): Promise<MatchEvent[]> {
    return all<MatchEvent>(
      `SELECT ${EVENT_COLUMNS} FROM match_events WHERE tournamentId = $tournamentId ORDER BY createdAt ASC`,
      { $tournamentId: tournamentId } as any
    );
  },
  async listByPlayer(playerId: string): Promise<MatchEvent[]> {
    return all<MatchEvent>(
      `SELECT ${EVENT_COLUMNS} FROM match_events WHERE playerId = $playerId ORDER BY createdAt ASC`,
      { $playerId: playerId } as any
    );
  },
  /** Every event for a squad, so a coach sees the whole team's discipline. */
  async listByTeam(teamId: string): Promise<MatchEvent[]> {
    return all<MatchEvent>(
      `SELECT ${EVENT_COLUMNS} FROM match_events WHERE teamId = $teamId ORDER BY createdAt ASC`,
      { $teamId: teamId } as any
    );
  },
  async remove(id: string): Promise<void> {
    await run(`DELETE FROM match_events WHERE id = $id`, { $id: id } as any);
  },
  async setCleared(id: string, cleared: boolean): Promise<void> {
    await run(`UPDATE match_events SET clearedAt = $at WHERE id = $id`, {
      $id: id,
      $at: cleared ? nowIso() : null,
    } as any);
  },
};

export interface PlayerMetric {
  id: string;
  playerId: string;
  sprint40Hundredths: number | null;
  verticalJumpHundredths: number | null;
  topSpeedHundredths: number | null;
  distanceHundredths: number | null;
  yoyoHundredths: number | null;
  recordedByName: string | null;
  recordedAt: string;
}

const METRIC_COLUMNS = `id, playerId, sprint40Hundredths, verticalJumpHundredths, topSpeedHundredths, distanceHundredths, yoyoHundredths, recordedByName, recordedAt`;

export const PlayerMetrics = {
  async create(input: Omit<PlayerMetric, "id" | "recordedAt">): Promise<PlayerMetric> {
    const row: PlayerMetric = { id: uid(), recordedAt: nowIso(), ...input };
    await run(
      `INSERT INTO player_metrics (${METRIC_COLUMNS})
       VALUES ($id,$playerId,$sprint40Hundredths,$verticalJumpHundredths,$topSpeedHundredths,$distanceHundredths,$yoyoHundredths,$recordedByName,$recordedAt)`,
      row as any
    );
    return row;
  },
  async listByPlayer(playerId: string): Promise<PlayerMetric[]> {
    return all<PlayerMetric>(
      `SELECT ${METRIC_COLUMNS} FROM player_metrics WHERE playerId = $playerId ORDER BY recordedAt DESC`,
      { $playerId: playerId } as any
    );
  },
  /** The comparison cohort: everyone measured on the same team. */
  async listByTeam(teamId: string): Promise<PlayerMetric[]> {
    return all<PlayerMetric>(
      `SELECT m.id, m.playerId, m.sprint40Hundredths, m.verticalJumpHundredths, m.topSpeedHundredths, m.distanceHundredths, m.yoyoHundredths, m.recordedByName, m.recordedAt
         FROM player_metrics m JOIN players p ON p.id = m.playerId
        WHERE p.teamId = $teamId ORDER BY m.recordedAt ASC`,
      { $teamId: teamId } as any
    );
  },
};

export type AvailabilityStatus = "ATTENDING" | "INJURED" | "ABSENT" | "NO_REPLY";

export interface PlayerAvailability {
  id: string;
  matchId: string;
  playerId: string;
  status: AvailabilityStatus;
  note: string | null;
  respondedAt: string | null;
}

export const Availability = {
  async set(matchId: string, playerId: string, status: AvailabilityStatus, note?: string | null): Promise<void> {
    await run(
      `INSERT INTO player_availability (id, matchId, playerId, status, note, respondedAt)
       VALUES ($id,$matchId,$playerId,$status,$note,$respondedAt)
       ON CONFLICT(matchId, playerId) DO UPDATE SET status = excluded.status, note = excluded.note, respondedAt = excluded.respondedAt`,
      {
        $id: uid(),
        $matchId: matchId,
        $playerId: playerId,
        $status: status,
        $note: note ?? null,
        $respondedAt: nowIso(),
      } as any
    );
  },
  async listByMatch(matchId: string): Promise<PlayerAvailability[]> {
    return all<PlayerAvailability>(
      `SELECT id, matchId, playerId, status, note, respondedAt FROM player_availability WHERE matchId = $matchId`,
      { $matchId: matchId } as any
    );
  },
};

export interface Lineup {
  id: string;
  matchId: string;
  teamId: string;
  formation: string;
  slots: string;
  arrows: string | null;
  notes: string | null;
  updatedAt: string;
}

export const Lineups = {
  async save(
    matchId: string,
    teamId: string,
    formation: string,
    slots: string,
    arrows: string | null,
    notes: string | null
  ): Promise<void> {
    await run(
      `INSERT INTO lineups (id, matchId, teamId, formation, slots, arrows, notes, updatedAt)
       VALUES ($id,$matchId,$teamId,$formation,$slots,$arrows,$notes,$updatedAt)
       ON CONFLICT(matchId, teamId) DO UPDATE SET formation = excluded.formation, slots = excluded.slots,
         arrows = excluded.arrows, notes = excluded.notes, updatedAt = excluded.updatedAt`,
      {
        $id: uid(),
        $matchId: matchId,
        $teamId: teamId,
        $formation: formation,
        $slots: slots,
        $arrows: arrows,
        $notes: notes,
        $updatedAt: nowIso(),
      } as any
    );
  },
  async byMatchTeam(matchId: string, teamId: string): Promise<Lineup | undefined> {
    return get<Lineup>(
      `SELECT id, matchId, teamId, formation, slots, arrows, notes, updatedAt FROM lineups WHERE matchId = $matchId AND teamId = $teamId`,
      { $matchId: matchId, $teamId: teamId } as any
    );
  },
};

export interface MatchReport {
  id: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  notes: string | null;
  refereeName: string | null;
  refereeSignature: string | null;
  marshalName: string | null;
  marshalSignature: string | null;
  submittedAt: string;
}

const REPORT_COLUMNS = `id, matchId, homeScore, awayScore, notes, refereeName, refereeSignature, marshalName, marshalSignature, submittedAt`;

export const MatchReports = {
  async save(input: Omit<MatchReport, "id" | "submittedAt">): Promise<MatchReport> {
    const row: MatchReport = { id: uid(), submittedAt: nowIso(), ...input };
    await run(
      `INSERT INTO match_reports (${REPORT_COLUMNS})
       VALUES ($id,$matchId,$homeScore,$awayScore,$notes,$refereeName,$refereeSignature,$marshalName,$marshalSignature,$submittedAt)
       ON CONFLICT(matchId) DO UPDATE SET homeScore = excluded.homeScore, awayScore = excluded.awayScore,
         notes = excluded.notes, refereeName = excluded.refereeName, refereeSignature = excluded.refereeSignature,
         marshalName = excluded.marshalName, marshalSignature = excluded.marshalSignature,
         submittedAt = excluded.submittedAt`,
      row as any
    );
    return row;
  },
  async byMatch(matchId: string): Promise<MatchReport | undefined> {
    return get<MatchReport>(`SELECT ${REPORT_COLUMNS} FROM match_reports WHERE matchId = $matchId`, {
      $matchId: matchId,
    } as any);
  },
  // Signatures are large data URLs, so the "has it been signed" check that
  // list views need never drags the images along with it.
  async submittedMatchIds(tournamentId: string): Promise<Set<string>> {
    const rows = await all<{ matchId: string }>(
      `SELECT r.matchId FROM match_reports r JOIN matches m ON m.id = r.matchId WHERE m.tournamentId = $tournamentId`,
      { $tournamentId: tournamentId } as any
    );
    return new Set(rows.map((r) => r.matchId));
  },
};

export interface RefereeFee {
  id: string;
  matchId: string;
  refereeId: string;
  role: string;
  feeCents: number;
  paidAt: string | null;
  recordedAt: string;
}

export const RefereeFees = {
  async set(matchId: string, refereeId: string, role: string, feeCents: number): Promise<void> {
    await run(`DELETE FROM referee_fees WHERE matchId = $matchId AND refereeId = $refereeId`, {
      $matchId: matchId,
      $refereeId: refereeId,
    } as any);
    await run(
      `INSERT INTO referee_fees (id, matchId, refereeId, role, feeCents, paidAt, recordedAt)
       VALUES ($id,$matchId,$refereeId,$role,$feeCents,NULL,$recordedAt)`,
      {
        $id: uid(),
        $matchId: matchId,
        $refereeId: refereeId,
        $role: role,
        $feeCents: feeCents,
        $recordedAt: nowIso(),
      } as any
    );
  },
  async listByReferee(refereeId: string): Promise<RefereeFee[]> {
    return all<RefereeFee>(
      `SELECT id, matchId, refereeId, role, feeCents, paidAt, recordedAt FROM referee_fees WHERE refereeId = $refereeId ORDER BY recordedAt DESC`,
      { $refereeId: refereeId } as any
    );
  },
  async setPaid(id: string, paid: boolean): Promise<void> {
    await run(`UPDATE referee_fees SET paidAt = $at WHERE id = $id`, { $id: id, $at: paid ? nowIso() : null } as any);
  },
};

// ---------- Payment configuration ----------

const PAYMENT_SETTINGS_COLUMNS = `tournamentId, depositMode, depositBasis, depositCents, depositPercent, balanceDueDays, earlyBirdUntil, earlyBirdDiscountCents, lateFeeAfter, lateFeeCents, multiTeamMinTeams, multiTeamPercent, acceptCheck, acceptCash, acceptZelle, acceptWire, offlineInstructions, manualApproval, reminderDaysBefore, reminderOnDueDate, reminderDaysAfter`;

// Postgres hands integer flags back as numbers; PaymentRules wants booleans.
// Converting at the boundary means nothing downstream has to remember that
// `acceptCheck` is sometimes 0 and sometimes false.
function toRules(row: Record<string, any>): PaymentRules {
  const bool = (v: unknown) => v === 1 || v === true || v === "1";
  return {
    depositMode: row.depositMode === "DEPOSIT" ? "DEPOSIT" : "FULL",
    depositBasis: row.depositBasis === "PERCENT" ? "PERCENT" : "FLAT",
    depositCents: Number(row.depositCents ?? 0),
    depositPercent: Number(row.depositPercent ?? 50),
    balanceDueDays: Number(row.balanceDueDays ?? 30),
    earlyBirdUntil: row.earlyBirdUntil ?? null,
    earlyBirdDiscountCents: Number(row.earlyBirdDiscountCents ?? 0),
    lateFeeAfter: row.lateFeeAfter ?? null,
    lateFeeCents: Number(row.lateFeeCents ?? 0),
    multiTeamMinTeams: Number(row.multiTeamMinTeams ?? 0),
    multiTeamPercent: Number(row.multiTeamPercent ?? 0),
    acceptCheck: bool(row.acceptCheck),
    acceptCash: bool(row.acceptCash),
    acceptZelle: bool(row.acceptZelle),
    acceptWire: bool(row.acceptWire),
    offlineInstructions: row.offlineInstructions ?? null,
    manualApproval: bool(row.manualApproval),
    reminderDaysBefore: Number(row.reminderDaysBefore ?? 7),
    reminderOnDueDate: bool(row.reminderOnDueDate),
    reminderDaysAfter: Number(row.reminderDaysAfter ?? 3),
  };
}

export const PaymentSettings = {
  /** An absent row means the documented defaults, never a half-filled object. */
  async forTournament(tournamentId: string): Promise<PaymentRules> {
    const row = await get<Record<string, any>>(
      `SELECT ${PAYMENT_SETTINGS_COLUMNS} FROM tournament_payment_settings WHERE tournamentId = $id`,
      { $id: tournamentId } as any
    );
    return row ? toRules(row) : { ...DEFAULT_PAYMENT_RULES };
  },
  async save(tournamentId: string, rules: PaymentRules): Promise<void> {
    await run(
      `INSERT INTO tournament_payment_settings (${PAYMENT_SETTINGS_COLUMNS}, updatedAt)
       VALUES ($tournamentId,$depositMode,$depositBasis,$depositCents,$depositPercent,$balanceDueDays,$earlyBirdUntil,$earlyBirdDiscountCents,$lateFeeAfter,$lateFeeCents,$multiTeamMinTeams,$multiTeamPercent,$acceptCheck,$acceptCash,$acceptZelle,$acceptWire,$offlineInstructions,$manualApproval,$reminderDaysBefore,$reminderOnDueDate,$reminderDaysAfter,$updatedAt)
       ON CONFLICT(tournamentId) DO UPDATE SET
         depositMode=excluded.depositMode, depositBasis=excluded.depositBasis, depositCents=excluded.depositCents,
         depositPercent=excluded.depositPercent, balanceDueDays=excluded.balanceDueDays,
         earlyBirdUntil=excluded.earlyBirdUntil, earlyBirdDiscountCents=excluded.earlyBirdDiscountCents,
         lateFeeAfter=excluded.lateFeeAfter, lateFeeCents=excluded.lateFeeCents,
         multiTeamMinTeams=excluded.multiTeamMinTeams, multiTeamPercent=excluded.multiTeamPercent,
         acceptCheck=excluded.acceptCheck, acceptCash=excluded.acceptCash, acceptZelle=excluded.acceptZelle,
         acceptWire=excluded.acceptWire, offlineInstructions=excluded.offlineInstructions,
         manualApproval=excluded.manualApproval, reminderDaysBefore=excluded.reminderDaysBefore,
         reminderOnDueDate=excluded.reminderOnDueDate, reminderDaysAfter=excluded.reminderDaysAfter,
         updatedAt=excluded.updatedAt`,
      {
        $tournamentId: tournamentId,
        $depositMode: rules.depositMode,
        $depositBasis: rules.depositBasis,
        $depositCents: rules.depositCents,
        $depositPercent: rules.depositPercent,
        $balanceDueDays: rules.balanceDueDays,
        $earlyBirdUntil: rules.earlyBirdUntil,
        $earlyBirdDiscountCents: rules.earlyBirdDiscountCents,
        $lateFeeAfter: rules.lateFeeAfter,
        $lateFeeCents: rules.lateFeeCents,
        $multiTeamMinTeams: rules.multiTeamMinTeams,
        $multiTeamPercent: rules.multiTeamPercent,
        $acceptCheck: rules.acceptCheck ? 1 : 0,
        $acceptCash: rules.acceptCash ? 1 : 0,
        $acceptZelle: rules.acceptZelle ? 1 : 0,
        $acceptWire: rules.acceptWire ? 1 : 0,
        $offlineInstructions: rules.offlineInstructions,
        $manualApproval: rules.manualApproval ? 1 : 0,
        $reminderDaysBefore: rules.reminderDaysBefore,
        $reminderOnDueDate: rules.reminderOnDueDate ? 1 : 0,
        $reminderDaysAfter: rules.reminderDaysAfter,
        $updatedAt: nowIso(),
      } as any
    );
  },
};

const PLATFORM_FEE_ID = "singleton";

export const PlatformFees = {
  async get(): Promise<PlatformFeeConfig> {
    try {
      const row = await get<Record<string, any>>(
        `SELECT mode, percentBps, flatCents, tierName, tierMonthlyCents, passThrough FROM platform_fee_settings WHERE id = $id`,
        { $id: PLATFORM_FEE_ID } as any
      );
      if (!row) return { ...DEFAULT_PLATFORM_FEE };
      return {
        mode: row.mode === "FLAT" || row.mode === "TIERED" ? row.mode : "PERCENT",
        percentBps: Number(row.percentBps ?? 250),
        flatCents: Number(row.flatCents ?? 99),
        tierName: row.tierName || "Starter",
        tierMonthlyCents: Number(row.tierMonthlyCents ?? 0),
        passThrough: row.passThrough === 1 || row.passThrough === true,
      };
    } catch {
      // Read from the public checkout on every registration; a hiccup here
      // must not take down the page over a fee line.
      return { ...DEFAULT_PLATFORM_FEE };
    }
  },
  async save(config: PlatformFeeConfig): Promise<void> {
    await run(
      `INSERT INTO platform_fee_settings (id, mode, percentBps, flatCents, tierName, tierMonthlyCents, passThrough, updatedAt)
       VALUES ($id,$mode,$percentBps,$flatCents,$tierName,$tierMonthlyCents,$passThrough,$updatedAt)
       ON CONFLICT(id) DO UPDATE SET mode=excluded.mode, percentBps=excluded.percentBps, flatCents=excluded.flatCents,
         tierName=excluded.tierName, tierMonthlyCents=excluded.tierMonthlyCents, passThrough=excluded.passThrough,
         updatedAt=excluded.updatedAt`,
      {
        $id: PLATFORM_FEE_ID,
        $mode: config.mode,
        $percentBps: config.percentBps,
        $flatCents: config.flatCents,
        $tierName: config.tierName,
        $tierMonthlyCents: config.tierMonthlyCents,
        $passThrough: config.passThrough ? 1 : 0,
        $updatedAt: nowIso(),
      } as any
    );
  },
};

export interface PlatformPayout {
  id: string;
  tournamentId: string;
  amountCents: number;
  reference: string | null;
  note: string | null;
  recordedByName: string | null;
  recordedAt: string;
}

export const PlatformPayouts = {
  async create(input: Omit<PlatformPayout, "id" | "recordedAt">): Promise<PlatformPayout> {
    const payout: PlatformPayout = { id: uid(), recordedAt: nowIso(), ...input };
    await run(
      `INSERT INTO platform_payouts (id, tournamentId, amountCents, reference, note, recordedByName, recordedAt)
       VALUES ($id,$tournamentId,$amountCents,$reference,$note,$recordedByName,$recordedAt)`,
      payout as any
    );
    return payout;
  },
  async totalsByTournament(): Promise<Map<string, number>> {
    const rows = await all<{ tournamentId: string; payoutCents: number }>(
      `SELECT tournamentId, COALESCE(SUM(amountCents),0) AS payoutCents FROM platform_payouts GROUP BY tournamentId`
    );
    return new Map(rows.map((r) => [r.tournamentId, Number(r.payoutCents)]));
  },
  async listAll(limit = 200): Promise<PlatformPayout[]> {
    return all<PlatformPayout>(
      `SELECT id, tournamentId, amountCents, reference, note, recordedByName, recordedAt
         FROM platform_payouts ORDER BY recordedAt DESC LIMIT $limit`,
      { $limit: limit } as any
    );
  },
};

/**
 * Money actually recorded against invoices, per tournament — payments in,
 * less refunds. This is collected cash, not billed amounts: an invoice nobody
 * has paid contributes nothing, which is what makes it usable as gross volume.
 */
export async function collectedByTournament(): Promise<Map<string, number>> {
  const rows = await all<{ tournamentId: string; amountCents: number }>(
    `SELECT i.tournamentId AS tournamentId, COALESCE(SUM(p.amountCents),0) AS amountCents
       FROM invoices i JOIN invoice_payments p ON p.invoiceId = i.id
      GROUP BY i.tournamentId`
  );
  return new Map(rows.map((r) => [r.tournamentId, Number(r.amountCents)]));
}

// ---------- Staff invitations ----------

const INVITE_COLUMNS = `id, email, name, phone, organization, role, permissions, token, invitedByUserId, invitedByName, createdAt, expiresAt, acceptedAt, revokedAt`;

export const UserInvites = {
  async create(input: {
    email: string;
    name: string;
    phone?: string | null;
    organization?: string | null;
    role: Role;
    permissions: string | null;
    invitedByUserId: string;
    invitedByName: string | null;
    ttlDays?: number;
  }): Promise<UserInvite> {
    // A longer token than generateToken()'s 10 chars. That one guards a crest
    // upload; this one can mint an account with a role attached, so it gets
    // ~190 bits instead of ~59 — the cost is a longer URL and nothing else.
    const mint = () => {
      const bytes = randomBytes(32);
      let out = "";
      for (const byte of bytes) out += BASE62[byte % BASE62.length];
      return out;
    };
    let token = mint();
    while (await UserInvites.byToken(token)) token = mint();
    const now = new Date();
    const expires = new Date(now);
    expires.setDate(expires.getDate() + (input.ttlDays ?? 14));
    const invite: UserInvite = {
      id: uid(),
      email: input.email,
      name: input.name,
      phone: input.phone ?? null,
      organization: input.organization ?? null,
      role: input.role,
      permissions: input.permissions,
      token,
      invitedByUserId: input.invitedByUserId,
      invitedByName: input.invitedByName,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      acceptedAt: null,
      revokedAt: null,
    };
    await run(
      `INSERT INTO user_invites (${INVITE_COLUMNS})
       VALUES ($id,$email,$name,$phone,$organization,$role,$permissions,$token,$invitedByUserId,$invitedByName,$createdAt,$expiresAt,NULL,NULL)`,
      invite as any
    );
    return invite;
  },
  async byToken(token: string): Promise<UserInvite | undefined> {
    return get<UserInvite>(`SELECT ${INVITE_COLUMNS} FROM user_invites WHERE token = $token`, { $token: token } as any);
  },
  async byId(id: string): Promise<UserInvite | undefined> {
    return get<UserInvite>(`SELECT ${INVITE_COLUMNS} FROM user_invites WHERE id = $id`, { $id: id } as any);
  },
  /** Still claimable: not accepted, not revoked, not expired. */
  async listPending(): Promise<UserInvite[]> {
    return all<UserInvite>(
      `SELECT ${INVITE_COLUMNS} FROM user_invites
        WHERE acceptedAt IS NULL AND revokedAt IS NULL AND expiresAt > $now
        ORDER BY createdAt DESC`,
      { $now: nowIso() } as any
    );
  },
  async listAll(limit = 200): Promise<UserInvite[]> {
    return all<UserInvite>(`SELECT ${INVITE_COLUMNS} FROM user_invites ORDER BY createdAt DESC LIMIT $limit`, {
      $limit: limit,
    } as any);
  },
  async markAccepted(id: string): Promise<void> {
    await run(`UPDATE user_invites SET acceptedAt = $at WHERE id = $id`, { $id: id, $at: nowIso() } as any);
  },
  async revoke(id: string): Promise<void> {
    await run(`UPDATE user_invites SET revokedAt = $at WHERE id = $id`, { $id: id, $at: nowIso() } as any);
  },
};

// ---------- Tournament staff assignment ----------

export const TournamentStaff = {
  async assign(tournamentId: string, userId: string): Promise<void> {
    await run(
      `INSERT INTO tournament_staff (id, tournamentId, userId, createdAt)
       VALUES ($id,$tournamentId,$userId,$createdAt)
       ON CONFLICT (tournamentId, userId) DO NOTHING`,
      { $id: uid(), $tournamentId: tournamentId, $userId: userId, $createdAt: nowIso() } as any
    );
  },
  async unassign(tournamentId: string, userId: string): Promise<void> {
    await run(`DELETE FROM tournament_staff WHERE tournamentId = $tournamentId AND userId = $userId`, {
      $tournamentId: tournamentId,
      $userId: userId,
    } as any);
  },
  async isAssigned(tournamentId: string, userId: string): Promise<boolean> {
    const row = await get<{ id: string }>(
      `SELECT id FROM tournament_staff WHERE tournamentId = $tournamentId AND userId = $userId`,
      { $tournamentId: tournamentId, $userId: userId } as any
    );
    return Boolean(row);
  },
  async listTournamentIdsForUser(userId: string): Promise<string[]> {
    const rows = await all<{ tournamentId: string }>(
      `SELECT tournamentId FROM tournament_staff WHERE userId = $userId`,
      { $userId: userId } as any
    );
    return rows.map((r) => r.tournamentId);
  },
  async countsByUser(): Promise<Map<string, number>> {
    const rows = await all<{ userId: string; n: number }>(
      `SELECT userId, COUNT(*) AS n FROM tournament_staff GROUP BY userId`
    );
    return new Map(rows.map((r) => [r.userId, Number(r.n)]));
  },
  /** Moves every assignment from one staff member to another — a handover. */
  async transferAll(fromUserId: string, toUserId: string): Promise<number> {
    const ids = await TournamentStaff.listTournamentIdsForUser(fromUserId);
    for (const tournamentId of ids) await TournamentStaff.assign(tournamentId, toUserId);
    await run(`DELETE FROM tournament_staff WHERE userId = $userId`, { $userId: fromUserId } as any);
    return ids.length;
  },
};

// ---------- Tournaments ----------

export const Tournaments = {
  async create(
    input: Omit<Tournament, "id" | "createdAt" | "eventStatus" | "eventStatusNote" | "eventStatusAt">
  ): Promise<Tournament> {
    // Live status is not something a creation form asks about — a new event
    // opens with its fields open, and the organizer flips it on the day.
    const t: Tournament = {
      ...input,
      eventStatus: "OPEN",
      eventStatusNote: null,
      eventStatusAt: null,
      id: uid(),
      createdAt: nowIso(),
    };
    await run(
      `INSERT INTO tournaments (id, slug, name, sport, teamFormat, format, status, location, startDate, endDate, feeCents, fieldsCount, groupsCount, advancePerGroup, supervisorName, supervisorEmail, supervisorPhone, divisions, ownerId, createdAt)
       VALUES ($id,$slug,$name,$sport,$teamFormat,$format,$status,$location,$startDate,$endDate,$feeCents,$fieldsCount,$groupsCount,$advancePerGroup,$supervisorName,$supervisorEmail,$supervisorPhone,$divisions,$ownerId,$createdAt)`,
      t as any
    );
    return t;
  },
  async bySlug(slug: string): Promise<Tournament | undefined> {
    return get<Tournament>(`SELECT * FROM tournaments WHERE slug = $slug`, { $slug: slug } as any);
  },
  async byId(id: string): Promise<Tournament | undefined> {
    return get<Tournament>(`SELECT * FROM tournaments WHERE id = $id`, { $id: id } as any);
  },
  async listByOwner(ownerId: string): Promise<Tournament[]> {
    return all<Tournament>(`SELECT * FROM tournaments WHERE ownerId = $ownerId ORDER BY createdAt DESC`, { $ownerId: ownerId } as any);
  },
  // Platform-wide, cross-owner — only /admin calls this. Every other
  // tournament list in the app is scoped to the current user's own
  // tournaments via listByOwner above.
  async listAll(): Promise<Tournament[]> {
    return all<Tournament>(`SELECT * FROM tournaments ORDER BY createdAt DESC`);
  },
  async listPublic(): Promise<Tournament[]> {
    return all<Tournament>(
      `SELECT * FROM tournaments WHERE status != 'DRAFT' ORDER BY startDate DESC`
    );
  },
  async updateStatus(id: string, status: TournamentStatus): Promise<void> {
    await run(`UPDATE tournaments SET status = $status WHERE id = $id`, { $id: id, $status: status } as any);
  },
  async setEventStatus(id: string, status: string, note: string | null): Promise<void> {
    await run(
      `UPDATE tournaments SET eventStatus = $status, eventStatusNote = $note, eventStatusAt = $at WHERE id = $id`,
      { $id: id, $status: status, $note: note, $at: nowIso() } as any
    );
  },
  async slugExists(slug: string): Promise<boolean> {
    return !!(await Tournaments.bySlug(slug));
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
const TEAM_COLUMNS = `id, tournamentId, name, contactName, contactEmail, groupName, logoUrl, crestMimeType, crestUpdatedAt, (crestBlob IS NOT NULL) AS hasCrest, logoToken, paid, checkedIn, inviteToken, invitedAt, userId, waiverReceivedAt, createdAt`;

export const Teams = {
  async create(
    input: Omit<
      Team,
      "id" | "createdAt" | "paid" | "checkedIn" | "groupName" | "logoUrl" | "crestMimeType" | "crestUpdatedAt" | "hasCrest" | "logoToken" | "inviteToken" | "invitedAt" | "userId" | "waiverReceivedAt"
    > & {
      paid?: boolean;
      groupName?: string | null;
      logoUrl?: string | null;
      userId?: string | null;
    }
  ): Promise<Team> {
    let logoToken = generateToken();
    while (await Teams.byLogoToken(logoToken)) logoToken = generateToken(); // defeat the astronomically unlikely collision
    const id = uid();
    const createdAt = nowIso();
    await run(
      `INSERT INTO teams (id, tournamentId, name, contactName, contactEmail, groupName, logoUrl, logoToken, paid, checkedIn, inviteToken, invitedAt, userId, createdAt)
       VALUES ($id,$tournamentId,$name,$contactName,$contactEmail,$groupName,$logoUrl,$logoToken,$paid,$checkedIn,NULL,NULL,$userId,$createdAt)`,
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
        $userId: input.userId ?? null,
        $createdAt: createdAt,
      } as any
    );
    return (await Teams.byId(id))!;
  },
  // Creates an empty placeholder slot with a unique claim link — the
  // gotsport-style flow where an organizer invites a specific team before
  // that team has entered any of its own details. Also gets its own
  // logoToken up front, so the crest self-service link is ready the moment
  // the invite is claimed (no separate backfill step needed for new teams).
  async createInvite(tournamentId: string): Promise<Team> {
    let inviteToken = generateToken();
    while (await Teams.byInviteToken(inviteToken)) inviteToken = generateToken();
    let logoToken = generateToken();
    while (await Teams.byLogoToken(logoToken)) logoToken = generateToken();
    const id = uid();
    const now = nowIso();
    await run(
      `INSERT INTO teams (id, tournamentId, name, contactName, contactEmail, groupName, logoUrl, logoToken, paid, checkedIn, inviteToken, invitedAt, createdAt)
       VALUES ($id,$tournamentId,'','','',NULL,NULL,$logoToken,0,0,$inviteToken,$invitedAt,$createdAt)`,
      { $id: id, $tournamentId: tournamentId, $logoToken: logoToken, $inviteToken: inviteToken, $invitedAt: now, $createdAt: now } as any
    );
    return (await Teams.byId(id))!;
  },
  async byId(id: string): Promise<Team | undefined> {
    return get<Team>(`SELECT ${TEAM_COLUMNS} FROM teams WHERE id = $id`, { $id: id } as any);
  },
  async byInviteToken(token: string): Promise<Team | undefined> {
    return get<Team>(`SELECT ${TEAM_COLUMNS} FROM teams WHERE inviteToken = $token`, { $token: token } as any);
  },
  // Looks up a team by its no-login crest-upload token. Unlike inviteToken,
  // this is never cleared after use — a coach can come back and replace the
  // crest later — so this alone can't tell you whether it's "already used".
  async byLogoToken(token: string): Promise<Team | undefined> {
    return get<Team>(`SELECT ${TEAM_COLUMNS} FROM teams WHERE logoToken = $token`, { $token: token } as any);
  },
  /** Every club on the platform, for the player registration club picker. */
  async listAll(limit = 500): Promise<Team[]> {
    return all<Team>(`SELECT ${TEAM_COLUMNS} FROM teams WHERE name <> '' ORDER BY name ASC LIMIT $limit`, {
      $limit: limit,
    } as any);
  },
  async listByTournament(tournamentId: string): Promise<Team[]> {
    return all<Team>(`SELECT ${TEAM_COLUMNS} FROM teams WHERE tournamentId = $tournamentId ORDER BY createdAt ASC`, { $tournamentId: tournamentId } as any);
  },
  // Fills in an invited slot's details and clears the token so the link
  // can't be claimed a second time.
  async claimInvite(id: string, input: { name: string; contactName: string; contactEmail: string; logoUrl?: string | null; userId?: string | null }): Promise<Team | undefined> {
    await run(
      `UPDATE teams SET name=$name, contactName=$contactName, contactEmail=$contactEmail, logoUrl=$logoUrl, userId=$userId, inviteToken=NULL WHERE id=$id`,
      {
        $id: id,
        $name: input.name,
        $contactName: input.contactName,
        $contactEmail: input.contactEmail,
        $logoUrl: input.logoUrl ?? null,
        $userId: input.userId ?? null,
      } as any
    );
    return Teams.byId(id);
  },
  async byUserId(userId: string): Promise<Team | undefined> {
    return get<Team>(`SELECT ${TEAM_COLUMNS} FROM teams WHERE userId = $userId`, { $userId: userId } as any);
  },
  async setGroup(id: string, groupName: string | null): Promise<void> {
    await run(`UPDATE teams SET groupName = $groupName WHERE id = $id`, { $id: id, $groupName: groupName } as any);
  },
  async setPaid(id: string, paid: boolean): Promise<void> {
    await run(`UPDATE teams SET paid = $paid WHERE id = $id`, { $id: id, $paid: paid ? 1 : 0 } as any);
  },
  async setCheckedIn(id: string, checkedIn: boolean): Promise<void> {
    await run(`UPDATE teams SET checkedIn = $checkedIn WHERE id = $id`, { $id: id, $checkedIn: checkedIn ? 1 : 0 } as any);
  },
  // Stores the moment the organizer confirmed the club's paperwork, not a
  // boolean: "received on 3 Feb" is what makes the record worth anything if
  // it is ever questioned. Clearing sets it back to NULL.
  async setWaiverReceived(id: string, received: boolean): Promise<void> {
    await run(`UPDATE teams SET waiverReceivedAt = $at WHERE id = $id`, {
      $id: id,
      $at: received ? nowIso() : null,
    } as any);
  },
  // Retrofits a logoToken onto a team that predates this feature (created
  // before the migration, or seeded via demo-seed.ts's raw INSERT). Called
  // lazily wherever the link needs to be shown, rather than as a one-time
  // migration pass over every row.
  async ensureLogoToken(id: string): Promise<string> {
    const team = await Teams.byId(id);
    if (!team) throw new Error("Team not found");
    if (team.logoToken) return team.logoToken;
    let token = generateToken();
    while (await Teams.byLogoToken(token)) token = generateToken();
    await run(`UPDATE teams SET logoToken = $token WHERE id = $id`, { $id: id, $token: token } as any);
    return token;
  },
  async setCrest(id: string, bytes: Uint8Array, mimeType: string): Promise<void> {
    await run(`UPDATE teams SET crestBlob = $blob, crestMimeType = $mimeType, crestUpdatedAt = $updatedAt WHERE id = $id`, {
      $id: id,
      $blob: bytes,
      $mimeType: mimeType,
      $updatedAt: nowIso(),
    } as any);
  },
  // The only place crestBlob is ever read out — used exclusively by the
  // /api/teams/[teamId]/crest route that serves the image.
  async crestBytes(id: string): Promise<{ blob: Uint8Array; mimeType: string } | undefined> {
    const row = await get<{ crestBlob: Uint8Array | null; crestMimeType: string | null }>(
      `SELECT crestBlob, crestMimeType FROM teams WHERE id = $id`,
      { $id: id } as any
    );
    if (!row || !row.crestBlob || !row.crestMimeType) return undefined;
    return { blob: row.crestBlob, mimeType: row.crestMimeType };
  },
  async remove(id: string): Promise<void> {
    await run(`DELETE FROM players WHERE teamId = $id`, { $id: id } as any);
    await run(`DELETE FROM teams WHERE id = $id`, { $id: id } as any);
  },
  async countAll(): Promise<number> {
    return Number((await get<{ n: number }>(`SELECT COUNT(*) AS n FROM teams`))!.n);
  },
};

// ---------- Players ----------

// Explicit column list rather than SELECT *, so adding a column to the table
// never silently changes what every player read hands back.
// The blob columns are deliberately absent: a headshot and an identity
// document are large and restricted, and they are read through their own
// guarded accessors rather than riding along on every player list.
const PLAYER_COLUMNS = `id, teamId, userId, name, jerseyNumber, birthdate, passportId, position, secondaryPosition, graduationYear, videoUrl, videoPrivacy, gender, photoMimeType, photoUpdatedAt, faceCheckStatus, faceCheckScore, faceCheckAt, ageDocType, ageDocMimeType, ageDocUploadedAt, ageStatus, ageVerifiedAt, ageVerifiedByName, ageReviewNote, requestedTeamId, createdAt`;

function blankPlayer(input: Partial<Player>): Player {
  return {
    id: uid(),
    teamId: null,
    userId: null,
    name: "",
    jerseyNumber: null,
    birthdate: null,
    passportId: uid(),
    position: null,
    secondaryPosition: null,
    graduationYear: null,
    videoUrl: null,
    // Private by default. A highlight reel of a minor is not something to
    // publish because nobody got round to choosing.
    videoPrivacy: "PRIVATE",
    gender: null,
    photoMimeType: null,
    photoUpdatedAt: null,
    faceCheckStatus: null,
    faceCheckScore: null,
    faceCheckAt: null,
    ageDocType: null,
    ageDocMimeType: null,
    ageDocUploadedAt: null,
    ageStatus: null,
    ageVerifiedAt: null,
    ageVerifiedByName: null,
    ageReviewNote: null,
    requestedTeamId: null,
    createdAt: nowIso(),
    ...input,
  };
}

export const Players = {
  async create(input: { teamId: string; name: string; jerseyNumber?: string | null; birthdate?: string | null }): Promise<Player> {
    const p = blankPlayer({
      teamId: input.teamId,
      name: input.name,
      jerseyNumber: input.jerseyNumber ?? null,
      birthdate: input.birthdate ?? null,
    });
    await run(
      `INSERT INTO players (id, teamId, userId, name, jerseyNumber, birthdate, passportId, videoPrivacy, createdAt)
       VALUES ($id,$teamId,$userId,$name,$jerseyNumber,$birthdate,$passportId,$videoPrivacy,$createdAt)`,
      p as any
    );
    return p;
  },

  /**
   * A player who signed themselves up. No club yet — a coach adds them from
   * the roster hub, which is the step that sets teamId.
   */
  async createSelfRegistered(input: {
    userId: string;
    name: string;
    birthdate: string | null;
    gender: string | null;
    position: string | null;
    requestedTeamId: string | null;
  }): Promise<Player> {
    const p = blankPlayer({ ...input, ageStatus: "PENDING" });
    await run(
      `INSERT INTO players (id, teamId, userId, name, birthdate, passportId, videoPrivacy, gender, position, requestedTeamId, ageStatus, createdAt)
       VALUES ($id,$teamId,$userId,$name,$birthdate,$passportId,$videoPrivacy,$gender,$position,$requestedTeamId,$ageStatus,$createdAt)`,
      p as any
    );
    return p;
  },
  async byId(id: string): Promise<Player | undefined> {
    return get<Player>(`SELECT ${PLAYER_COLUMNS} FROM players WHERE id = $id`, { $id: id } as any);
  },
  async byPassportId(passportId: string): Promise<Player | undefined> {
    return get<Player>(`SELECT ${PLAYER_COLUMNS} FROM players WHERE passportId = $passportId`, { $passportId: passportId } as any);
  },
  async listByTeam(teamId: string): Promise<Player[]> {
    return all<Player>(`SELECT ${PLAYER_COLUMNS} FROM players WHERE teamId = $teamId ORDER BY createdAt ASC`, { $teamId: teamId } as any);
  },
  async byUserId(userId: string): Promise<Player | undefined> {
    return get<Player>(`SELECT ${PLAYER_COLUMNS} FROM players WHERE userId = $userId`, { $userId: userId } as any);
  },

  /**
   * Player accounts a coach can add, matched on name, email or passport id.
   * Only self-registered accounts (userId set) are searchable — a name typed
   * onto someone else's roster is not an account anyone can be added from.
   */
  async searchAccounts(query: string, limit = 25): Promise<(Player & { email: string | null; teamName: string | null })[]> {
    const q = `%${query.trim().toLowerCase()}%`;
    return all<Player & { email: string | null; teamName: string | null }>(
      `SELECT ${PLAYER_COLUMNS.split(", ").map((c) => `p.${c}`).join(", ")}, u.email AS email, t.name AS teamName
         FROM players p
         JOIN users u ON u.id = p.userId
         LEFT JOIN teams t ON t.id = p.teamId
        WHERE p.userId IS NOT NULL
          AND (LOWER(p.name) LIKE $q OR LOWER(u.email) LIKE $q OR LOWER(p.passportId) LIKE $q)
        ORDER BY p.createdAt DESC LIMIT $limit`,
      { $q: q, $limit: limit } as any
    );
  },

  /** Self-registered accounts not yet on any squad. */
  async unassignedAccounts(limit = 50): Promise<(Player & { email: string | null; teamName: string | null })[]> {
    return all<Player & { email: string | null; teamName: string | null }>(
      `SELECT ${PLAYER_COLUMNS.split(", ").map((c) => `p.${c}`).join(", ")}, u.email AS email, NULL AS teamName
         FROM players p JOIN users u ON u.id = p.userId
        WHERE p.userId IS NOT NULL AND p.teamId IS NULL
        ORDER BY p.createdAt DESC LIMIT $limit`,
      { $limit: limit } as any
    );
  },

  /** Identity documents awaiting a human decision. */
  async pendingAgeReview(limit = 50): Promise<(Player & { email: string | null; teamName: string | null })[]> {
    return all<Player & { email: string | null; teamName: string | null }>(
      `SELECT ${PLAYER_COLUMNS.split(", ").map((c) => `p.${c}`).join(", ")}, u.email AS email, t.name AS teamName
         FROM players p
         LEFT JOIN users u ON u.id = p.userId
         LEFT JOIN teams t ON t.id = p.teamId
        WHERE p.ageDocUploadedAt IS NOT NULL AND COALESCE(p.ageStatus,'PENDING') = 'PENDING'
        ORDER BY p.ageDocUploadedAt ASC LIMIT $limit`,
      { $limit: limit } as any
    );
  },

  async setPhoto(id: string, blob: Uint8Array, mimeType: string, face: { status: string; score: number }): Promise<void> {
    await run(
      `UPDATE players SET photoBlob = $blob, photoMimeType = $mimeType, photoUpdatedAt = $at,
              faceCheckStatus = $status, faceCheckScore = $score, faceCheckAt = $at
        WHERE id = $id`,
      { $id: id, $blob: Buffer.from(blob), $mimeType: mimeType, $at: nowIso(), $status: face.status, $score: face.score } as any
    );
  },
  async photoBytes(id: string): Promise<{ blob: Uint8Array; mimeType: string } | null> {
    const row = await get<{ photoBlob: Uint8Array | null; photoMimeType: string | null }>(
      `SELECT photoBlob, photoMimeType FROM players WHERE id = $id`,
      { $id: id } as any
    );
    if (!row?.photoBlob || !row.photoMimeType) return null;
    return { blob: row.photoBlob, mimeType: row.photoMimeType };
  },

  async setAgeDocument(id: string, blob: Uint8Array, mimeType: string, docType: string): Promise<void> {
    await run(
      `UPDATE players SET ageDocBlob = $blob, ageDocMimeType = $mimeType, ageDocType = $docType,
              ageDocUploadedAt = $at, ageStatus = 'PENDING', ageVerifiedAt = NULL, ageVerifiedByName = NULL
        WHERE id = $id`,
      { $id: id, $blob: Buffer.from(blob), $mimeType: mimeType, $docType: docType, $at: nowIso() } as any
    );
  },
  async ageDocBytes(id: string): Promise<{ blob: Uint8Array; mimeType: string } | null> {
    const row = await get<{ ageDocBlob: Uint8Array | null; ageDocMimeType: string | null }>(
      `SELECT ageDocBlob, ageDocMimeType FROM players WHERE id = $id`,
      { $id: id } as any
    );
    if (!row?.ageDocBlob || !row.ageDocMimeType) return null;
    return { blob: row.ageDocBlob, mimeType: row.ageDocMimeType };
  },

  async setAgeStatus(id: string, status: string, byName: string, note: string | null): Promise<void> {
    await run(
      `UPDATE players SET ageStatus = $status, ageVerifiedAt = $at, ageVerifiedByName = $byName, ageReviewNote = $note
        WHERE id = $id`,
      { $id: id, $status: status, $at: nowIso(), $byName: byName, $note: note } as any
    );
  },

  async assignToTeam(id: string, teamId: string | null): Promise<void> {
    await run(`UPDATE players SET teamId = $teamId, requestedTeamId = NULL WHERE id = $id`, {
      $id: id,
      $teamId: teamId,
    } as any);
  },
  async updateProfile(
    id: string,
    input: {
      jerseyNumber: string | null;
      position: string | null;
      secondaryPosition: string | null;
      graduationYear: number | null;
      videoUrl: string | null;
      videoPrivacy: string;
    }
  ): Promise<void> {
    await run(
      `UPDATE players SET jerseyNumber=$jerseyNumber, position=$position, secondaryPosition=$secondaryPosition,
         graduationYear=$graduationYear, videoUrl=$videoUrl, videoPrivacy=$videoPrivacy WHERE id=$id`,
      { $id: id, ...Object.fromEntries(Object.entries(input).map(([k, v]) => [`$${k}`, v ?? null])) } as any
    );
  },
  // Links a passport to a freshly created account. Guarded on userId
  // currently being NULL so a claim link can't be replayed to hijack a
  // passport someone else already claimed.
  async claim(id: string, userId: string): Promise<boolean> {
    const result = await run(`UPDATE players SET userId = $userId WHERE id = $id AND userId IS NULL`, { $id: id, $userId: userId } as any);
    return result.changes > 0;
  },
  async countAll(): Promise<number> {
    return Number((await get<{ n: number }>(`SELECT COUNT(*) AS n FROM players`))!.n);
  },
};

// ---------- Matches ----------

export const Matches = {
  async create(input: Omit<Match, "id" | "motmPlayerId">): Promise<Match> {
    const m: Match = { ...input, motmPlayerId: null, id: uid() };
    await run(
      `INSERT INTO matches (id, tournamentId, stage, round, groupName, homeTeamId, awayTeamId, homeLabel, awayLabel, homeScore, awayScore, field, scheduledAt, status, refereeId, motmPlayerId, orderIndex)
       VALUES ($id,$tournamentId,$stage,$round,$groupName,$homeTeamId,$awayTeamId,$homeLabel,$awayLabel,$homeScore,$awayScore,$field,$scheduledAt,$status,$refereeId,$motmPlayerId,$orderIndex)`,
      m as any
    );
    return m;
  },
  async byId(id: string): Promise<Match | undefined> {
    return get<Match>(`SELECT * FROM matches WHERE id = $id`, { $id: id } as any);
  },
  async listByTournament(tournamentId: string): Promise<Match[]> {
    return all<Match>(`SELECT * FROM matches WHERE tournamentId = $tournamentId ORDER BY orderIndex ASC`, { $tournamentId: tournamentId } as any);
  },
  async deleteByTournament(tournamentId: string): Promise<void> {
    await run(`DELETE FROM matches WHERE tournamentId = $tournamentId`, { $tournamentId: tournamentId } as any);
  },
  async updateScore(id: string, homeScore: number | null, awayScore: number | null, status: MatchStatus): Promise<void> {
    await run(`UPDATE matches SET homeScore=$homeScore, awayScore=$awayScore, status=$status WHERE id=$id`, {
      $id: id,
      $homeScore: homeScore,
      $awayScore: awayScore,
      $status: status,
    } as any);
  },
  async assignReferee(id: string, refereeId: string | null): Promise<void> {
    await run(`UPDATE matches SET refereeId = $refereeId WHERE id = $id`, { $id: id, $refereeId: refereeId } as any);
  },
  async setMotm(id: string, playerId: string | null): Promise<void> {
    await run(`UPDATE matches SET motmPlayerId = $playerId WHERE id = $id`, { $id: id, $playerId: playerId } as any);
  },
  async listByTeam(teamId: string): Promise<Match[]> {
    return all<Match>(
      `SELECT * FROM matches WHERE homeTeamId = $teamId OR awayTeamId = $teamId ORDER BY orderIndex ASC`,
      { $teamId: teamId } as any
    );
  },
  async setTeams(id: string, homeTeamId: string | null, awayTeamId: string | null): Promise<void> {
    await run(`UPDATE matches SET homeTeamId=$homeTeamId, awayTeamId=$awayTeamId WHERE id=$id`, {
      $id: id,
      $homeTeamId: homeTeamId,
      $awayTeamId: awayTeamId,
    } as any);
  },
};

// ---------- Site settings ----------
// Single-row, site-wide brand settings (currently just the accent color
// picked from /dashboard/settings). "singleton" is a fixed id — there is
// only ever one row.

const SITE_SETTINGS_ID = "singleton";
const DEFAULT_ACCENT_COLOR = "#FF4D4D";
const DEFAULT_THEME: SiteTheme = "dark";

export type SiteTheme = "light" | "dark";

export const SiteSettings = {
  // Both getters are called from the root layout, so they run on every
  // single page render — unlike every other model method here, they must
  // never throw. A transient connection hiccup would otherwise take down
  // an entire route over what's ultimately just cosmetics, so these fall
  // back to the default instead of propagating the error.
  async getAccentColor(): Promise<string> {
    try {
      const row = await get<{ accentColor: string }>(`SELECT accentColor FROM site_settings WHERE id = $id`, {
        $id: SITE_SETTINGS_ID,
      } as any);
      return row?.accentColor || DEFAULT_ACCENT_COLOR;
    } catch {
      return DEFAULT_ACCENT_COLOR;
    }
  },
  // theme is included here (defaulted, not just left to the column's own
  // SQL default) so that on a database where this table already existed
  // before DEFAULT_THEME last changed, the very first row this ever
  // creates — e.g. from picking an accent color before ever touching the
  // theme toggle — still gets today's actual default. A column's default
  // is baked in at CREATE TIME and can't be altered in place on an
  // existing database, so a stale schema.sql default would otherwise stick
  // around forever, silently undoing a default that was supposed to
  // change. ON CONFLICT never touches theme, so an existing explicit
  // choice is untouched either way.
  async setAccentColor(hex: string): Promise<void> {
    await run(
      `INSERT INTO site_settings (id, accentColor, theme, updatedAt) VALUES ($id,$accentColor,$theme,$updatedAt)
       ON CONFLICT(id) DO UPDATE SET accentColor = excluded.accentColor, updatedAt = excluded.updatedAt`,
      { $id: SITE_SETTINGS_ID, $accentColor: hex, $theme: DEFAULT_THEME, $updatedAt: nowIso() } as any
    );
  },
  async getTheme(): Promise<SiteTheme> {
    try {
      const row = await get<{ theme: string }>(`SELECT theme FROM site_settings WHERE id = $id`, { $id: SITE_SETTINGS_ID } as any);
      // Must check for both explicit values, not just "dark" — with the
      // fallback now itself "dark", collapsing anything-but-dark to the
      // fallback would silently override a real, explicit "light" choice
      // sitting right there in the row.
      if (row?.theme === "light" || row?.theme === "dark") return row.theme;
      return DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  },
  // Mirrors setAccentColor's reasoning: accentColor defaulted explicitly
  // here too, rather than trusting the column's own (potentially stale,
  // un-alterable) SQL default on a database where this table predates
  // the current DEFAULT_ACCENT_COLOR.
  async setTheme(theme: SiteTheme): Promise<void> {
    await run(
      `INSERT INTO site_settings (id, theme, accentColor, updatedAt) VALUES ($id,$theme,$accentColor,$updatedAt)
       ON CONFLICT(id) DO UPDATE SET theme = excluded.theme, updatedAt = excluded.updatedAt`,
      { $id: SITE_SETTINGS_ID, $theme: theme, $accentColor: DEFAULT_ACCENT_COLOR, $updatedAt: nowIso() } as any
    );
  },
  // The legal identity printed on an invoice. Nulls are meaningful and are
  // never papered over with a plausible-looking placeholder: an invoice
  // showing an invented address or tax ID would be a document someone files
  // with their accounts, so the print view says the field is unset instead.
  async getBusiness(): Promise<BusinessIdentity> {
    try {
      const row = await get<BusinessIdentity>(
        `SELECT businessName, businessAddress, taxId FROM site_settings WHERE id = $id`,
        { $id: SITE_SETTINGS_ID } as any
      );
      return {
        businessName: row?.businessName || null,
        businessAddress: row?.businessAddress || null,
        taxId: row?.taxId || null,
      };
    } catch {
      return { businessName: null, businessAddress: null, taxId: null };
    }
  },
  async setBusiness(input: BusinessIdentity): Promise<void> {
    await run(
      `INSERT INTO site_settings (id, businessName, businessAddress, taxId, accentColor, theme, updatedAt)
       VALUES ($id,$businessName,$businessAddress,$taxId,$accentColor,$theme,$updatedAt)
       ON CONFLICT(id) DO UPDATE SET businessName = excluded.businessName, businessAddress = excluded.businessAddress,
                                     taxId = excluded.taxId, updatedAt = excluded.updatedAt`,
      {
        $id: SITE_SETTINGS_ID,
        $businessName: input.businessName,
        $businessAddress: input.businessAddress,
        $taxId: input.taxId,
        $accentColor: DEFAULT_ACCENT_COLOR,
        $theme: DEFAULT_THEME,
        $updatedAt: nowIso(),
      } as any
    );
  },
};

export interface BusinessIdentity {
  businessName: string | null;
  businessAddress: string | null;
  taxId: string | null;
}

// ---------- Referees ----------

const REFEREE_COLUMNS = `id, tournamentId, name, contact, userId, certification, ratingPct`;

export const Referees = {
  async create(input: { tournamentId: string; name: string; contact?: string | null }): Promise<Referee> {
    const r: Referee = {
      id: uid(),
      tournamentId: input.tournamentId,
      name: input.name,
      contact: input.contact ?? null,
      userId: null,
      certification: null,
      ratingPct: null,
    };
    await run(`INSERT INTO referees (id, tournamentId, name, contact) VALUES ($id,$tournamentId,$name,$contact)`, r as any);
    return r;
  },
  async byId(id: string): Promise<Referee | undefined> {
    return get<Referee>(`SELECT ${REFEREE_COLUMNS} FROM referees WHERE id = $id`, { $id: id } as any);
  },
  async listByTournament(tournamentId: string): Promise<Referee[]> {
    return all<Referee>(`SELECT ${REFEREE_COLUMNS} FROM referees WHERE tournamentId = $tournamentId ORDER BY name ASC`, { $tournamentId: tournamentId } as any);
  },
  /** Every official record tied to one signed-in account, across events. */
  async listByUserId(userId: string): Promise<Referee[]> {
    return all<Referee>(`SELECT ${REFEREE_COLUMNS} FROM referees WHERE userId = $userId`, { $userId: userId } as any);
  },
  async updateProfile(
    id: string,
    input: { certification: string | null; ratingPct: number | null; contact: string | null; userId: string | null }
  ): Promise<void> {
    await run(
      `UPDATE referees SET certification=$certification, ratingPct=$ratingPct, contact=$contact, userId=$userId WHERE id=$id`,
      {
        $id: id,
        $certification: input.certification,
        $ratingPct: input.ratingPct,
        $contact: input.contact,
        $userId: input.userId,
      } as any
    );
  },
};

// ---------- Check-ins ----------

export const CheckIns = {
  async create(tournamentId: string, playerId: string): Promise<CheckIn> {
    const existing = await get<CheckIn>(`SELECT * FROM checkins WHERE tournamentId=$tournamentId AND playerId=$playerId`, {
      $tournamentId: tournamentId,
      $playerId: playerId,
    } as any);
    if (existing) return existing;
    const c: CheckIn = { id: uid(), tournamentId, playerId, checkedInAt: nowIso() };
    await run(`INSERT INTO checkins (id, tournamentId, playerId, checkedInAt) VALUES ($id,$tournamentId,$playerId,$checkedInAt)`, c as any);
    return c;
  },
  async listByTournament(tournamentId: string): Promise<CheckIn[]> {
    return all<CheckIn>(`SELECT * FROM checkins WHERE tournamentId = $tournamentId`, { $tournamentId: tournamentId } as any);
  },
  async listByPlayer(playerId: string): Promise<CheckIn[]> {
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
  // The contact form has been writing here since it shipped with nothing
  // able to read it back — every enquiry landed in Postgres unseen. This is
  // what the admin inbox reads.
  async listAll(): Promise<Inquiry[]> {
    return all<Inquiry>(`SELECT * FROM inquiries ORDER BY createdAt DESC`);
  },
  async create(input: { name: string; email: string; phone?: string | null; tournamentType?: string | null; message: string }): Promise<Inquiry> {
    const i: Inquiry = {
      id: uid(),
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      tournamentType: input.tournamentType ?? null,
      message: input.message,
      createdAt: nowIso(),
    };
    await run(
      `INSERT INTO inquiries (id, name, email, phone, tournamentType, message, createdAt)
       VALUES ($id,$name,$email,$phone,$tournamentType,$message,$createdAt)`,
      i as any
    );
    return i;
  },
};


export const Applications = {
  async create(
    input: Omit<Application, "id" | "createdAt" | "status" | "paymentStatus" | "teamId" | "decidedAt"> & {
      paymentStatus?: PaymentStatus;
    }
  ): Promise<Application> {
    const a: Application = {
      id: uid(),
      tournamentId: input.tournamentId,
      teamName: input.teamName,
      clubName: input.clubName ?? null,
      division: input.division ?? null,
      managerName: input.managerName,
      managerEmail: input.managerEmail,
      managerPhone: input.managerPhone ?? null,
      rosterCount: input.rosterCount ?? 0,
      notes: input.notes ?? null,
      status: "PENDING",
      paymentStatus: input.paymentStatus ?? "UNPAID",
      teamId: null,
      createdAt: nowIso(),
      decidedAt: null,
    };
    await run(
      `INSERT INTO applications (id, tournamentId, teamName, clubName, division, managerName, managerEmail, managerPhone, rosterCount, notes, status, paymentStatus, teamId, createdAt, decidedAt)
       VALUES ($id,$tournamentId,$teamName,$clubName,$division,$managerName,$managerEmail,$managerPhone,$rosterCount,$notes,$status,$paymentStatus,NULL,$createdAt,NULL)`,
      a as any
    );
    return a;
  },
  async byId(id: string): Promise<Application | undefined> {
    // Explicit columns, never SELECT * — crestBlob lives on this table and
    // a wildcard would haul a full image into every read of every row.
    return get<Application>(`SELECT id, tournamentId, teamName, clubName, division, managerName, managerEmail, managerPhone, rosterCount, notes, status, paymentStatus, teamId, createdAt, decidedAt FROM applications WHERE id = $id`, { $id: id });
  },
  async listByTournament(tournamentId: string): Promise<Application[]> {
    return all<Application>(
      `SELECT id, tournamentId, teamName, clubName, division, managerName, managerEmail, managerPhone, rosterCount, notes, status, paymentStatus, teamId, createdAt, decidedAt FROM applications WHERE tournamentId = $tournamentId ORDER BY createdAt DESC`,
      { $tournamentId: tournamentId }
    );
  },
  async setStatus(id: string, status: ApplicationStatus, teamId?: string | null): Promise<void> {
    await run(
      `UPDATE applications SET status = $status, decidedAt = $decidedAt, teamId = COALESCE($teamId, teamId) WHERE id = $id`,
      { $id: id, $status: status, $decidedAt: nowIso(), $teamId: teamId ?? null }
    );
  },
  // Platform-wide, for the admin inbox. Joined to tournaments so a row can
  // say which event it belongs to; still an explicit column list, because
  // crestBlob lives on this table.
  async listAllRecent(limit = 100): Promise<(Application & { tournamentName: string | null })[]> {
    return all<Application & { tournamentName: string | null }>(
      `SELECT a.id, a.tournamentId, a.teamName, a.clubName, a.division, a.managerName, a.managerEmail, a.managerPhone, a.rosterCount, a.notes, a.status, a.paymentStatus, a.teamId, a.createdAt, a.decidedAt, t.name AS tournamentName
         FROM applications a LEFT JOIN tournaments t ON t.id = a.tournamentId
        ORDER BY a.createdAt DESC LIMIT $limit`,
      { $limit: limit }
    );
  },
  async setCrest(id: string, bytes: Uint8Array, mimeType: string): Promise<void> {
    await run(`UPDATE applications SET crestBlob = $blob, crestMimeType = $mimeType WHERE id = $id`, {
      $id: id,
      $blob: bytes,
      $mimeType: mimeType,
    } as any);
  },
  // Read back only at acceptance, to copy onto the new team row. Kept off the
  // Application interface so listByTournament never drags a table's worth of
  // image blobs into the applications screen.
  async crestBytes(id: string): Promise<{ blob: Uint8Array; mimeType: string } | undefined> {
    const row = await get<{ crestBlob: Uint8Array | null; crestMimeType: string | null }>(
      `SELECT crestBlob, crestMimeType FROM applications WHERE id = $id`,
      { $id: id }
    );
    if (!row?.crestBlob || !row.crestMimeType) return undefined;
    return { blob: row.crestBlob, mimeType: row.crestMimeType };
  },
  async setPaymentStatus(id: string, paymentStatus: PaymentStatus): Promise<void> {
    await run(`UPDATE applications SET paymentStatus = $paymentStatus WHERE id = $id`, {
      $id: id,
      $paymentStatus: paymentStatus,
    });
  },
};

// ---------- Invoices ----------

export interface Invoice {
  id: string;
  number: string;
  tournamentId: string;
  teamId: string | null;
  applicationId: string | null;
  // Snapshotted at issue time. An invoice has to keep saying who was billed
  // even after the club renames itself or the manager's email changes.
  billToClub: string;
  billToContact: string;
  billToEmail: string;
  billToPhone: string | null;
  division: string | null;
  teamCount: number;
  issuedAt: string;
  dueAt: string;
  discountCode: string | null;
  discountCents: number;
  processingFeeCents: number;
  notes: string | null;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  discountCents: number;
  orderIndex: number;
}

export type PaymentMethod = "CASH" | "CHECK" | "TRANSFER" | "CARD" | "OTHER" | "REFUND" | "ADJUSTMENT";

export interface InvoicePayment {
  id: string;
  invoiceId: string;
  /** Negative for refunds and write-off adjustments — see schema.sql. */
  amountCents: number;
  method: PaymentMethod;
  reference: string | null;
  note: string | null;
  recordedByName: string | null;
  recordedAt: string;
}

export interface InvoiceInstallment {
  id: string;
  invoiceId: string;
  label: string;
  amountCents: number;
  dueAt: string;
  paidAt: string | null;
  orderIndex: number;
}

const INVOICE_COLUMNS = `id, number, tournamentId, teamId, applicationId, billToClub, billToContact, billToEmail, billToPhone, division, teamCount, issuedAt, dueAt, discountCode, discountCents, processingFeeCents, notes, createdAt`;

export const Invoices = {
  async create(
    input: Omit<Invoice, "id" | "createdAt" | "discountCode" | "discountCents" | "processingFeeCents" | "notes"> & {
      discountCode?: string | null;
      discountCents?: number;
      processingFeeCents?: number;
      notes?: string | null;
    }
  ): Promise<Invoice> {
    const id = uid();
    await run(
      `INSERT INTO invoices (id, number, tournamentId, teamId, applicationId, billToClub, billToContact, billToEmail, billToPhone, division, teamCount, issuedAt, dueAt, discountCode, discountCents, processingFeeCents, notes, createdAt)
       VALUES ($id,$number,$tournamentId,$teamId,$applicationId,$billToClub,$billToContact,$billToEmail,$billToPhone,$division,$teamCount,$issuedAt,$dueAt,$discountCode,$discountCents,$processingFeeCents,$notes,$createdAt)`,
      {
        $id: id,
        $number: input.number,
        $tournamentId: input.tournamentId,
        $teamId: input.teamId ?? null,
        $applicationId: input.applicationId ?? null,
        $billToClub: input.billToClub,
        $billToContact: input.billToContact,
        $billToEmail: input.billToEmail,
        $billToPhone: input.billToPhone ?? null,
        $division: input.division ?? null,
        $teamCount: input.teamCount ?? 1,
        $issuedAt: input.issuedAt,
        $dueAt: input.dueAt,
        $discountCode: input.discountCode ?? null,
        $discountCents: input.discountCents ?? 0,
        $processingFeeCents: input.processingFeeCents ?? 0,
        $notes: input.notes ?? null,
        $createdAt: nowIso(),
      } as any
    );
    return (await Invoices.byId(id))!;
  },
  async byId(id: string): Promise<Invoice | undefined> {
    return get<Invoice>(`SELECT ${INVOICE_COLUMNS} FROM invoices WHERE id = $id`, { $id: id } as any);
  },
  async byTeamId(teamId: string): Promise<Invoice | undefined> {
    return get<Invoice>(`SELECT ${INVOICE_COLUMNS} FROM invoices WHERE teamId = $teamId ORDER BY createdAt DESC`, {
      $teamId: teamId,
    } as any);
  },
  async listByTournament(tournamentId: string): Promise<Invoice[]> {
    return all<Invoice>(
      `SELECT ${INVOICE_COLUMNS} FROM invoices WHERE tournamentId = $tournamentId ORDER BY issuedAt DESC`,
      { $tournamentId: tournamentId } as any
    );
  },
  async numbersForYear(year: number): Promise<string[]> {
    const rows = await all<{ number: string }>(`SELECT number FROM invoices WHERE number LIKE $prefix`, {
      $prefix: `INV-${year}-%`,
    } as any);
    return rows.map((r) => r.number);
  },
  async setDiscount(id: string, code: string | null, discountCents: number): Promise<void> {
    await run(`UPDATE invoices SET discountCode = $code, discountCents = $cents WHERE id = $id`, {
      $id: id,
      $code: code,
      $cents: discountCents,
    } as any);
  },
  async setDue(id: string, dueAt: string): Promise<void> {
    await run(`UPDATE invoices SET dueAt = $dueAt WHERE id = $id`, { $id: id, $dueAt: dueAt } as any);
  },
  // Roll-ups for the finance index, so listing N invoices is three queries
  // rather than three per invoice. Keyed by invoiceId at the call site.
  async totalsByTournament(
    tournamentId: string
  ): Promise<Map<string, { chargedCents: number; paidCents: number }>> {
    const charged = await all<{ invoiceId: string; chargedCents: number }>(
      `SELECT i.id AS invoiceId,
              COALESCE(SUM(it.quantity * it.unitPriceCents - it.discountCents), 0) AS chargedCents
         FROM invoices i LEFT JOIN invoice_items it ON it.invoiceId = i.id
        WHERE i.tournamentId = $tournamentId GROUP BY i.id`,
      { $tournamentId: tournamentId } as any
    );
    const paid = await all<{ invoiceId: string; paidCents: number }>(
      `SELECT i.id AS invoiceId, COALESCE(SUM(p.amountCents), 0) AS paidCents
         FROM invoices i LEFT JOIN invoice_payments p ON p.invoiceId = i.id
        WHERE i.tournamentId = $tournamentId GROUP BY i.id`,
      { $tournamentId: tournamentId } as any
    );
    const paidById = new Map(paid.map((r) => [r.invoiceId, Number(r.paidCents)]));
    return new Map(
      charged.map((r) => [
        r.invoiceId,
        { chargedCents: Number(r.chargedCents), paidCents: paidById.get(r.invoiceId) ?? 0 },
      ])
    );
  },
};

export const InvoiceItems = {
  async create(input: Omit<InvoiceItem, "id">): Promise<InvoiceItem> {
    const id = uid();
    await run(
      `INSERT INTO invoice_items (id, invoiceId, description, quantity, unitPriceCents, discountCents, orderIndex)
       VALUES ($id,$invoiceId,$description,$quantity,$unitPriceCents,$discountCents,$orderIndex)`,
      { $id: id, ...prefixed(input) } as any
    );
    return { id, ...input };
  },
  async listByInvoice(invoiceId: string): Promise<InvoiceItem[]> {
    return all<InvoiceItem>(
      `SELECT id, invoiceId, description, quantity, unitPriceCents, discountCents, orderIndex
         FROM invoice_items WHERE invoiceId = $invoiceId ORDER BY orderIndex ASC`,
      { $invoiceId: invoiceId } as any
    );
  },
};

export const InvoicePayments = {
  async create(input: Omit<InvoicePayment, "id" | "recordedAt">): Promise<InvoicePayment> {
    const id = uid();
    const recordedAt = nowIso();
    await run(
      `INSERT INTO invoice_payments (id, invoiceId, amountCents, method, reference, note, recordedByName, recordedAt)
       VALUES ($id,$invoiceId,$amountCents,$method,$reference,$note,$recordedByName,$recordedAt)`,
      {
        $id: id,
        $invoiceId: input.invoiceId,
        $amountCents: input.amountCents,
        $method: input.method,
        $reference: input.reference ?? null,
        $note: input.note ?? null,
        $recordedByName: input.recordedByName ?? null,
        $recordedAt: recordedAt,
      } as any
    );
    return { id, recordedAt, ...input };
  },
  async listByInvoice(invoiceId: string): Promise<InvoicePayment[]> {
    return all<InvoicePayment>(
      `SELECT id, invoiceId, amountCents, method, reference, note, recordedByName, recordedAt
         FROM invoice_payments WHERE invoiceId = $invoiceId ORDER BY recordedAt ASC`,
      { $invoiceId: invoiceId } as any
    );
  },
};

export const InvoiceInstallments = {
  async replaceForInvoice(
    invoiceId: string,
    plan: { label: string; amountCents: number; dueAt: string }[]
  ): Promise<void> {
    // A payment plan is rebuilt whole rather than diffed: the schedule is
    // meaningless in halves, and a failed diff would leave an invoice whose
    // instalments no longer sum to its total.
    await run(`DELETE FROM invoice_installments WHERE invoiceId = $invoiceId`, { $invoiceId: invoiceId } as any);
    for (let i = 0; i < plan.length; i++) {
      await run(
        `INSERT INTO invoice_installments (id, invoiceId, label, amountCents, dueAt, paidAt, orderIndex)
         VALUES ($id,$invoiceId,$label,$amountCents,$dueAt,NULL,$orderIndex)`,
        {
          $id: uid(),
          $invoiceId: invoiceId,
          $label: plan[i].label,
          $amountCents: plan[i].amountCents,
          $dueAt: plan[i].dueAt,
          $orderIndex: i,
        } as any
      );
    }
  },
  async listByInvoice(invoiceId: string): Promise<InvoiceInstallment[]> {
    return all<InvoiceInstallment>(
      `SELECT id, invoiceId, label, amountCents, dueAt, paidAt, orderIndex
         FROM invoice_installments WHERE invoiceId = $invoiceId ORDER BY orderIndex ASC`,
      { $invoiceId: invoiceId } as any
    );
  },
  async setPaid(id: string, paid: boolean): Promise<void> {
    await run(`UPDATE invoice_installments SET paidAt = $at WHERE id = $id`, {
      $id: id,
      $at: paid ? nowIso() : null,
    } as any);
  },
};

// The $-prefixed params object the db layer expects, built from a plain
// record so an insert doesn't have to restate every field twice.
function prefixed(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).map(([k, v]) => [`$${k}`, v ?? null]));
}

export const ApplicationMessages = {
  async create(input: Omit<ApplicationMessage, "id" | "createdAt" | "status">): Promise<ApplicationMessage> {
    const m: ApplicationMessage = {
      id: uid(),
      tournamentId: input.tournamentId,
      template: input.template ?? null,
      audience: input.audience,
      subject: input.subject,
      body: input.body,
      recipients: input.recipients,
      recipientCount: input.recipientCount,
      // QUEUED, not SENT: nothing delivers these yet. Recording them as sent
      // would be a lie the organizer would act on.
      status: "QUEUED",
      priority: input.priority ?? "STANDARD",
      createdAt: nowIso(),
    };
    await run(
      `INSERT INTO application_messages (id, tournamentId, template, audience, subject, body, recipients, recipientCount, status, priority, createdAt)
       VALUES ($id,$tournamentId,$template,$audience,$subject,$body,$recipients,$recipientCount,$status,$priority,$createdAt)`,
      m as any
    );
    return m;
  },
  /**
   * The most recent urgent broadcast still worth showing spectators. Capped by
   * age rather than kept forever: a weather alert from last season on a public
   * page is worse than no banner at all.
   */
  async latestUrgent(tournamentId: string, maxAgeHours = 12): Promise<ApplicationMessage | undefined> {
    const cutoff = new Date(Date.now() - maxAgeHours * 3600_000).toISOString();
    return get<ApplicationMessage>(
      `SELECT * FROM application_messages
        WHERE tournamentId = $tournamentId AND priority = 'URGENT' AND createdAt > $cutoff
        ORDER BY createdAt DESC LIMIT 1`,
      { $tournamentId: tournamentId, $cutoff: cutoff } as any
    );
  },
  async listAllRecent(limit = 100): Promise<(ApplicationMessage & { tournamentName: string | null })[]> {
    return all<ApplicationMessage & { tournamentName: string | null }>(
      `SELECT m.*, t.name AS tournamentName
         FROM application_messages m LEFT JOIN tournaments t ON t.id = m.tournamentId
        ORDER BY m.createdAt DESC LIMIT $limit`,
      { $limit: limit }
    );
  },
  async setStatus(id: string, status: string): Promise<void> {
    await run(`UPDATE application_messages SET status = $status WHERE id = $id`, { $id: id, $status: status } as any);
  },
  async listByTournament(tournamentId: string): Promise<ApplicationMessage[]> {
    return all<ApplicationMessage>(
      `SELECT * FROM application_messages WHERE tournamentId = $tournamentId ORDER BY createdAt DESC`,
      { $tournamentId: tournamentId }
    );
  },
};

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
