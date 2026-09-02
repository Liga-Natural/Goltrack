import Link from "next/link";
import { redirect } from "next/navigation";
import { Referees, Matches, Teams, Tournaments, RefereeFees, MatchReports } from "@/lib/models";
import { getCurrentUser } from "@/lib/auth";
import { formatDate, money } from "@/lib/invoices";
import { Logo } from "@/components/Logo";

// An official's own list of matches. Reached on a phone before a match, so it
// keeps the touchline layout rather than the dashboard shell.
export const dynamic = "force-dynamic";

export default async function RefereeDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/referee/dashboard");

  const mine = await Referees.listByUserId(user.id);
  if (mine.length === 0) {
    return (
      <main className="min-h-screen px-4 py-16">
        <div className="max-w-sm mx-auto text-center card p-6">
          <h1 className="text-lg font-extrabold text-inkDisplay mb-2">No official record linked</h1>
          <p className="text-sm text-ink2">
            An organizer links your account to your referee record from the assignor screen. Until then there is
            nothing to show here — your matches live against that record, not your login.
          </p>
        </div>
      </main>
    );
  }

  const ids = new Set(mine.map((r) => r.id));
  const tournamentIds = [...new Set(mine.map((r) => r.tournamentId))];
  const [tournaments, matchLists, feeLists] = await Promise.all([
    Promise.all(tournamentIds.map((id) => Tournaments.byId(id))),
    Promise.all(tournamentIds.map((id) => Matches.listByTournament(id))),
    Promise.all(mine.map((r) => RefereeFees.listByReferee(r.id))),
  ]);

  const tournamentsById = new Map(tournaments.filter(Boolean).map((t) => [t!.id, t!]));
  const allMatches = matchLists.flat().filter((m) => m.refereeId && ids.has(m.refereeId));
  const teamIds = [...new Set(allMatches.flatMap((m) => [m.homeTeamId, m.awayTeamId]).filter(Boolean) as string[])];
  const teams = await Promise.all(teamIds.map((id) => Teams.byId(id)));
  const teamsById = new Map(teams.filter(Boolean).map((t) => [t!.id, t!]));

  const fees = feeLists.flat();
  const feeByMatch = new Map(fees.map((f) => [f.matchId, f]));
  const submitted = await Promise.all(tournamentIds.map((id) => MatchReports.submittedMatchIds(id)));
  const done = new Set(submitted.flatMap((s) => [...s]));

  const sorted = [...allMatches].sort((a, b) => (a.scheduledAt || "").localeCompare(b.scheduledAt || ""));
  const owed = fees.filter((f) => !f.paidAt).reduce((s, f) => s + f.feeCents, 0);
  const earned = fees.reduce((s, f) => s + f.feeCents, 0);

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="max-w-sm mx-auto space-y-4">
        <div className="flex justify-center mb-2">
          <Logo wordmarkClassName="text-lg" />
        </div>

        <div className="card p-4">
          <p className="text-sm font-extrabold text-inkDisplay">{user.name}</p>
          <p className="text-[11px] text-ink3 mt-0.5">
            {mine.map((r) => r.certification).filter(Boolean).join(" · ") || "No certification recorded"}
          </p>
          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-lineSoft">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-ink2 font-semibold">Assigned</p>
              <p className="font-score text-xl text-inkDisplay leading-none mt-1">{sorted.length}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-ink2 font-semibold">Unpaid fees</p>
              <p className="font-score text-xl text-inkDisplay leading-none mt-1">{money(owed)}</p>
            </div>
          </div>
          {mine[0] && (
            <Link href={`/referee/profile/${mine[0].id}`} className="btn-ghost text-xs w-full mt-3 block text-center">
              Full profile &amp; fee ledger
            </Link>
          )}
        </div>

        {sorted.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-sm text-ink2">No matches assigned to you yet.</p>
          </div>
        ) : (
          sorted.map((m) => {
            const fee = feeByMatch.get(m.id);
            const t = tournamentsById.get(m.tournamentId);
            return (
              <Link key={m.id} href={`/referee/${m.id}`} className="card p-4 block">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] text-ink3 truncate">
                      {t?.name} · {m.round}
                      {m.field ? ` · ${m.field}` : ""}
                    </p>
                    <p className="text-sm font-semibold truncate mt-0.5">
                      {teamsById.get(m.homeTeamId || "")?.name || m.homeLabel || "TBD"} v{" "}
                      {teamsById.get(m.awayTeamId || "")?.name || m.awayLabel || "TBD"}
                    </p>
                    <p className="text-[11px] text-ink3 mt-1">
                      {m.scheduledAt ? formatDate(m.scheduledAt) : "Unscheduled"}
                      {fee ? ` · ${money(fee.feeCents)} ${fee.role.toLowerCase()}` : ""}
                    </p>
                  </div>
                  <span
                    className={`badge text-[10px] shrink-0 ${done.has(m.id) ? "badge-accepted" : "badge-pending"}`}
                  >
                    {done.has(m.id) ? "SIGNED" : "TO DO"}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </main>
  );
}
