import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Teams,
  Players,
  Tournaments,
  Matches,
  MatchEvents,
  PlayerMetrics,
  Availability,
  Lineups,
} from "@/lib/models";
import { getCurrentUser } from "@/lib/auth";
import { CoachSquad } from "@/components/CoachSquad";
import type { SquadRow } from "@/components/CoachSquad";
import { TacticalBoard } from "@/components/TacticalBoard";
import { eligibilityFor, upcomingForTeam, latestPerPlayer } from "@/lib/playerStats";
import { formatDate } from "@/lib/invoices";
import { TeamBadge } from "@/components/TeamBadge";

export default async function CoachDashboardPage({
  searchParams,
}: {
  searchParams: { match?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // A coach here is whoever the team belongs to. An organizer opening this
  // lands on their own squad if they have one, and is told plainly if not,
  // rather than being shown an empty shell that looks broken.
  const team = await Teams.byUserId(user.id);
  if (!team) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16">
          <div className="card p-8 text-center">
            <h1 className="text-xl font-extrabold text-inkDisplay mb-2">No squad linked to this account</h1>
            <p className="text-sm text-ink2">
              This hub shows the team your account manages. Claim a team from a tournament&apos;s registration link,
              or ask the organizer to send you the team invite.
            </p>
            <Link href="/dashboard" className="btn-secondary text-sm inline-block mt-5">
              Back to dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const [tournament, players, teamEvents, metrics, matches] = await Promise.all([
    Tournaments.byId(team.tournamentId),
    Players.listByTeam(team.id),
    MatchEvents.listByTeam(team.id),
    PlayerMetrics.listByTeam(team.id),
    Matches.listByTournament(team.tournamentId),
  ]);

  const fixtures = upcomingForTeam(matches, team.id);
  const selected = fixtures.find((m) => m.id === searchParams.match) ?? fixtures[0] ?? null;
  const [availability, lineup] = await Promise.all([
    selected ? Availability.listByMatch(selected.id) : Promise.resolve([]),
    selected ? Lineups.byMatchTeam(selected.id, team.id) : Promise.resolve(undefined),
  ]);

  const statusByPlayer = new Map(availability.map((a) => [a.playerId, a.status]));
  const tested = latestPerPlayer(metrics);
  const eventsByPlayer = new Map<string, typeof teamEvents>();
  for (const e of teamEvents) {
    if (!e.playerId) continue;
    eventsByPlayer.set(e.playerId, [...(eventsByPlayer.get(e.playerId) ?? []), e]);
  }

  const rows: SquadRow[] = players.map((player) => {
    const mine = eventsByPlayer.get(player.id) ?? [];
    const eligibility = eligibilityFor(mine);
    return {
      player,
      status: statusByPlayer.get(player.id) ?? "NO_REPLY",
      yellows: eligibility.yellows,
      reds: mine.filter((e) => e.type === "RED").length,
      suspended: eligibility.status === "SUSPENDED",
      tested: tested.has(player.id),
    };
  });

  const label = (m: (typeof fixtures)[number]) =>
    `${m.round}${m.field ? ` · ${m.field}` : ""}${m.scheduledAt ? ` · ${formatDate(m.scheduledAt)}` : ""}`;

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
        <div className="card mesh p-5 sm:p-6 flex flex-wrap items-center gap-4">
          <TeamBadge
            id={team.id}
            name={team.name}
            hasCrest={team.hasCrest}
            crestUpdatedAt={team.crestUpdatedAt}
            logoUrl={team.logoUrl}
            sport={tournament?.sport || "Soccer"}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold text-inkDisplay leading-tight">{team.name}</h1>
            <p className="text-sm text-ink2 mt-1">
              {tournament?.name}
              {team.groupName ? ` · Group ${team.groupName}` : ""}
            </p>
            <p className="text-[11px] text-ink3 mt-1">
              {players.length} player{players.length === 1 ? "" : "s"} ·{" "}
              {rows.filter((r) => r.suspended).length} suspended
            </p>
          </div>
        </div>

        {fixtures.length > 1 && (
          <div className="card p-4 sm:p-5">
            <p className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-2">Fixture</p>
            <div className="flex flex-wrap gap-2">
              {fixtures.map((m) => (
                <Link
                  key={m.id}
                  href={`/coach/dashboard?match=${m.id}`}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    selected?.id === m.id
                      ? "border-pitch-400 bg-pitch-400/10 text-inkDisplay font-semibold"
                      : "border-line text-ink2 hover:border-black/25"
                  }`}
                >
                  {m.round}
                  {m.scheduledAt ? ` · ${formatDate(m.scheduledAt)}` : ""}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-3">Squad</h2>
          <CoachSquad
            teamId={team.id}
            matchId={selected?.id ?? null}
            rows={rows}
            matchLabel={selected ? label(selected) : null}
          />
        </div>

        <div className="card p-5 sm:p-6">
          <div className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2">Tactical board</h2>
            {lineup && <p className="text-[11px] text-ink3">Saved {formatDate(lineup.updatedAt)}</p>}
          </div>
          {selected ? (
            <TacticalBoard
              teamId={team.id}
              matchId={selected.id}
              players={players}
              initialFormation={lineup?.formation || "4-3-3"}
              initialSlots={lineup?.slots ?? null}
              initialArrows={lineup?.arrows ?? null}
              initialNotes={lineup?.notes ?? null}
            />
          ) : (
            <p className="text-sm text-ink2 py-6 text-center">
              No fixtures yet — a lineup is saved against a specific match, so this opens once the organizer generates
              the schedule.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
