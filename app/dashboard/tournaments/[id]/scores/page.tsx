import { Tournaments, Teams, Matches, Referees, Players } from "@/lib/models";
import { MatchStatusBadge } from "@/components/MatchStatusBadge";
import { ScoreForm } from "@/components/ScoreForm";
import { TeamInline } from "@/components/TeamInline";

export default async function ScoresPage({ params }: { params: { id: string } }) {
  const tournament = Tournaments.byId(params.id)!;
  const teams = Teams.listByTournament(tournament.id);
  const matches = Matches.listByTournament(tournament.id);
  const referees = Referees.listByTournament(tournament.id);
  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const refsById = new Map(referees.map((r) => [r.id, r]));
  const playersByTeam = new Map(teams.map((t) => [t.id, Players.listByTeam(t.id)]));

  return (
    <div>
      {matches.length === 0 ? (
        <div className="card p-8 text-center text-black/50">Generate a schedule first from the Overview tab.</div>
      ) : (
        <div className="space-y-2">
          {matches.map((m) => (
            <div key={m.id} className="card p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-black/40 mb-0.5">
                  {m.round} · {m.field} {m.refereeId && refsById.has(m.refereeId) ? `· Ref: ${refsById.get(m.refereeId)!.name}` : ""}
                </p>
                <p className="font-medium flex items-center flex-wrap gap-x-1">
                  <TeamInline team={teamsById.get(m.homeTeamId || "")} sport={tournament.sport} fallback={m.homeLabel || "TBD"} />
                  <span className="text-black/30 mx-1">vs</span>
                  <TeamInline team={teamsById.get(m.awayTeamId || "")} sport={tournament.sport} fallback={m.awayLabel || "TBD"} />
                </p>
              </div>
              <div className="flex items-center gap-3">
                <MatchStatusBadge status={m.status} />
                <ScoreForm
                  tournamentId={tournament.id}
                  matchId={m.id}
                  initialHome={m.homeScore}
                  initialAway={m.awayScore}
                  initialStatus={m.status}
                  initialMotm={m.motmPlayerId}
                  eligiblePlayers={[...(playersByTeam.get(m.homeTeamId || "") || []), ...(playersByTeam.get(m.awayTeamId || "") || [])]}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
