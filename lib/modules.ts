import type { Match, MatchEvent, Team, Referee } from "@/lib/models";

// The optional modules an organizer switches on per event, and the maths the
// analytics module runs. Pure, so the settings screen, the public pages and
// the tests all read the same rules.

export interface ModuleSettings {
  tournamentId: string;
  matchCenterEnabled: boolean;
  venuePins: string | null;
  venueAddress: string | null;
  sponsorsEnabled: boolean;
  fairPlayPublic: boolean;
  fairPlayYellowPoints: number;
  fairPlayRedPoints: number;
  fairPlayAlertThreshold: number;
  mediaEnabled: boolean;
  mediaUploadPolicy: string;
  updatedAt: string | null;
}

/**
 * What an event that has never opened the settings screen gets.
 *
 * Everything is off. An organizer opting in to a public live tracker, a
 * sponsor banner on their spectator page or a photo gallery parents can post
 * to is a decision with consequences for them — not a default someone
 * discovers after the fact.
 */
export function defaultModules(tournamentId: string): ModuleSettings {
  return {
    tournamentId,
    matchCenterEnabled: false,
    venuePins: null,
    venueAddress: null,
    sponsorsEnabled: false,
    fairPlayPublic: false,
    fairPlayYellowPoints: 1,
    fairPlayRedPoints: 3,
    fairPlayAlertThreshold: 6,
    mediaEnabled: false,
    mediaUploadPolicy: "STAFF",
    updatedAt: null,
  };
}

// ── Venue map ──────────────────────────────────────────────────────────────

export type PinKind = "FIELD" | "CONCESSION" | "MEDICAL" | "PARKING" | "CHECKIN";

export interface VenuePin {
  kind: PinKind;
  label: string;
  /** Percentages of the map box, so the layout is resolution-independent. */
  x: number;
  y: number;
}

export const PIN_KINDS: { value: PinKind; label: string; glyph: string }[] = [
  { value: "FIELD", label: "Field", glyph: "⚽" },
  { value: "CHECKIN", label: "Check-in", glyph: "🎫" },
  { value: "CONCESSION", label: "Concessions", glyph: "🍔" },
  { value: "MEDICAL", label: "Medical", glyph: "⛑" },
  { value: "PARKING", label: "Parking", glyph: "🅿" },
];

export function parsePins(json: string | null): VenuePin[] {
  if (!json) return [];
  try {
    const raw = JSON.parse(json);
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((p): p is Record<string, unknown> => Boolean(p) && typeof p === "object")
      .map((p) => ({
        kind: (PIN_KINDS.some((k) => k.value === p.kind) ? p.kind : "FIELD") as PinKind,
        label: String(p.label ?? "").slice(0, 60),
        // Clamped: these coordinates come back from a drag in the editor and
        // are written straight into a style attribute.
        x: Math.max(0, Math.min(100, Number(p.x) || 0)),
        y: Math.max(0, Math.min(100, Number(p.y) || 0)),
      }))
      .slice(0, 40);
  } catch {
    return [];
  }
}

/** Directions to the venue, from whatever address the organizer typed. */
export function directionsUrl(address: string | null): string | null {
  if (!address || !address.trim()) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;
}

/** Apple Maps takes the same query, and is what an iPhone opens natively. */
export function appleMapsUrl(address: string | null): string | null {
  if (!address || !address.trim()) return null;
  return `https://maps.apple.com/?q=${encodeURIComponent(address.trim())}`;
}

// ── Fair play ──────────────────────────────────────────────────────────────

export interface FairPlayRow {
  team: Team;
  matches: number;
  yellows: number;
  reds: number;
  points: number;
  /** Points per match played — the comparable figure across uneven schedules. */
  perMatch: number;
  flagged: boolean;
}

/**
 * Sportsmanship, counted from cards actually recorded on match_events.
 *
 * Deliberately not a rating out of ten: this app has no post-game conduct
 * survey, and inventing a score with no input behind it would be a number
 * that looks authoritative and means nothing. It counts what a referee
 * wrote down, weighted by whatever the organizer decided a yellow and a red
 * are worth, and says so on the page.
 *
 * Lower is better. The table is sorted that way, and per-match is the
 * ranking figure because a team that has played four games is not worse
 * behaved than one that has played two just by having been on the pitch
 * longer.
 */
