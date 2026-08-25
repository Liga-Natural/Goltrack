import { Match, Team } from "@/lib/models";

function teamLabel(match: Match, side: "home" | "away", teamsById: Map<string, Team>) {
  const id = side === "home" ? match.homeTeamId : match.awayTeamId;
  const label = side === "home" ? match.homeLabel : match.awayLabel;
  if (id && teamsById.has(id)) return teamsById.get(id)!.name;
  return label || "TBD";
}

export function BracketView({ matches, teams }: { matches: Match[]; teams: Team[] }) {
  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const rounds = new Map<string, Match[]>();
  for (const m of matches) {
    if (!rounds.has(m.round)) rounds.set(m.round, []);
    rounds.get(m.round)!.push(m);
  }
  const orderedRounds = Array.from(rounds.entries()).sort((a, b) => a[1][0].orderIndex - b[1][0].orderIndex);

  if (orderedRounds.length === 0) {
    return <p className="text-white/40 text-sm">No knockout bracket yet.</p>;
  }

  return (
    <div className="flex gap-6 overflow-x-auto pb-4">
      {orderedRounds.map(([roundName, roundMatches]) => (
        <div key={roundName} className="flex flex-col justify-around gap-4 min-w-[220px]">
          <h4 className="text-xs uppercase tracking-wide text-white/40 text-center mb-1">{roundName}</h4>
          {roundMatches.map((m) => (
            <div key={m.id} className="card p-3">
              <div className={`flex items-center justify-between text-sm py-1 ${m.status === "FINAL" && (m.homeScore ?? 0) > (m.awayScore ?? 0) ? "font-semibold text-pitch-400" : ""}`}>
                <span>{teamLabel(m, "home", teamsById)}</span>
                <span>{m.homeScore ?? "-"}</span>
              </div>
              <div className={`flex items-center justify-between text-sm py-1 border-t border-white/5 ${m.status === "FINAL" && (m.awayScore ?? 0) > (m.homeScore ?? 0) ? "font-semibold text-pitch-400" : ""}`}>
                <span>{teamLabel(m, "away", teamsById)}</span>
                <span>{m.awayScore ?? "-"}</span>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
