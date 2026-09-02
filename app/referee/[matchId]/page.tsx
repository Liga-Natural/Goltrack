import { notFound, redirect } from "next/navigation";
import { Matches, Teams, Tournaments, Players, MatchEvents, MatchReports, Referees } from "@/lib/models";
import { getCurrentUser } from "@/lib/auth";
import { RefereeMatchday } from "@/components/RefereeMatchday";
import type { RosterEntry } from "@/components/RefereeMatchday";
import { eligibilityFor } from "@/lib/playerStats";
import { Logo } from "@/components/Logo";
import { TournamentStaff } from "@/lib/models";

// Deliberately outside the dashboard shell: the referee opens this on a
// phone at the touchline, so it gets no sidebar, no breadcrumb and no nav —
// one screen, thumb-sized targets, nothing else to tap by accident.
export const dynamic = "force-dynamic";

export default async function RefereeMatchPage({ params }: { params: { matchId: string } }) {
  const match = await Matches.byId(params.matchId);
  if (!match) notFound();

  const [user, tournament, home, away] = await Promise.all([
    getCurrentUser(),
    Tournaments.byId(match.tournamentId),
    match.homeTeamId ? Teams.byId(match.homeTeamId) : Promise.resolve(undefined),
    match.awayTeamId ? Teams.byId(match.awayTeamId) : Promise.resolve(undefined),
  ]);
  if (!tournament) notFound();

  // This page writes results, so it is gated the same way the actions behind
  // it are — the shared PIN this screen used to rely on could not tell one
  // official from another, and could not stop anyone who learned it.
  if (!user) redirect(`/login?next=/referee/${params.matchId}`);
  const myRefereeRows = await Referees.listByUserId(user.id);
  const permitted =
    tournament.ownerId === user.id ||
    user.role === "ADMIN" ||
    (await TournamentStaff.isAssigned(tournament.id, user.id)) ||
    (match.refereeId != null && myRefereeRows.some((r) => r.id === match.refereeId));

  if (!permitted) {
    return (
      <main className="min-h-screen px-4 py-16">
        <div className="max-w-sm mx-auto text-center card p-6">
          <h1 className="text-lg font-extrabold text-inkDisplay mb-2">Not your match</h1>
          <p className="text-sm text-ink2">
            This scorepad is open to the official assigned to this match, and to the organizer running the event. Ask
            the assignor to put you on it.
          </p>
        </div>
      </main>
    );
  }

  const [homePlayers, awayPlayers, events, report] = await Promise.all([
    home ? Players.listByTeam(home.id) : Promise.resolve([]),
    away ? Players.listByTeam(away.id) : Promise.resolve([]),
    MatchEvents.listByMatch(match.id),
    MatchReports.byMatch(match.id),
  ]);

  // Eligibility is read across the whole tournament, not just this match: a
  // red card picked up in an earlier round is exactly the one a referee needs
  // flagged at this kick-off.
  const tournamentEvents = await MatchEvents.listByTournament(tournament.id);
  const byPlayer = new Map<string, typeof tournamentEvents>();
  for (const e of tournamentEvents) {
    if (!e.playerId) continue;
    byPlayer.set(e.playerId, [...(byPlayer.get(e.playerId) ?? []), e]);
  }
  const toRoster = (list: typeof homePlayers): RosterEntry[] =>
    list.map((p) => ({
      id: p.id,
      name: p.name,
      jerseyNumber: p.jerseyNumber,
      suspended: eligibilityFor(byPlayer.get(p.id) ?? []).status === "SUSPENDED",
    }));

  const meta = [tournament.name, match.round, match.field].filter(Boolean).join(" · ");

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="max-w-sm mx-auto mb-4 flex justify-center">
        <Logo wordmarkClassName="text-lg" />
      </div>
      <p className="max-w-sm mx-auto text-center text-[11px] text-ink3 mb-5">{meta}</p>
      <RefereeMatchday
        matchId={match.id}
        homeName={home?.name || match.homeLabel || "Home"}
        awayName={away?.name || match.awayLabel || "Away"}
        homeTeamId={match.homeTeamId}
        awayTeamId={match.awayTeamId}
        homeRoster={toRoster(homePlayers)}
        awayRoster={toRoster(awayPlayers)}
        events={events}
        playerNames={Object.fromEntries([...homePlayers, ...awayPlayers].map((p) => [p.id, p.name]))}
        initialHome={match.homeScore ?? 0}
        initialAway={match.awayScore ?? 0}
        report={
          report
            ? {
                homeScore: report.homeScore,
                awayScore: report.awayScore,
                notes: report.notes,
                submittedAt: report.submittedAt,
              }
            : null
        }
        refereeName={user.name}
      />
    </main>
  );
}
