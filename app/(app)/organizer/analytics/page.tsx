import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { organizerTournaments, selectedTournament } from "@/lib/organizerScope";
import { moduleSettings } from "@/lib/actions";
import { TournamentPicker } from "@/components/TournamentPicker";
import { Teams, Matches, MatchEvents, Referees } from "@/lib/models";
import { fairPlayTable, fieldUsage, refereeLoad } from "@/lib/modules";
import { TeamBadge } from "@/components/TeamBadge";

export const dynamic = "force-dynamic";

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-1 truncate">{label}</p>
      <p className="font-score text-2xl leading-none text-inkDisplay">{value}</p>
      {detail && <p className="text-[11px] text-ink3 mt-1">{detail}</p>}
    </div>
  );
}

export default async function AnalyticsPage({ searchParams }: { searchParams: { t?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/organizer/analytics");
  const tournaments = await organizerTournaments(user);
  const tournament = selectedTournament(tournaments, searchParams.t);
  if (!tournament) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-ink2">Analytics belong to a tournament. Create one first.</p>
        <Link href="/dashboard/tournaments/new" className="btn-secondary text-sm inline-block mt-5">
          New tournament
        </Link>
      </div>
    );
  }

  const [settings, teams, matches, events, referees] = await Promise.all([
    moduleSettings(tournament.id),
    Teams.listByTournament(tournament.id),
    Matches.listByTournament(tournament.id),
    MatchEvents.listByTournament(tournament.id),
    Referees.listByTournament(tournament.id),
  ]);

  const fair = fairPlayTable(teams, matches, events, settings);
  const usage = fieldUsage(matches);
  const load = refereeLoad(referees, matches);
  const played = matches.filter((m) => m.status === "FINAL").length;
  const cards = events.filter((e) => e.type === "YELLOW" || e.type === "RED").length;
  const flagged = fair.filter((f) => f.flagged);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-sm mb-1.5">Analytics</h1>
        <p className="text-ink2">
          Discipline and operations for {tournament.name}, counted from the fixtures and the incidents your referees
          recorded.
        </p>
      </div>

      <TournamentPicker tournaments={tournaments} selectedId={tournament.id} basePath="/organizer/analytics" />

      <div className="card mesh p-5 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          <Stat label="Matches played" value={String(played)} detail={`of ${matches.length} scheduled`} />
          <Stat label="Cards shown" value={String(cards)} detail={`${events.filter((e) => e.type === "RED").length} red`} />
          <Stat label="Fields in use" value={String(usage.length)} />
          <Stat
            label="Clubs flagged"
            value={String(flagged.length)}
            detail={`at ${settings.fairPlayAlertThreshold}+ points`}
          />
        </div>
      </div>

      {/* Fair play */}
      <div className="card p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-3 flex-wrap mb-4">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2">Fair-play index</h2>
          <span className={`badge text-[10px] ${settings.fairPlayPublic ? "badge-accepted" : "bg-neutralBadge text-ink2"}`}>
            {settings.fairPlayPublic ? "PUBLIC" : "ORGANIZERS ONLY"}
          </span>
        </div>
        {fair.length === 0 ? (
          <p className="text-sm text-ink2 py-6 text-center">No teams yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[34rem]">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-ink3 border-b border-lineSoft">
                  <th className="text-left font-semibold py-2">Club</th>
                  <th className="text-right font-semibold py-2 px-2">Played</th>
                  <th className="text-right font-semibold py-2 px-2">Yellow</th>
                  <th className="text-right font-semibold py-2 px-2">Red</th>
                  <th className="text-right font-semibold py-2 px-2">Points</th>
                  <th className="text-right font-semibold py-2 pl-2">Per match</th>
                </tr>
              </thead>
              <tbody>
                {fair.map((row) => (
                  <tr key={row.team.id} className="border-b border-lineSoft last:border-0">
                    <td className="py-2.5">
                      <span className="flex items-center gap-2 min-w-0">
                        <TeamBadge
                          id={row.team.id}
                          name={row.team.name}
                          hasCrest={row.team.hasCrest}
                          crestUpdatedAt={row.team.crestUpdatedAt}
                          logoUrl={row.team.logoUrl}
                          sport={tournament.sport}
                          size="sm"
                        />
                        <span className="truncate text-inkDisplay">{row.team.name}</span>
                        {row.flagged && <span className="badge badge-danger text-[9px] shrink-0">FLAGGED</span>}
                      </span>
                    </td>
                    <td className="text-right font-score text-ink2 px-2">{row.matches}</td>
                    <td className="text-right font-score text-ink2 px-2">{row.yellows}</td>
                    <td className="text-right font-score text-ink2 px-2">{row.reds}</td>
                    <td className="text-right font-score text-inkDisplay px-2">{row.points}</td>
                    <td className="text-right font-score text-inkDisplay pl-2">{row.perMatch}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[11px] text-ink3 mt-3">
          Lower is better, ranked per match so a club is not penalised for playing more games. A yellow costs{" "}
          {settings.fairPlayYellowPoints} and a red {settings.fairPlayRedPoints} — change that on the fair-play
          settings screen.
        </p>
      </div>

      {/* Operations */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5 sm:p-6">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-4">Field utilisation</h2>
          {usage.length === 0 ? (
            <p className="text-sm text-ink2 py-6 text-center">Nothing scheduled with a field yet.</p>
          ) : (
            <div className="divide-y divide-lineSoft">
              {usage.map((f) => (
                <div key={f.field} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-sm text-inkDisplay truncate">{f.field}</span>
                  <span className="text-[11px] text-ink2 shrink-0 font-score">
                    {f.matches} matches
                    {f.medianTurnoverMinutes != null ? ` · ${f.medianTurnoverMinutes} min turnover` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-ink3 mt-3">
            Turnover is the median gap between kick-offs on that field — the number that tells you whether the day is
            packed too tight.
          </p>
        </div>

        <div className="card p-5 sm:p-6">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-4">Referee workload</h2>
          {load.length === 0 ? (
            <p className="text-sm text-ink2 py-6 text-center">No referees on this event yet.</p>
          ) : (
            <div className="divide-y divide-lineSoft">
              {load.map((r) => (
                <div key={r.referee.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-sm text-inkDisplay truncate">{r.referee.name}</span>
                  <span className="text-[11px] shrink-0 font-score">
                    <span className="text-ink2">{r.matches} matches</span>
                    {r.backToBack > 0 && <span className="text-warning-500"> · {r.backToBack} back-to-back</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-ink3 mt-3">
            Back-to-back counts assignments starting within 90 minutes of the previous one — the ones that leave no
            time to walk across the complex.
          </p>
        </div>
      </div>
    </div>
  );
}
