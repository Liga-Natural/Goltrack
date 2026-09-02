import { notFound } from "next/navigation";
import Link from "next/link";
import { Tournaments, Teams, Matches, Players, ApplicationMessages } from "@/lib/models";
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
import { FollowHeart, FollowBar, FieldMapCard } from "@/components/FollowTeam";
import { SponsorBanner } from "@/components/SponsorBanner";
import { moduleSettings } from "@/lib/actions";
import { Sponsors, MediaItems, MatchEvents } from "@/lib/models";
import { fairPlayTable } from "@/lib/modules";
import { getSportTheme } from "@/lib/sportTheme";
import { EVENT_STATUS_CLASS, EVENT_STATUS_LABEL, isEventStatus, mapsUrl } from "@/lib/broadcast";
import type { EventStatus } from "@/lib/broadcast";

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

  // The two things a spectator standing in a car park needs: is play on, and
  // has the organizer said anything in the last few hours.
  const status = (isEventStatus(tournament.eventStatus) ? tournament.eventStatus : "OPEN") as EventStatus;
  const urgent = await ApplicationMessages.latestUrgent(tournament.id);
  const directions = mapsUrl(tournament.location);

  // Optional modules. Each one is off until its organizer switches it on, so
  // an event that has configured nothing renders exactly as it did before any
  // of this existed — no empty sponsor strip, no orphan gallery link.
  const modules = await moduleSettings(tournament.id);
  const sponsors = modules.sponsorsEnabled ? await Sponsors.listByTournament(tournament.id, true) : [];
  const galleryCount = modules.mediaEnabled
    ? (await MediaItems.listByTournament(tournament.id, "APPROVED")).length
    : 0;
  const fairPlay = modules.fairPlayPublic
    ? fairPlayTable(teams, matches, await MatchEvents.listByTournament(tournament.id), modules).slice(0, 8)
    : [];

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
            <div key={t.id} className="relative">
              <TeamCard
                team={t}
                sport={tournament.sport}
                href={`/t/${tournament.slug}/teams/${t.id}`}
                standing={standingByTeamId.get(t.id)}
              />
              {/* Overlaid rather than placed inside TeamCard: the card is a
                  Link, and a button nested in an anchor is invalid markup
                  that swallows the click on some browsers. */}
              <div className="absolute top-3 right-3 z-10">
                <FollowHeart teamId={t.id} teamName={t.name} />
              </div>
            </div>
          ))}
        </div>
      ),
    },
    ...(matches.some((m) => m.field)
      ? [
          {
            key: "map",
            label: "Where to go",
            panel: <FieldMapCard matches={matches} teams={teams} />,
          },
        ]
      : []),
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
            {/* Points at /apply, the reviewed two-stage flow, not the older
                /register path that creates a team instantly. Left as-is this
                was a bypass around the manager gate and the organizer's
                acceptance step — the CTA everyone actually taps. */}
            <Link href={`/t/${tournament.slug}/apply`} className="btn-primary text-sm">
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
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className={`badge ${EVENT_STATUS_CLASS[status]} text-[10px]`}>{EVENT_STATUS_LABEL[status]}</span>
              {directions && (
                <a
                  href={directions}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="badge bg-neutralBadge text-ink2 border border-line text-[10px] hover:text-inkDisplay"
                >
                  Directions →
                </a>
              )}
              {/* The page already revalidates every 5 seconds; saying so is
                  what stops a parent pull-to-refreshing through a match. */}
              <span className="badge bg-neutralBadge text-ink2 border border-line text-[10px]">
                Live · refreshes automatically
              </span>
            </div>
            {tournament.eventStatusNote && status !== "OPEN" && (
              <p className="text-sm text-warning-500 mt-2">{tournament.eventStatusNote}</p>
            )}
          </div>

          {urgent && (
            // The in-app half of an urgent broadcast: the same message that
            // went out by email, pinned where anyone at the venue will see it.
            <div className="reveal card p-5 mb-6 border-warning-500/40 bg-warning-500/5">
              <div className="flex items-start gap-3">
                <span className="badge badge-danger text-[10px] shrink-0 mt-0.5">ALERT</span>
                <div className="min-w-0">
                  <p className="font-semibold text-inkDisplay">{urgent.subject}</p>
                  <p className="text-sm text-ink2 mt-1 whitespace-pre-line">{urgent.body}</p>
                </div>
              </div>
            </div>
          )}

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

          {modules.matchCenterEnabled && matches.some((m) => m.status === "LIVE") && (
            <div className="reveal card p-5 sm:p-6">
              <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-3">Live match centre</h2>
              <div className="flex flex-wrap gap-2">
                {matches
                  .filter((m) => m.status === "LIVE")
                  .map((m) => (
                    <Link
                      key={m.id}
                      href={`/live/${m.id}`}
                      className="text-xs px-4 py-2 rounded-full bg-surface2 text-inkDisplay clay-pill-raised"
                    >
                      {teams.find((t) => t.id === m.homeTeamId)?.name ?? "TBD"} v{" "}
                      {teams.find((t) => t.id === m.awayTeamId)?.name ?? "TBD"} →
                    </Link>
                  ))}
              </div>
            </div>
          )}

          {fairPlay.length > 0 && (
            <div className="reveal card p-5 sm:p-6">
              <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-3">Fair-play table</h2>
              <div className="divide-y divide-lineSoft">
                {fairPlay.map((row) => (
                  <div key={row.team.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="text-sm text-inkDisplay truncate">{row.team.name}</span>
                    <span className="font-score text-xs text-ink2 shrink-0">
                      {row.yellows}Y · {row.reds}R · {row.perMatch}/match
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-ink3 mt-2">
                Lower is better. Counted from cards recorded by the referees at this event.
              </p>
            </div>
          )}

          {galleryCount > 0 && (
            <Link href={`/media/${tournament.slug}`} className="reveal card-interactive p-5 sm:p-6 flex items-center justify-between gap-3">
              <span>
                <span className="block text-sm font-semibold text-inkDisplay">Photos from this event</span>
                <span className="block text-[11px] text-ink3 mt-0.5">{galleryCount} approved</span>
              </span>
              <span className="text-ink2">→</span>
            </Link>
          )}

          <SponsorBanner sponsors={sponsors} />

          <FollowBar matches={matches} teams={teams} />

          {matches.length === 0 && (
            <div className="card p-10 text-center text-black/50">Schedule hasn&apos;t been published yet — check back soon.</div>
          )}
        </div>
      </div>
    </main>
  );
}
