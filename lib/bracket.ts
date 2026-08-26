import { Team, Match } from "./models";

// ---------- Group stage (round robin, "circle method") ----------
//
// Splits teams into N groups (snake distribution so groups are balanced),
// then generates a full round-robin within each group, spread across the
// available fields and 45-minute time slots starting from `startTime`.

export interface GeneratedMatch {
  stage: "GROUP" | "KNOCKOUT";
  round: string;
  groupName: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeLabel: string | null;
  awayLabel: string | null;
  field: string | null;
  scheduledAt: string | null;
  orderIndex: number;
}

function groupLabel(i: number): string {
  return String.fromCharCode(65 + i); // A, B, C...
}

export function assignGroups(teams: Team[], groupsCount: number): Record<string, Team[]> {
  const groups: Record<string, Team[]> = {};
  for (let i = 0; i < groupsCount; i++) groups[groupLabel(i)] = [];
  // Snake seeding across groups to balance sizes when team count isn't divisible.
  let dir = 1;
  let g = 0;
  for (const team of teams) {
    groups[groupLabel(g)].push(team);
    g += dir;
    if (g === groupsCount) {
      g = groupsCount - 1;
      dir = -1;
    } else if (g < 0) {
      g = 0;
      dir = 1;
    }
  }
  return groups;
}

function roundRobinPairs(teamIds: (string | null)[]): [string | null, string | null][][] {
  // Standard circle method. If odd count, a `null` bye slot is included.
  const ids = [...teamIds];
  if (ids.length % 2 !== 0) ids.push(null);
  const n = ids.length;
  const rounds: [string | null, string | null][][] = [];
  const arr = ids.slice(1);
  for (let r = 0; r < n - 1; r++) {
    const round: [string | null, string | null][] = [];
    const first = ids[0];
    const second = arr[(r) % arr.length];
    if (first !== null || second !== null) round.push([first, second]);
    for (let i = 1; i < n / 2; i++) {
      const a = arr[(r + i) % arr.length];
      const b = arr[(r - i + arr.length) % arr.length];
      round.push([a, b]);
    }
    rounds.push(round);
  }
  return rounds;
}

export function generateGroupStage(
  teams: Team[],
  opts: { groupsCount: number; fieldsCount: number; startTime: Date; slotMinutes?: number; surfaceWord?: string }
): GeneratedMatch[] {
  const slotMinutes = opts.slotMinutes ?? 45;
  const surfaceWord = opts.surfaceWord ?? "Field";
  const groups = assignGroups(teams, Math.max(1, opts.groupsCount));
  const matches: GeneratedMatch[] = [];
  let orderIndex = 0;

  // Interleave rounds across groups so all groups play concurrently.
  const groupRounds: Record<string, [string | null, string | null][][]> = {};
  let maxRounds = 0;
  for (const [gName, gTeams] of Object.entries(groups)) {
    if (gTeams.length < 2) continue;
    const rounds = roundRobinPairs(gTeams.map((t) => t.id));
    groupRounds[gName] = rounds;
    maxRounds = Math.max(maxRounds, rounds.length);
  }

  let fieldCursor = 0;
  let slotCursor = 0;
  const fields = Math.max(1, opts.fieldsCount);

  for (let r = 0; r < maxRounds; r++) {
    for (const [gName, rounds] of Object.entries(groupRounds)) {
      const round = rounds[r];
      if (!round) continue;
      for (const [home, away] of round) {
        if (home === null || away === null) continue; // bye
        const field = `${surfaceWord} ${((fieldCursor % fields) + 1)}`;
        const scheduledAt = new Date(opts.startTime.getTime() + slotCursor * slotMinutes * 60000);
        matches.push({
          stage: "GROUP",
          round: `Group ${gName} - Round ${r + 1}`,
          groupName: gName,
          homeTeamId: home,
          awayTeamId: away,
          homeLabel: null,
          awayLabel: null,
          field,
          scheduledAt: scheduledAt.toISOString(),
          orderIndex: orderIndex++,
        });
        fieldCursor++;
        if (fieldCursor % fields === 0) slotCursor++;
      }
    }
  }

  return matches;
}

export function generateRoundRobinOnly(
  teams: Team[],
  opts: { fieldsCount: number; startTime: Date; slotMinutes?: number; surfaceWord?: string }
): GeneratedMatch[] {
  return generateGroupStage(teams, { ...opts, groupsCount: 1 }).map((m) => ({ ...m, groupName: null, round: m.round.replace(/^Group A - /, "") }));
}

// ---------- Knockout bracket ----------
//
// Standard seeded single-elimination: 1 vs N, 2 vs N-1, etc. If the number
// of qualifiers isn't a power of two, top seeds receive byes into round two.

const ROUND_NAMES: Record<number, string> = {
  2: "Final",
  4: "Semifinal",
  8: "Quarterfinal",
  16: "Round of 16",
  32: "Round of 32",
};

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

export function generateKnockoutBracket(seededTeamIds: string[], startTime: Date, field = "Field 1"): GeneratedMatch[] {
  const size = nextPowerOfTwo(seededTeamIds.length);
  const byes = size - seededTeamIds.length;
  // Standard bracket seeding order for the given size.
  const seedOrder = standardSeedOrder(size);
  const slots: (string | null)[] = seedOrder.map((seed) => (seed <= seededTeamIds.length ? seededTeamIds[seed - 1] : null));

  const matches: GeneratedMatch[] = [];
  let orderIndex = 1000; // keep knockout after group matches when sorted
  let roundTeams = slots;
  let roundSize = size;

  while (roundSize >= 2) {
    const roundName = ROUND_NAMES[roundSize] || `Round of ${roundSize}`;
    const nextRoundTeams: (string | null)[] = [];
    for (let i = 0; i < roundTeams.length; i += 2) {
      const home = roundTeams[i];
      const away = roundTeams[i + 1];
      if (home !== null && away === null) {
        // bye — home advances automatically
        nextRoundTeams.push(home);
        continue;
      }
      if (home === null && away !== null) {
        nextRoundTeams.push(away);
        continue;
      }
      matches.push({
        stage: "KNOCKOUT",
        round: roundName,
        groupName: null,
        homeTeamId: home,
        awayTeamId: away,
        homeLabel: home ? null : "TBD",
        awayLabel: away ? null : "TBD",
        field,
        scheduledAt: startTime.toISOString(),
        orderIndex: orderIndex++,
      });
      nextRoundTeams.push(null); // winner TBD, filled in once scores are entered
    }
    roundTeams = nextRoundTeams;
    roundSize = roundSize / 2;
  }

  return matches;
}

function standardSeedOrder(size: number): number[] {
  // Recursive bracket seeding: 1,2 -> 1,2,3,4 -> ... ensures 1 meets 2 only in the final.
  let order = [1, 2];
  while (order.length < size) {
    const next: number[] = [];
    const total = order.length * 2 + 1;
    for (const seed of order) {
      next.push(seed, total - seed);
    }
    order = next;
  }
  return order;
}
