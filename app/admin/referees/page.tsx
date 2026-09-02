import Link from "next/link";
import { redirect } from "next/navigation";
import { Tournaments, Matches, Referees, Teams, RefereeFees } from "@/lib/models";
import { getCurrentUser } from "@/lib/auth";
import { findOfficialConflicts } from "@/lib/conflicts";
import { assignReferee } from "@/lib/actions";
import { formatDate, money } from "@/lib/invoices";
import { RefereeFeeForm } from "@/components/RefereeFeeForm";

export default async function AssignorPage({ searchParams }: { searchParams: { t?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const tournaments = await Tournaments.listAll();
  const tournament = tournaments.find((t) => t.id === searchParams.t) ?? tournaments[0];

  if (!tournament) {
    return (
      <div className="card p-8 text-center">
        <h1 className="text-xl font-extrabold text-inkDisplay mb-2">No tournaments yet</h1>
        <p className="text-sm text-ink2">Officials are assigned per event, so this fills in once one exists.</p>
      </div>
    );
  }

  const [matches, referees, teams] = await Promise.all([
    Matches.listByTournament(tournament.id),
    Referees.listByTournament(tournament.id),
    Teams.listByTournament(tournament.id),
  ]);
  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const refsById = new Map(referees.map((r) => [r.id, r]));
  const conflicts = findOfficialConflicts(matches, new Map(referees.map((r) => [r.id, r.name])));

  // Every fee row for this event's officials, so the grid can show what each
  // assignment is worth without a query per row.
  const feeLists = await Promise.all(referees.map((r) => RefereeFees.listByReferee(r.id)));
  const feeByMatchRef = new Map<string, { role: string; feeCents: number }>();
  for (const list of feeLists) {
    for (const f of list) feeByMatchRef.set(`${f.matchId}:${f.refereeId}`, { role: f.role, feeCents: f.feeCents });
  }

  const flagged = new Set(conflicts.flatMap((c) => c.matchIds));
  const scheduled = matches.filter((m) => m.scheduledAt).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-inkDisplay mb-1">Referee assignments</h1>
        <p className="text-ink2 text-sm font-medium">
          Who is on which match, what it pays, and where the schedule asks the impossible.
        </p>
      </div>

      {tournaments.length > 1 && (
        <div className="card p-4 flex flex-wrap gap-2">
          {tournaments.map((t) => (
            <Link
              key={t.id}
              href={`/admin/referees?t=${t.id}`}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                t.id === tournament.id
                  ? "border-pitch-400 bg-pitch-400/10 text-inkDisplay font-semibold"
                  : "border-line text-ink2 hover:border-black/25"
              }`}
            >
              {t.name}
            </Link>
          ))}
        </div>
      )}

      {/* Conflicts first: an assignor's whole job is spotting these, so they
          lead rather than sitting under a grid that has to be scrolled. */}
      <div className="card p-5 sm:p-6">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-3">Conflicts</h2>
        {conflicts.length === 0 ? (
          <p className="text-sm text-ink2">
            {scheduled === 0
              ? "Nothing is scheduled yet, so there is nothing to conflict."
              : "No double-bookings and no turnaround under an hour."}
          </p>
        ) : (
          <ul className="space-y-2">
            {conflicts.map((c, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  className={`badge text-[10px] shrink-0 mt-0.5 ${
                    c.kind === "REFEREE_DOUBLE_BOOKED" ? "badge-danger" : "badge-pending"
                  }`}
                >
                  {c.kind === "REFEREE_DOUBLE_BOOKED" ? "CLASH" : "TIGHT"}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-inkDisplay">{c.title}</p>
                  <p className="text-xs text-ink3">{c.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 sm:p-6 pb-3">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2">Assignment grid</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[46rem]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-ink3 border-b border-lineSoft">
                <th className="text-left font-semibold px-5 py-3">Match</th>
                <th className="text-left font-semibold px-2 py-3">Kick-off</th>
                <th className="text-left font-semibold px-2 py-3">Official</th>
                <th className="text-right font-semibold px-5 py-3">Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lineSoft">
              {matches.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-ink2">
                    No fixtures yet — generate the schedule first.
                  </td>
                </tr>
              ) : (
                matches.map((m) => {
                  const fee = m.refereeId ? feeByMatchRef.get(`${m.id}:${m.refereeId}`) : undefined;
                  return (
                    <tr key={m.id} className={flagged.has(m.id) ? "bg-warning-500/5" : ""}>
                      <td className="px-5 py-3">
                        <p className="text-xs text-ink3">
                          {m.round}
                          {m.field ? ` · ${m.field}` : ""}
                        </p>
                        <p className="font-semibold truncate max-w-[16rem]">
                          {teamsById.get(m.homeTeamId || "")?.name || m.homeLabel || "TBD"} v{" "}
                          {teamsById.get(m.awayTeamId || "")?.name || m.awayLabel || "TBD"}
                        </p>
                      </td>
                      <td className="px-2 py-3 text-ink2 whitespace-nowrap text-xs">
                        {m.scheduledAt
                          ? new Date(m.scheduledAt).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })
                          : "Unscheduled"}
                      </td>
                      <td className="px-2 py-3">
                        {/* A plain select, not drag-and-drop: this is a phone
                            and tablet screen as often as a desktop one, and
                            HTML5 drag events do not fire on touch at all. */}
                        <form
                          action={async (formData: FormData) => {
                            "use server";
                            await assignReferee(tournament.id, m.id, String(formData.get("refereeId") || ""));
                          }}
                        >
                          <select
                            name="refereeId"
                            defaultValue={m.refereeId || ""}
                            className="input text-xs w-auto py-1.5 h-9"
                          >
                            <option value="">Unassigned</option>
                            {referees.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                                {r.certification ? ` · ${r.certification}` : ""}
                              </option>
                            ))}
                          </select>
                          <button type="submit" className="btn-ghost text-[11px] px-2 py-1.5 ml-1.5">
                            Set
                          </button>
                        </form>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end">
                          {m.refereeId ? (
                            <RefereeFeeForm
                              tournamentId={tournament.id}
                              matchId={m.id}
                              refereeId={m.refereeId}
                              role={fee?.role ?? "CENTER"}
                              feeCents={fee?.feeCents ?? 0}
                            />
                          ) : (
                            <span className="text-xs text-ink3">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-3">Officials</h2>
        {referees.length === 0 ? (
          <p className="text-sm text-ink2">
            No officials on this event yet — they are added from the tournament&apos;s Referees tab.
          </p>
        ) : (
          <ul className="divide-y divide-lineSoft">
            {referees.map((r) => {
              const worked = matches.filter((m) => m.refereeId === r.id).length;
              return (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <Link href={`/referee/profile/${r.id}`} className="font-semibold text-sm hover:text-pitch-500">
                      {r.name}
                    </Link>
                    <p className="text-[11px] text-ink3">
                      {r.certification || "No certification recorded"}
                      {r.userId ? " · account linked" : " · no account linked"}
                    </p>
                  </div>
                  <span className="text-xs text-ink2 shrink-0">
                    {worked} match{worked === 1 ? "" : "es"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
