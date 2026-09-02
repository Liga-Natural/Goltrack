import Link from "next/link";
import { notFound } from "next/navigation";
import { Players, Teams, Tournaments, MatchEvents, PlayerMetrics } from "@/lib/models";
import { getCurrentUser } from "@/lib/auth";
import { TeamBadge } from "@/components/TeamBadge";
import { PlayerRadar } from "@/components/PlayerRadar";
import { statsForPlayer, eligibilityFor, buildRadar, latestPerPlayer } from "@/lib/playerStats";
import { formatDate } from "@/lib/invoices";

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-ink2 font-semibold mb-1 truncate">{label}</p>
      <p className={`font-score text-2xl leading-none ${tone || "text-inkDisplay"}`}>{value}</p>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="badge bg-neutralBadge text-ink2 border border-line text-[10px]">{children}</span>
  );
}

export default async function PlayerProfilePage({ params }: { params: { id: string } }) {
  const player = await Players.byId(params.id);
  if (!player) notFound();

  const [viewer, team, events, ownMetrics] = await Promise.all([
    getCurrentUser(),
    player.teamId ? Teams.byId(player.teamId) : Promise.resolve(undefined),
    MatchEvents.listByPlayer(player.id),
    PlayerMetrics.listByPlayer(player.id),
  ]);
  const tournament = team ? await Tournaments.byId(team.tournamentId) : undefined;
  const cohortRaw = team ? await PlayerMetrics.listByTeam(team.id) : [];

  const stats = statsForPlayer(events);
  const eligibility = eligibilityFor(events);
  const cohort = [...latestPerPlayer(cohortRaw).values()];
  const radar = buildRadar(ownMetrics[0], cohort);

  // Who may see the highlight reel. PUBLIC is open; SCOUTS and PRIVATE are
  // only for people with a reason to be here — the player themself, whoever
  // runs their team, and the organizer. A minor's video does not get shown to
  // anyone who guesses the URL because the setting says "scouts only".
  const isSelf = Boolean(viewer && player.userId === viewer.id);
  const managesTeam = Boolean(
    viewer && team && (team.userId === viewer.id || viewer.role === "ADMIN" || tournament?.ownerId === viewer.id)
  );
  const canSeeVideo =
    player.videoUrl != null &&
    (player.videoPrivacy === "PUBLIC" || isSelf || managesTeam);

  const age = player.birthdate
    ? Math.floor((Date.now() - new Date(player.birthdate).getTime()) / 31_557_600_000)
    : null;

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
        {team && tournament && (
          <Link href={`/t/${tournament.slug}/teams/${team.id}`} className="text-xs text-ink2 hover:text-inkDisplay">
            ← {team.name}
          </Link>
        )}

        {/* Hero */}
        <div className="card mesh p-5 sm:p-6">
          <div className="flex flex-wrap items-start gap-5">
            {team && (
              <TeamBadge
                id={team.id}
                name={team.name}
                hasCrest={team.hasCrest}
                crestUpdatedAt={team.crestUpdatedAt}
                logoUrl={team.logoUrl}
                sport={tournament?.sport || "Soccer"}
                size="lg"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-extrabold text-inkDisplay leading-tight">{player.name}</h1>
                {player.jerseyNumber && (
                  <span className="font-score text-2xl text-ink3 leading-none">#{player.jerseyNumber}</span>
                )}
                <span
                  className={`badge ${eligibility.status === "CLEARED" ? "badge-accepted" : "badge-danger"} text-[10px]`}
                >
                  {eligibility.status}
                  {eligibility.outstandingReds > 0 && ` · ${eligibility.outstandingReds} red`}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-2.5">
                {player.position && <Chip>{player.position}</Chip>}
                {player.secondaryPosition && <Chip>{player.secondaryPosition}</Chip>}
                {player.graduationYear && <Chip>Class of {player.graduationYear}</Chip>}
                {player.birthdate && (
                  <Chip>
                    {formatDate(player.birthdate)}
                    {age !== null ? ` · ${age}` : ""}
                  </Chip>
                )}
              </div>
              <p className="text-xs text-ink3 mt-2">
                {team?.name}
                {tournament ? ` · ${tournament.name}` : ""}
              </p>
            </div>
          </div>

          {eligibility.status === "SUSPENDED" && (
            <p className="text-xs text-warning-500 mt-4 pt-4 border-t border-lineSoft">
              Holding {eligibility.outstandingReds} red card an organizer has not yet marked as served. Jogo does not
              model card accumulation — every competition writes that rule differently — so the {eligibility.yellows}{" "}
              yellow{eligibility.yellows === 1 ? "" : "s"} below are reported for you to apply your own rules to.
            </p>
          )}
        </div>

        {/* Match statistics */}
        <div className="card p-5 sm:p-6">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-4">Match statistics</h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-5">
            <Stat label="Matches" value={stats.appearances} />
            <Stat label="Goals" value={stats.goals} />
            <Stat label="Assists" value={stats.assists} />
            <Stat label="Yellow" value={stats.yellows} tone={stats.yellows ? "text-warning-500" : undefined} />
            <Stat label="Red" value={stats.reds} tone={stats.reds ? "text-warning-500" : undefined} />
          </div>
          <p className="text-[11px] text-ink3 mt-4 pt-4 border-t border-lineSoft">
            Counted from incidents referees recorded on the match card. &ldquo;Matches&rdquo; means games this player
            has a recorded event in, not team-sheet appearances — Jogo has no per-match team sheet to count from.
            Minutes played, shot accuracy and pass completion need event-by-event match tagging that nobody collects
            here, so they are left out rather than estimated.
          </p>
        </div>

        {/* Athletic profile */}
        <div className="card p-5 sm:p-6">
          <div className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2">Athletic profile</h2>
            {ownMetrics[0] && (
              <p className="text-[11px] text-ink3">
                Tested {formatDate(ownMetrics[0].recordedAt)}
                {ownMetrics[0].recordedByName ? ` by ${ownMetrics[0].recordedByName}` : ""}
              </p>
            )}
          </div>
          {ownMetrics.length === 0 ? (
            <p className="text-sm text-ink2 py-6 text-center">
              No combine results recorded yet. A coach enters these from the squad list.
            </p>
          ) : (
            <PlayerRadar points={radar} cohortSize={cohort.length} />
          )}
        </div>

        {/* Highlights */}
        <div className="card p-5 sm:p-6">
          <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2">Highlights</h2>
            {player.videoUrl && (
              <span className="badge bg-neutralBadge text-ink2 border border-line text-[10px]">
                {player.videoPrivacy}
              </span>
            )}
          </div>
          {!player.videoUrl ? (
            <p className="text-sm text-ink2">No highlight link added.</p>
          ) : canSeeVideo ? (
            <>
              <a
                href={player.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-sm inline-block"
              >
                Open highlight reel →
              </a>
              <p className="text-[11px] text-ink3 mt-2 break-all">{player.videoUrl}</p>
              <p className="text-[11px] text-ink3 mt-2">
                Opened on the host that serves it rather than embedded here: Jogo stores a link, not the video, and
                an iframe would hand an arbitrary third-party site a frame inside this page.
              </p>
            </>
          ) : (
            <p className="text-sm text-ink2">
              This reel is set to {player.videoPrivacy === "SCOUTS" ? "scouts only" : "private"}. Sign in as this
              player, their coach, or the organizer to open it.
            </p>
          )}
        </div>

        {/* Discipline log */}
        {events.length > 0 && (
          <div className="card p-5 sm:p-6">
            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-3">Recorded incidents</h2>
            <ul className="divide-y divide-lineSoft">
              {events.map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-2.5">
                  <span
                    className={`badge text-[10px] shrink-0 ${
                      e.type === "RED" ? "badge-danger" : e.type === "YELLOW" ? "badge-pending" : "badge-accepted"
                    }`}
                  >
                    {e.type}
                  </span>
                  <span className="text-sm text-ink2 min-w-0 flex-1 truncate">
                    {e.minute != null ? `${e.minute}'` : ""} {e.note || ""}
                  </span>
                  {e.type === "RED" && (
                    <span className="text-[11px] text-ink3 shrink-0">
                      {e.clearedAt ? `served ${formatDate(e.clearedAt)}` : "unserved"}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
