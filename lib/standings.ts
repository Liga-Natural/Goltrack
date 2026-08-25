import { Match, Team } from "./models";

export interface StandingRow {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

export function computeStandings(teams: Team[], matches: Match[], groupName?: string | null): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  for (const team of teams) {
    if (groupName !== undefined && team.groupName !== groupName) continue;
    rows.set(team.id, {
      team,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0,
    });
  }

  for (const m of matches) {
    if (m.stage !== "GROUP") continue;
    if (groupName !== undefined && m.groupName !== groupName) continue;
    if (m.homeScore === null || m.awayScore === null || !m.homeTeamId || !m.awayTeamId) continue;
    const home = rows.get(m.homeTeamId);
    const away = rows.get(m.awayTeamId);
    if (!home || !away) continue;

    home.played++;
    away.played++;
    home.goalsFor += m.homeScore;
    home.goalsAgainst += m.awayScore;
    away.goalsFor += m.awayScore;
    away.goalsAgainst += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.won++;
      away.lost++;
      home.points += 3;
    } else if (m.homeScore < m.awayScore) {
      away.won++;
      home.lost++;
      away.points += 3;
    } else {
      home.drawn++;
      away.drawn++;
      home.points += 1;
      away.points += 1;
    }
  }

  for (const row of rows.values()) {
    row.goalDiff = row.goalsFor - row.goalsAgainst;
  }

  return Array.from(rows.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.team.name.localeCompare(b.team.name);
  });
}

export function groupNames(teams: Team[]): string[] {
  const set = new Set<string>();
  for (const t of teams) if (t.groupName) set.add(t.groupName);
  return Array.from(set).sort();
}
