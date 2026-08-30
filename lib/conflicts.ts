import type { Match, Team } from "./models";

export type ConflictKind = "FIELD_DOUBLE_BOOKED" | "BACK_TO_BACK" | "TEAM_DOUBLE_BOOKED";

export interface Conflict {
  kind: ConflictKind;
  /** Match ids involved, so a row can be flagged where it sits. */
  matchIds: string[];
  title: string;
  detail: string;
}

// Nominal length of a slot. generateGroupStage schedules on 45-minute
// centres, so two fixtures on one field inside that window overlap in
// practice even when their timestamps differ.
const SLOT_MINUTES = 45;
// A squad needs a real gap between kickoffs. Anything under this is
// playable but brutal, and organizers want to see it before publishing
// rather than hear about it from a coach on the day.
const REST_MINUTES = 60;

function minutesBetween(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 60000;
}

function label(teamsById: Map<string, Team>, id: string | null): string {
  return (id && teamsById.get(id)?.name) || "TBD";
}

// Real detection over the fixtures that exist, not a wireframe: every input
// (field, kick-off time, both team ids) is already on the match row, so an
// organizer gets a true answer rather than a placeholder card.
//
// Cancelled/unscheduled fixtures are skipped — a match with no scheduledAt
// cannot conflict with anything, and treating null as epoch would make every
// unscheduled pair look double-booked.
export function findConflicts(matches: Match[], teams: Team[]): Conflict[] {
  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const scheduled = matches.filter((m) => m.scheduledAt);
  const out: Conflict[] = [];

  // 1. One field, two matches, overlapping slots.
  const byField = new Map<string, Match[]>();
  for (const m of scheduled) {
    if (!m.field) continue;
    const list = byField.get(m.field) ?? [];
    list.push(m);
    byField.set(m.field, list);
  }
  for (const [field, list] of byField) {
    const sorted = [...list].sort((a, b) => (a.scheduledAt as string).localeCompare(b.scheduledAt as string));
    for (let i = 1; i < sorted.length; i++) {
      const gap = minutesBetween(sorted[i - 1].scheduledAt as string, sorted[i].scheduledAt as string);
      if (gap < SLOT_MINUTES) {
        out.push({
          kind: "FIELD_DOUBLE_BOOKED",
          matchIds: [sorted[i - 1].id, sorted[i].id],
          title: `${field} is double-booked`,
          detail: `Two fixtures start ${Math.round(gap)} min apart on the same ${field.toLowerCase()}.`,
        });
      }
    }
  }

  // 2 & 3. Per-team: the same squad in two places at once, or with too
  // little rest between kickoffs. Both come from one pass over each team's
  // own fixture list, since they are the same comparison at different
  // thresholds.
  const byTeam = new Map<string, Match[]>();
  for (const m of scheduled) {
    for (const id of [m.homeTeamId, m.awayTeamId]) {
      if (!id) continue;
      const list = byTeam.get(id) ?? [];
      list.push(m);
      byTeam.set(id, list);
    }
  }
  for (const [teamId, list] of byTeam) {
    const sorted = [...list].sort((a, b) => (a.scheduledAt as string).localeCompare(b.scheduledAt as string));
    for (let i = 1; i < sorted.length; i++) {
      const gap = minutesBetween(sorted[i - 1].scheduledAt as string, sorted[i].scheduledAt as string);
      const name = label(teamsById, teamId);
      if (gap < SLOT_MINUTES) {
        out.push({
          kind: "TEAM_DOUBLE_BOOKED",
          matchIds: [sorted[i - 1].id, sorted[i].id],
          title: `${name} is in two places at once`,
          detail: `Two fixtures ${Math.round(gap)} min apart — the squad cannot play both.`,
        });
      } else if (gap < REST_MINUTES) {
        out.push({
          kind: "BACK_TO_BACK",
          matchIds: [sorted[i - 1].id, sorted[i].id],
          title: `${name} plays back-to-back`,
          detail: `Only ${Math.round(gap)} min between kickoffs.`,
        });
      }
    }
  }

  // Severity order, so the thing that breaks the day is read first.
  const rank: Record<ConflictKind, number> = {
    TEAM_DOUBLE_BOOKED: 0,
    FIELD_DOUBLE_BOOKED: 1,
    BACK_TO_BACK: 2,
  };
  return out.sort((a, b) => rank[a.kind] - rank[b.kind]);
}