export function fairPlayTable(
  teams: Team[],
  matches: Match[],
  events: MatchEvent[],
  settings: Pick<ModuleSettings, "fairPlayYellowPoints" | "fairPlayRedPoints" | "fairPlayAlertThreshold">
): FairPlayRow[] {
  const played = matches.filter((m) => m.status === "FINAL");
  return teams
    .map((team) => {
      const mine = events.filter((e) => e.teamId === team.id);
      const yellows = mine.filter((e) => e.type === "YELLOW").length;
      const reds = mine.filter((e) => e.type === "RED").length;
      const appearances = played.filter((m) => m.homeTeamId === team.id || m.awayTeamId === team.id).length;
      const points = yellows * settings.fairPlayYellowPoints + reds * settings.fairPlayRedPoints;
      return {
        team,
        matches: appearances,
        yellows,
        reds,
        points,
        perMatch: appearances > 0 ? Math.round((points / appearances) * 100) / 100 : 0,
        flagged: points >= settings.fairPlayAlertThreshold,
      };
    })
    .sort((a, b) => a.perMatch - b.perMatch || a.points - b.points || a.team.name.localeCompare(b.team.name));
}

// ── Operational analytics ─────────────────────────────────────────────────

export interface FieldUsage {
  field: string;
  matches: number;
  /** Minutes from first kick-off to last on that field. */
  spanMinutes: number;
  /** Median gap between consecutive kick-offs — the turnover speed. */
  medianTurnoverMinutes: number | null;
}

export function fieldUsage(matches: Match[]): FieldUsage[] {
  const scheduled = matches.filter((m) => m.scheduledAt && m.field);
  const byField = new Map<string, number[]>();
  for (const m of scheduled) {
    const t = new Date(m.scheduledAt as string).getTime();
    if (Number.isNaN(t)) continue;
    byField.set(m.field as string, [...(byField.get(m.field as string) ?? []), t]);
  }
  return [...byField.entries()]
    .map(([field, times]) => {
      const sorted = [...times].sort((a, b) => a - b);
      const gaps: number[] = [];
      for (let i = 1; i < sorted.length; i++) gaps.push((sorted[i] - sorted[i - 1]) / 60000);
      gaps.sort((a, b) => a - b);
      return {
        field,
        matches: sorted.length,
        spanMinutes: sorted.length > 1 ? Math.round((sorted[sorted.length - 1] - sorted[0]) / 60000) : 0,
        medianTurnoverMinutes: gaps.length ? Math.round(gaps[Math.floor(gaps.length / 2)]) : null,
      };
    })
    .sort((a, b) => a.field.localeCompare(b.field));
}

export interface RefereeLoad {
  referee: Referee;
  matches: number;
  /** Back-to-back assignments: a match starting within 90 minutes of a previous one. */
  backToBack: number;
}

export function refereeLoad(referees: Referee[], matches: Match[]): RefereeLoad[] {
  return referees
    .map((referee) => {
      const mine = matches
        .filter((m) => m.refereeId === referee.id && m.scheduledAt)
        .map((m) => new Date(m.scheduledAt as string).getTime())
        .filter((t) => !Number.isNaN(t))
        .sort((a, b) => a - b);
      let backToBack = 0;
      for (let i = 1; i < mine.length; i++) {
        if ((mine[i] - mine[i - 1]) / 60000 <= 90) backToBack++;
      }
      return { referee, matches: mine.length, backToBack };
    })
    .sort((a, b) => b.matches - a.matches || a.referee.name.localeCompare(b.referee.name));
}

// ── Live match centre ─────────────────────────────────────────────────────

export const EVENT_GLYPH: Record<string, string> = {
  GOAL: "⚽",
  ASSIST: "🅰",
  YELLOW: "🟨",
  RED: "🟥",
};

/** Match events newest-last, which is how a running commentary reads. */
export function timeline(events: MatchEvent[]): MatchEvent[] {
  return [...events].sort((a, b) => {
    if (a.minute != null && b.minute != null && a.minute !== b.minute) return a.minute - b.minute;
    return a.createdAt.localeCompare(b.createdAt);
  });
}
