import { Tournaments, Teams, Matches } from "@/lib/models";
import { StandingsTable } from "@/components/StandingsTable";
import { BracketView } from "@/components/BracketView";
import { MatchStatusBadge } from "@/components/MatchStatusBadge";
import { computeStandings, groupNames } from "@/lib/standings";

export default async function SchedulePage({ params }: { params: { id: string } }) {
  const tournament = Tournaments.byId(params.id)!;
  const teams = Teams.listByTournament(tournament.id);
  const matches = Matches.listByTournament(tournament.id);
  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const groupMatches = matches.filter((m) => m.stage === "GROUP");
  const knockoutMatches = matches.filter((m) => m.stage === "KNOCKOUT");
  const groups = groupNames(teams);

  return (
    <div>
      {matches.length === 0 && (
        <div className="card p-8 text-center text-black/50">
          No schedule yet — go to Overview and click &quot;Generate schedule&quot;.
        </div>
      )}

      {groups.length > 0 && groupMatches.length > 0 && (
        <div className="card p-6 mb-6">
          <h2 className="font-semibold mb-4">Group standings</h2>
          <div className="grid sm:grid-cols-2 gap-8">
            {groups.map((g) => (
              <StandingsTable key={g} rows={computeStandings(teams, matches, g)} title={`Group ${g}`} />
            ))}
          </div>
        </div>
      )}

      {groupMatches.length > 0 && (
        <div className="card p-6 mb-6">
          <h2 className="font-semibold mb-4">Group stage fixtures</h2>
          <div className="space-y-2">
            {groupMatches.map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm border-b border-black/5 pb-2">
                <div className="flex-1">
                  <span className="text-black/40 text-xs mr-2">{m.round}</span>
                  {teamsById.get(m.homeTeamId || "")?.name || "TBD"} vs {teamsById.get(m.awayTeamId || "")?.name || "TBD"}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-black/40 text-xs">{m.field}</span>
                  <span className="font-mono">{m.homeScore ?? "-"} : {m.awayScore ?? "-"}</span>
                  <MatchStatusBadge status={m.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {knockoutMatches.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold mb-4">Knockout bracket</h2>
          <BracketView matches={knockoutMatches} teams={teams} />
        </div>
      )}
    </div>
  );
}
