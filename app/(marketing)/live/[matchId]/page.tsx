import { notFound } from "next/navigation";
import Link from "next/link";
import { Matches, Teams, Tournaments, MatchEvents, Players, Sponsors } from "@/lib/models";
import { moduleSettings } from "@/lib/actions";
import { timeline, EVENT_GLYPH } from "@/lib/modules";
import { TeamBadge } from "@/components/TeamBadge";
import { SponsorBanner } from "@/components/SponsorBanner";
import { VenueMap } from "@/components/VenueMap";
import { Logo } from "@/components/Logo";

// Live, so it refreshes itself rather than asking a parent on the touchline
// to pull down. Five seconds is the same cadence the spectator page uses.
export const revalidate = 5;

export default async function LiveMatchPage({ params }: { params: { matchId: string } }) {
  const match = await Matches.byId(params.matchId);
  if (!match) notFound();

  // The organizer's switch is the gate. With the module off this route is
  // indistinguishable from a match that does not exist — which is the point:
  // an event that has not opted in has no public live tracker to find.
  const settings = await moduleSettings(match.tournamentId);
  if (!settings.matchCenterEnabled) notFound();

  const [tournament, teams, events] = await Promise.all([
    Tournaments.byId(match.tournamentId),
    Teams.listByTournament(match.tournamentId),
    MatchEvents.listByMatch(match.id),
  ]);
  if (!tournament) notFound();

  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const home = match.homeTeamId ? teamsById.get(match.homeTeamId) : undefined;
  const away = match.awayTeamId ? teamsById.get(match.awayTeamId) : undefined;

  // Player names for the feed, from the two squads only.
  const rosters = await Promise.all(
    [home?.id, away?.id].filter(Boolean).map((id) => Players.listByTeam(id as string))
  );
  const playerNames = new Map(rosters.flat().map((p) => [p.id, p.name]));

  const sponsors = settings.sponsorsEnabled ? await Sponsors.listByTournament(tournament.id, true) : [];
  const feed = timeline(events);

  const statusClass =
    match.status === "LIVE" ? "badge-live text-[10px]" : match.status === "FINAL" ? "badge text-[10px]" : "badge badge-pending text-[10px]";

  return (
    <main className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <Link href="/">
            <Logo />
          </Link>
          <Link href={`/t/${tournament.slug}`} className="text-sm text-ink2 hover:text-inkDisplay transition-colors inline-flex items-center min-h-12">
            {tournament.name} →
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
        <div className="card mesh p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
            <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold">
              {match.stage === "GROUP" && match.groupName ? `Group ${match.groupName}` : match.round}
              {match.field ? ` · ${match.field}` : ""}
            </span>
            <span className={statusClass}>{match.status}</span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0 flex items-center gap-3">
              <TeamBadge
                id={home?.id ?? ""}
                name={home?.name ?? "TBD"}
                hasCrest={home?.hasCrest}
                crestUpdatedAt={home?.crestUpdatedAt}
                logoUrl={home?.logoUrl}
                sport={tournament.sport}
              />
              <span className="text-base font-semibold text-inkDisplay truncate">{home?.name ?? "TBD"}</span>
            </div>
            <span className="font-score text-4xl text-inkDisplay shrink-0">
              {match.homeScore ?? 0} – {match.awayScore ?? 0}
            </span>
            <div className="flex-1 min-w-0 flex items-center gap-3 justify-end">
              <span className="text-base font-semibold text-inkDisplay truncate text-right">{away?.name ?? "TBD"}</span>
              <TeamBadge
                id={away?.id ?? ""}
                name={away?.name ?? "TBD"}
                hasCrest={away?.hasCrest}
                crestUpdatedAt={away?.crestUpdatedAt}
                logoUrl={away?.logoUrl}
                sport={tournament.sport}
              />
            </div>
          </div>

          <p className="text-[11px] text-ink3 mt-5">
            {match.status === "LIVE"
              ? "Refreshes on its own every few seconds. The score is whatever the referee has entered from the touchline — there is no separate match clock running here."
              : match.status === "FINAL"
                ? "Final, from the signed match report."
                : "Not kicked off yet."}
          </p>
        </div>

        <section className="card p-5 sm:p-6">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-4">Match feed</h2>
          {feed.length === 0 ? (
            <p className="text-sm text-ink2 py-6 text-center">
              Nothing recorded yet. Goals and cards appear here as the referee enters them.
            </p>
          ) : (
            <ol className="space-y-2">
              {feed.map((e) => (
                <li key={e.id} className="flex items-center gap-3 rounded-2xl bg-surface2 px-3.5 py-2.5">
                  <span className="font-score text-sm text-ink2 w-10 shrink-0">
                    {e.minute != null ? `${e.minute}'` : "—"}
                  </span>
                  <span className="text-base shrink-0" aria-hidden>
                    {EVENT_GLYPH[e.type] ?? "•"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-inkDisplay truncate">
                      {e.playerId ? playerNames.get(e.playerId) ?? "Unknown player" : e.type}
                    </span>
                    <span className="block text-[11px] text-ink3 truncate">
                      {e.teamId ? teamsById.get(e.teamId)?.name ?? "" : ""}
                      {e.note ? ` · ${e.note}` : ""}
                    </span>
                  </span>
                  <span className="badge bg-neutralBadge text-ink2 text-[10px] shrink-0">{e.type}</span>
                </li>
              ))}
            </ol>
          )}
          <p className="text-[11px] text-ink3 mt-3">
            Substitutions are not shown: Jogo records goals, assists and cards on a match, and there is no
            substitution event to draw from, so listing one would be invented.
          </p>
        </section>

        <VenueMap pins={settings.venuePins} address={settings.venueAddress ?? tournament.location} />
        <SponsorBanner sponsors={sponsors} />
      </div>
    </main>
  );
}
