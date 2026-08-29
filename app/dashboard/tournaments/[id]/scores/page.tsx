import { Tournaments, Teams, Matches, Referees, Players } from "@/lib/models";
import { ScoreForm } from "@/components/ScoreForm";
import { TeamInline } from "@/components/TeamInline";

export default async function ScoresPage({ params }: { params: { id: string } }) {
  const tournament = (await Tournaments.byId(params.id))!;
  const teams = await Teams.listByTournament(tournament.id);
  const matches = await Matches.listByTournament(tournament.id);
  const referees = await Referees.listByTournament(tournament.id);
  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const refsById = new Map(referees.map((r) => [r.id, r]));
  const playersByTeamEntries = await Promise.all(teams.map(async (t) => [t.id, await Players.listByTeam(t.id)] as const));
  const playersByTeam = new Map(playersByTeamEntries);

  return (
    <div>
      {matches.length === 0 ? (
        <div className="card p-8 text-center text-black/50">Generate a schedule first from the Overview tab.</div>
      ) : (
        // One card holding hairline-divided rows, rather than a stack of
        // separately-floating cards each casting its own shadow — a list of
        // six shadowed boxes was most of why this screen read as "busy".
        // The container floats; the rows inside it are just rows.
        <div className="card overflow-hidden">
          {matches.map((m) => (
            <div
              key={m.id}
              className={`grid gap-3 px-5 py-4 border-b border-lineSoft last:border-b-0 sm:grid-cols-[1fr_auto] sm:items-center ${
                m.status === "LIVE" ? "border-l-4 border-l-volt-400" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="text-xs text-ink2 font-medium mb-0.5">
                  {m.round} · {m.field} {m.refereeId && refsById.has(m.refereeId) ? `· Ref: ${refsById.get(m.refereeId)!.name}` : ""}
                </p>
                <p className="font-semibold flex items-center flex-wrap gap-x-1">
                  <TeamInline team={teamsById.get(m.homeTeamId || "")} sport={tournament.sport} fallback={m.homeLabel || "TBD"} />
                  <span className="text-ink3 mx-1 font-normal">vs</span>
                  <TeamInline team={teamsById.get(m.awayTeamId || "")} sport={tournament.sport} fallback={m.awayLabel || "TBD"} />
                </p>
              </div>
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
          ))}
        </div>
      )}
    </div>
  );
}
