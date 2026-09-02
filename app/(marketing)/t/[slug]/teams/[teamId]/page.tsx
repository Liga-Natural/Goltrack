import { notFound } from "next/navigation";
import Link from "next/link";
import { Tournaments, Teams, Players, Matches } from "@/lib/models";
import { computeStandings } from "@/lib/standings";
import { MatchStatusBadge } from "@/components/MatchStatusBadge";
import { Logo } from "@/components/Logo";
import { TeamBadge } from "@/components/TeamBadge";
import { getSportTheme } from "@/lib/sportTheme";

export const revalidate = 5;

export default async function PublicTeamPage({ params }: { params: { slug: string; teamId: string } }) {
  const tournament = await Tournaments.bySlug(params.slug);
  if (!tournament) notFound();
  const team = await Teams.byId(params.teamId);
  if (!team || team.tournamentId !== tournament.id || !team.name) notFound();

  const players = await Players.listByTeam(team.id);
  const teamMatches = await Matches.listByTeam(team.id);
  const allTeamsRaw = await Teams.listByTournament(tournament.id);
  const allTeams = allTeamsRaw.filter((t) => t.name);
  const teamsById = new Map(allTeams.map((t) => [t.id, t]));
  const allMatches = await Matches.listByTournament(tournament.id);
  const standingsRow = computeStandings(allTeams, allMatches, team.groupName).find((r) => r.team.id === team.id);
  const motmCount = allMatches.filter((m) => m.motmPlayerId && players.some((p) => p.id === m.motmPlayerId)).length;

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-line bg-white/40 backdrop-blur-xl">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <Link href={`/t/${tournament.slug}`} className="btn-ghost text-sm">
            ← {tournament.name}
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
        <div className="mb-8 flex items-center gap-4">
          <TeamBadge id={team.id} name={team.name} hasCrest={team.hasCrest} crestUpdatedAt={team.crestUpdatedAt} logoUrl={team.logoUrl} sport={tournament.sport} size="lg" />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-display-sm">{team.name}</h1>
              <span className={`badge ${getSportTheme(tournament.sport).soft}`}>{getSportTheme(tournament.sport).emoji}</span>
            </div>
            <p className="text-black/50 mt-1">
              {tournament.name}
              {team.groupName ? ` · Group ${team.groupName}` : ""} · Captain {team.contactName}
            </p>
          </div>
        </div>

        {standingsRow && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-8">
            {[
              ["Played", standingsRow.played],
              ["W-D-L", `${standingsRow.won}-${standingsRow.drawn}-${standingsRow.lost}`],
              ["Goal diff", standingsRow.goalDiff > 0 ? `+${standingsRow.goalDiff}` : standingsRow.goalDiff],
              ["Points", standingsRow.points],
              ["MOTM awards", motmCount],
            ].map(([label, value]) => (
              <div key={label as string} className="card-elevated p-4 text-center">
                <p className="text-xs uppercase tracking-wide text-black/40 mb-1">{label}</p>
                <p className="font-score text-2xl">{value}</p>
              </div>
            ))}
          </div>
        )}

        <section className="card p-6 mb-6">
          <h2 className="font-semibold mb-4">Roster</h2>
          {players.length === 0 ? (
            <p className="text-black/40 text-sm">No roster published yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {players.map((p) => (
                <Link
                  key={p.id}
                  href={`/passport/${p.id}`}
                  target="_blank"
                  className="flex items-center justify-between text-sm border-b border-black/5 pb-1.5 hover:text-pitch-600"
                >
                  <span>
                    {p.jerseyNumber && <span className="text-black/30 mr-2">#{p.jerseyNumber}</span>}
                    {p.name}
                  </span>
                  <span className="text-black/30 text-xs">passport →</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="card p-6">
          <h2 className="font-semibold mb-4">Results</h2>
          {teamMatches.length === 0 ? (
            <p className="text-black/40 text-sm">No matches played yet.</p>
          ) : (
            <div className="space-y-2">
              {teamMatches.map((m) => {
                const opponentId = m.homeTeamId === team.id ? m.awayTeamId : m.homeTeamId;
                const opponent = opponentId ? teamsById.get(opponentId)?.name : m.homeTeamId === team.id ? m.awayLabel : m.homeLabel;
                const isHome = m.homeTeamId === team.id;
                return (
                  <div key={m.id} className="flex items-center justify-between text-sm border-b border-black/5 pb-2">
                    <div>
                      <span className="text-black/40 text-xs mr-2">{m.round}</span>
                      {isHome ? "vs" : "@"} {opponent || "TBD"}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-score text-sm">
                        {m.homeScore ?? "-"} : {m.awayScore ?? "-"}
                      </span>
                      <MatchStatusBadge status={m.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
