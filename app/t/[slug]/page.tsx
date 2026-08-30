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
import { FixtureList } from "@/components/FixtureList";
import { TabPanel } from "@/components/TabPanel";
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

  const upcoming = matches.filter((m) => m.status === "SCHEDULED");
  const finished = matches.filter((m) => m.status === "FINAL");
  const motmNames = new Map(
    matches
      .filter((m) => m.motmPlayerId && motmPlayers.get(m.motmPlayerId)?.name)
      .map((m) => [m.id, motmPlayers.get(m.motmPlayerId as string)!.name as string])
  );

  const tabs = [
    ...(groups.length > 0 && groupMatches.length > 0
      ? [
          {
            key: "standings",
            label: "Standings",
            panel: (
              <div className="grid lg:grid-cols-2 gap-8">
                {groups.map((g) => (
                  <StandingsTable key={g} rows={computeStandings(teams, matches, g)} title={`Group ${g}`} sport={tournament.sport} />
                ))}
              </div>
            ),
          },
        ]
      : []),
    {
      key: "schedule",
      label: "Schedule",
      count: upcoming.length,
      panel: (
        <FixtureList
          matches={upcoming}
          teamsById={teamsById}
          sport={tournament.sport}
          emptyLabel="No upcoming fixtures right now."
        />
      ),
    },
    {
      key: "results",
      label: "Results",
      count: finished.length,
      panel: (
        <FixtureList
          matches={finished}
          teamsById={teamsById}
          sport={tournament.sport}
          motmNames={motmNames}
          emptyLabel="No results yet — check back after the first whistle."
        />
      ),
    },
    {
      key: "teams",
      label: "Teams",
      count: teams.length,
      panel: (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {teams.map((t) => (
            <TeamCard
              key={t.id}
              team={t}
              sport={tournament.sport}
              href={`/t/${tournament.slug}/teams/${t.id}`}
              standing={standingByTeamId.get(t.id)}
            />
          ))}
        </div>
      ),
    },
    ...(knockoutMatches.length > 0
      ? [
          {
            key: "bracket",
            label: "Bracket",
            panel: <BracketView matches={knockoutMatches} teams={teams} sport={tournament.sport} />,
          },
        ]
      : []),
  ];

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-line bg-white/40 backdrop-blur-xl">
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
            {/* Badge below the title rather than inline — a three-line
                tournament name on a phone left it floating in the gap beside
                the last line, overlapping the heading. */}
            <h1 className="text-display-sm mb-2.5">{tournament.name}</h1>
            <div className="flex flex-wrap items-center gap-2">
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
                  <div key={m.id} className="flex items-center justify-between text-sm border-l-4 border-volt-400 pl-3">
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

          {/* One tabbed panel replacing four stacked sections. The page used
              to be Teams, then Standings, then Schedule, then Bracket, all
              expanded at once — on a phone that is roughly six screens of
              scrolling before you reach a result, and the thing most
              visitors open the page for (the score) was the furthest down.
              Same data, one tap each. */}
          <div className="reveal card p-5 sm:p-6">
            <TabPanel tabs={tabs} />
          </div>

          {matches.length === 0 && (
            <div className="card p-10 text-center text-black/50">Schedule hasn&apos;t been published yet — check back soon.</div>
          )}
        </div>
      </div>
    </main>
  );
}
