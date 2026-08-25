import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Tournaments, Teams, Matches, Referees } from "@/lib/models";
import { TournamentTabs } from "@/components/TournamentTabs";
import { MatchStatusBadge } from "@/components/MatchStatusBadge";
import { ScoreForm } from "@/components/ScoreForm";

export default async function ScoresPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const tournament = Tournaments.byId(params.id);
  if (!tournament || tournament.ownerId !== user.id) notFound();

  const teams = Teams.listByTournament(tournament.id);
  const matches = Matches.listByTournament(tournament.id);
  const referees = Referees.listByTournament(tournament.id);
  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const refsById = new Map(referees.map((r) => [r.id, r]));

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">{tournament.name}</h1>
      <TournamentTabs tournamentId={tournament.id} />

      {matches.length === 0 ? (
        <div className="card p-8 text-center text-white/50">Generate a schedule first from the Overview tab.</div>
      ) : (
        <div className="space-y-2">
          {matches.map((m) => (
            <div key={m.id} className="card p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-white/40 mb-0.5">
                  {m.round} · {m.field} {m.refereeId && refsById.has(m.refereeId) ? `· Ref: ${refsById.get(m.refereeId)!.name}` : ""}
                </p>
                <p className="font-medium">
                  {teamsById.get(m.homeTeamId || "")?.name || m.homeLabel || "TBD"}
                  <span className="text-white/30 mx-2">vs</span>
                  {teamsById.get(m.awayTeamId || "")?.name || m.awayLabel || "TBD"}
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
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
