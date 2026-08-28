import { notFound } from "next/navigation";
import Link from "next/link";
import { Tournaments, Teams, Matches, Players } from "@/lib/models";
import { computeStandings, groupNames } from "@/lib/standings";
import { StandingsTable } from "@/components/StandingsTable";
import { BracketView } from "@/components/BracketView";
import { MatchStatusBadge } from "@/components/MatchStatusBadge";
import { Logo } from "@/components/Logo";
import { PitchPattern } from "@/components/PitchPattern";
import { CourtPattern } from "@/components/CourtPattern";
import { TeamCard } from "@/components/TeamCard";
import { TeamInline } from "@/components/TeamInline";
import { getSportTheme } from "@/lib/sportTheme";

export const revalidate = 5;

export default async function PublicTournamentPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { paid?: string };
}) {
  const tournament = await Tournaments.bySlug(params.slug);
  if (!tournament) notFound();

  const allTeams = await Teams.listByTournament(tournament.id);
  const teams = allTeams.filter((t) => t.name);
  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const matches = await Matches.listByTournament(tournament.id);
  const groupMatches = matches.filter((m) => m.stage === "GROUP");
  const knockoutMatches = matches.filter((m) => m.stage === "KNOCKOUT");
  const groups = groupNames(teams);
  const liveMatches = matches.filter((m) => m.status === "LIVE");
  const theme = getSportTheme(tournament.sport);
  const Pattern = tournament.sport === "Futsal" || tournament.sport === "Basketball" ? CourtPattern : PitchPattern;

  const motmPlayerIds = Array.from(new Set(matches.map((m) => m.motmPlayerId).filter(Boolean))) as string[];
  const motmPlayerRows = await Promise.all(motmPlayerIds.map((id) => Players.byId(id)));
  const motmPlayers = new Map(motmPlayerIds.map((id, i) => [id, motmPlayerRows[i]]));
  const overallStandings = computeStandings(teams, matches);
  const standingByTeamId = new Map(overallStandings.map((r) => [r.team.id, r]));

  return (
    <main className="min-h-screen">
      <header className="border-b border-black/5">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/tournaments" className="btn-ghost text-sm hidden sm:inline-flex">
              All tournaments
            </Link>
            <Link href={`/t/${tournament.slug}/register`} className="btn-primary text-sm">
              Register a team
            </Link>
          </div>
        </div>
      </header>

      <div className="relative overflow-hidden">
        <Pattern
          className="absolute -z-10 h-[360px] w-[360px] -right-16 -top-16"
          style={{ color: theme.hex, opacity: 0.07 }}
        />
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
          {searchParams.paid && (
            <div className="mb-6 rounded-xl bg-pitch-400/10 border border-pitch-400/30 text-pitch-600 px-4 py-3 text-sm">
              Registration received — you&apos;re all set. Bring your player passports (below) on match day for check-in.
            </div>
          )}

          <div className="mb-8">
            <div className="flex items-center gap-2.5 mb-1.5">
              <h1 className="text-display-sm">{tournament.name}</h1>
              <span className={`badge ${theme.soft}`}>
                {theme.emoji} {theme.label}
              </span>
            </div>
            <p className="text-black/50 mt-1">
              {new Date(tournament.startDate).toLocaleDateString()} –{" "}
              {new Date(tournament.endDate).toLocaleDateString()}
              {tournament.location ? ` · ${tournament.location}` : ""}
            </p>
          </div>

          {liveMatches.length > 0 && (
            <div className="reveal ticket-card rounded-2xl border border-volt-400/30 shadow-elevated mb-8" style={{ ["--ticket-cut" as any]: "52px" }}>
              <div className="rounded-t-2xl px-5 pt-5 pb-4">
                <h2 className="font-semibold flex items-center gap-2 text-volt-500">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-volt-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-volt-400" />
                  </span>
                  LIVE NOW
                </h2>
              </div>
              <div className="ticket-card__tear mx-2" style={{ ["--ticket-punch-bg" as any]: "rgb(var(--paper))" }} />
              <div className="space-y-2 px-5 pt-4 pb-5">
                {liveMatches.map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-sm border-l-4 border-pitch-400 pl-3">
                    <span className="flex items-center gap-2">
                      <TeamInline team={teamsById.get(m.homeTeamId || "")} sport={tournament.sport} />
                      <span className="text-black/30">vs</span>
                      <TeamInline team={teamsById.get(m.awayTeamId || "")} sport={tournament.sport} />
                    </span>
                    <span className="font-score score-flip text-base">
                      {m.homeScore} - {m.awayScore}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {teams.length > 0 && (
            <section className="mb-8">
              <h2 className="font-semibold mb-4">Teams</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {teams.map((t, i) => (
                  <div key={t.id} className="reveal" data-reveal-delay={Math.min(i % 6, 5) * 70}>
                    <TeamCard
                      team={t}
                      sport={tournament.sport}
                      href={`/t/${tournament.slug}/teams/${t.id}`}
                      standing={standingByTeamId.get(t.id)}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {groups.length > 0 && groupMatches.length > 0 && (
            <section className="reveal card p-6 mb-8">
              <h2 className="font-semibold mb-4">Standings</h2>
              {/* lg (not sm): two groups sharing a row at tablet widths left
                  each table squeezed to ~half the card width — nowhere near
                  enough for 9 columns, so GD/PTS ran off the visible edge.
                  Now each group gets the full card width until there's
                  actually room (1024px+) to split them side by side. */}
              <div className="grid lg:grid-cols-2 gap-8">
                {groups.map((g) => (
                  <StandingsTable key={g} rows={computeStandings(teams, matches, g)} title={`Group ${g}`} sport={tournament.sport} />
                ))}
              </div>
            </section>
          )}

          {groupMatches.length > 0 && (
            <section className="reveal card p-6 mb-8">
              <h2 className="font-semibold mb-4">Schedule & results</h2>
              <div className="space-y-2">
                {groupMatches.map((m) => {
                  const motm = m.motmPlayerId ? motmPlayers.get(m.motmPlayerId) : null;
                  return (
                    <div
                      key={m.id}
                      className={`border-b border-black/5 pb-2 ${m.status === "LIVE" ? "border-l-4 border-l-pitch-400 pl-3" : ""}`}
                    >
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-black/40 text-xs mr-2">{m.round}</span>
                          <TeamInline team={teamsById.get(m.homeTeamId || "")} sport={tournament.sport} />
                          <span className="mx-1.5 text-black/30">vs</span>
                          <TeamInline team={teamsById.get(m.awayTeamId || "")} sport={tournament.sport} />
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-black/40 text-xs hidden sm:inline">{m.field}</span>
                          <span className="font-score text-sm">
                            {m.homeScore ?? "-"} : {m.awayScore ?? "-"}
                          </span>
                          <MatchStatusBadge status={m.status} />
                        </div>
                      </div>
                      {motm && (
                        <p className="text-xs text-black/40 mt-1">
                          ⭐ Man of the match: <span className="text-black/60">{motm.name}</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {knockoutMatches.length > 0 && (
            <section className="reveal card p-6">
              <h2 className="font-semibold mb-4">Knockout bracket</h2>
              <BracketView matches={knockoutMatches} teams={teams} sport={tournament.sport} />
            </section>
          )}

          {matches.length === 0 && (
            <div className="card p-10 text-center text-black/50">Schedule hasn&apos;t been published yet — check back soon.</div>
          )}
        </div>
      </div>
    </main>
  );
}
