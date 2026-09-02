import type { MatchEvent, PlayerMetric, Match } from "@/lib/models";

// Everything a player profile shows is derived here from match_events rows,
// never read from a running total stored on the player. A mistyped card gets
// deleted and the numbers simply stop counting it — no reconciliation step,
// and no way for a total to drift away from the incidents behind it.

export interface PlayerStats {
  appearances: number;
  goals: number;
  assists: number;
  yellows: number;
  reds: number;
}

export function statsForPlayer(events: MatchEvent[]): PlayerStats {
  const mine = events;
  return {
    // An appearance is a match this player has at least one recorded event in.
    // That undercounts a quiet game, and the UI labels it "matches with a
    // recorded event" rather than pretending it is a team-sheet appearance —
    // there is no lineup submission per match to count from.
    appearances: new Set(mine.map((e) => e.matchId)).size,
    goals: mine.filter((e) => e.type === "GOAL").length,
    assists: mine.filter((e) => e.type === "ASSIST").length,
    yellows: mine.filter((e) => e.type === "YELLOW").length,
    reds: mine.filter((e) => e.type === "RED").length,
  };
}

export interface Eligibility {
  status: "CLEARED" | "SUSPENDED";
  /** Unserved red cards — what keeps the player out. */
  outstandingReds: number;
  /** Yellows since the last red; leagues differ on accumulation thresholds. */
  yellows: number;
}

/**
 * A player is suspended while they hold a red card an organizer has not yet
 * marked as served.
 *
 * Jogo deliberately does not model accumulation ("two yellows in a season is
 * a match ban") — every league writes that rule differently, and guessing at
 * one would sit a player out who was eligible, or clear one who was not. The
 * yellow count is surfaced for a human to apply their own competition rules.
 */
export function eligibilityFor(events: MatchEvent[]): Eligibility {
  const outstandingReds = events.filter((e) => e.type === "RED" && !e.clearedAt).length;
  return {
    status: outstandingReds > 0 ? "SUSPENDED" : "CLEARED",
    outstandingReds,
    yellows: events.filter((e) => e.type === "YELLOW").length,
  };
}

// ── Athletic metrics ────────────────────────────────────────────────────────

export type MetricKey =
  | "sprint40Hundredths"
  | "verticalJumpHundredths"
  | "topSpeedHundredths"
  | "distanceHundredths"
  | "yoyoHundredths";

export const METRICS: {
  key: MetricKey;
  label: string;
  unit: string;
  /** Lower is better for a sprint time; higher for everything else. */
  lowerIsBetter?: boolean;
}[] = [
  { key: "sprint40Hundredths", label: "40-yard sprint", unit: "s", lowerIsBetter: true },
  { key: "verticalJumpHundredths", label: "Vertical jump", unit: "in" },
  { key: "topSpeedHundredths", label: "Top match speed", unit: "mph" },
  { key: "distanceHundredths", label: "Distance covered", unit: "mi" },
  { key: "yoyoHundredths", label: "Yo-Yo level", unit: "" },
];

export function formatMetric(value: number | null | undefined, unit: string): string {
  if (value == null) return "—";
  const n = (value / 100).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
  return unit ? `${n} ${unit}` : n;
}

export interface RadarPoint {
  key: MetricKey;
  label: string;
  unit: string;
  raw: number | null;
  /** 0–100 within the measured cohort, or null when there is nothing to compare. */
  score: number | null;
}

/**
 * Scores a player against the other players who were actually measured, not
 * against invented age-group norms.
 *
 * Publishing a benchmark ("a good U14 runs 5.4s") that nobody validated would
 * be the dishonest option: a parent reads a radar as a judgement, so the
 * comparison has to be one this app can stand behind. A cohort of its own
 * squad is exactly that, and the UI says how many players it covers.
 */
export function buildRadar(mine: PlayerMetric | undefined, cohort: PlayerMetric[]): RadarPoint[] {
  return METRICS.map(({ key, label, unit, lowerIsBetter }) => {
    const raw = mine?.[key] ?? null;
    const values = cohort.map((m) => m[key]).filter((v): v is number => v != null);
    if (raw == null || values.length < 2) {
      return { key, label, unit, raw, score: null };
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (max === min) return { key, label, unit, raw, score: 50 };
    const pct = ((raw - min) / (max - min)) * 100;
    return { key, label, unit, raw, score: Math.round(lowerIsBetter ? 100 - pct : pct) };
  });
}

/** Most recent measurement per player, which is what a cohort compares. */
export function latestPerPlayer(metrics: PlayerMetric[]): Map<string, PlayerMetric> {
  const out = new Map<string, PlayerMetric>();
  for (const m of [...metrics].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))) {
    out.set(m.playerId, m);
  }
  return out;
}

/** Matches a team is involved in, newest first — the fixtures a coach calls up for. */
export function upcomingForTeam(matches: Match[], teamId: string): Match[] {
  return matches
    .filter((m) => m.homeTeamId === teamId || m.awayTeamId === teamId)
    .sort((a, b) => (a.scheduledAt || "").localeCompare(b.scheduledAt || ""));
}
