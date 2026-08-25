import { notFound } from "next/navigation";
import Link from "next/link";
import { Tournaments, Teams, Matches } from "@/lib/models";
import { computeStandings, groupNames } from "@/lib/standings";
import { StandingsTable } from "@/components/StandingsTable";
import { BracketView } from "@/components/BracketView";
import { MatchStatusBadge } from "@/components/MatchStatusBadge";
import { Logo } from "@/components/Logo";

export const revalidate = 5;

export default async function PublicTournamentPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { paid?: string };
}) {
  const tournament = Tournaments.bySlug(params.slug);
  if (!tournament) notFound();

  const teams = Teams.listByTournament(tournament.id);
  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const matches = Matches.listByTournament(tournament.id);
  const groupMatches = matches.filter((m) => m.stage === "GROUP");
  const knockoutMatches = matches.filter((m) => m.stage === "KNOCKOUT");
  const groups = groupNames(teams);
  const liveMatches = matches.filter((m) => m.status === "LIVE");

  return (
    <main className="min-h-screen">
      <header className="border-b border-white/5">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <Link href={`/t/${tournament.slug}/register`} className="btn-primary text-sm">
            Register a team
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
        {searchParams.paid && (
          <div className="mb-6 rounded-xl bg-pitch-400/10 border border-pitch-400/30 text-pitch-400 px-4 py-3 text-sm">
            Registration received — you&apos;re all set. Bring your player passports (below) on match day for check-in.
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-semibold">{tournament.name}</h1>
          <p className="text-white/50 mt-1">
            {tournament.sport} · {new Date(tournament.startDate).toLocaleDateString()} –{" "}
            {new Date(tournament.endDate).toLocaleDateString()}
            {tournament.location ? ` · ${tournament.location}` : ""}
          </p>
        </div>

        {liveMatches.length > 0 && (
          <div className="card p-5 mb-8 border-volt-400/30">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <span className="text-volt-400">● LIVE NOW</span>
            </h2>
            <div className="space-y-2">
              {liveMatches.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <span>
                    {teamsById.get(m.homeTeamId || "")?.name} vs {teamsById.get(m.awayTeamId || "")?.name}
                  </span>
                  <span className="font-mono font-semibold">{m.homeScore} - {m.awayScore}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {groups.length > 0 && groupMatches.length > 0 && (
          <section className="card p-6 mb-8">
            <h2 className="font-semibold mb-4">Standings</h2>
            <div className="grid sm:grid-cols-2 gap-8">
              {groups.map((g) => (
                <StandingsTable key={g} rows={computeStandings(teams, matches, g)} title={`Group ${g}`} />
              ))}
            </div>
          </section>
        )}

        {groupMatches.length > 0 && (
          <section className="card p-6 mb-8">
            <h2 className="font-semibold mb-4">Schedule & results</h2>
            <div className="space-y-2">
              {groupMatches.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-sm border-b border-white/5 pb-2">
                  <div>
                    <span className="text-white/40 text-xs mr-2">{m.round}</span>
                    {teamsById.get(m.homeTeamId || "")?.name} vs {teamsById.get(m.awayTeamId || "")?.name}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-white/40 text-xs hidden sm:inline">{m.field}</span>
                    <span className="font-mono">{m.homeScore ?? "-"} : {m.awayScore ?? "-"}</span>
                    <MatchStatusBadge status={m.status} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {knockoutMatches.length > 0 && (
          <section className="card p-6">
            <h2 className="font-semibold mb-4">Knockout bracket</h2>
            <BracketView matches={knockoutMatches} teams={teams} />
          </section>
        )}

        {matches.length === 0 && (
          <div className="card p-10 text-center text-white/50">Schedule hasn&apos;t been published yet — check back soon.</div>
        )}
      </div>
    </main>
  );
}
