import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Referees, RefereeFees, Matches, Tournaments, TournamentStaff } from "@/lib/models";
import { getCurrentUser } from "@/lib/auth";
import { formatDate, money } from "@/lib/invoices";

export default async function RefereeProfilePage({ params }: { params: { id: string } }) {
  const referee = await Referees.byId(params.id);
  if (!referee) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/referee/profile/${params.id}`);

  const tournament = await Tournaments.byId(referee.tournamentId);
  // A fee ledger is pay information, so it is not public: the official
  // themselves, the organizer running the event, assigned staff, and the
  // platform admin.
  const permitted =
    referee.userId === user.id ||
    user.role === "ADMIN" ||
    tournament?.ownerId === user.id ||
    (tournament ? await TournamentStaff.isAssigned(tournament.id, user.id) : false);
  if (!permitted) notFound();

  const [fees, matches] = await Promise.all([
    RefereeFees.listByReferee(referee.id),
    Matches.listByTournament(referee.tournamentId),
  ]);
  const matchById = new Map(matches.map((m) => [m.id, m]));
  const worked = matches.filter((m) => m.refereeId === referee.id);
  const total = fees.reduce((s, f) => s + f.feeCents, 0);
  const unpaid = fees.filter((f) => !f.paidAt).reduce((s, f) => s + f.feeCents, 0);

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
        <Link href="/admin/referees" className="text-xs text-ink2 hover:text-inkDisplay">
          ← Assignments
        </Link>

        <div className="card mesh p-5 sm:p-6">
          <div className="flex flex-wrap items-start gap-4">
            {/* No photo: Jogo stores no official portrait, and a stock avatar
                standing in for one would be a picture of somebody else. */}
            <span className="h-16 w-16 rounded-full bg-black/10 flex items-center justify-center font-display text-lg text-inkDisplay shrink-0">
              {referee.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-extrabold text-inkDisplay leading-tight">{referee.name}</h1>
              <div className="flex items-center gap-2 flex-wrap mt-2">
                <span className="badge role-referee text-[10px]">
                  {referee.certification || "CERTIFICATION NOT RECORDED"}
                </span>
                {referee.ratingPct != null && (
                  <span className="badge bg-neutralBadge text-ink2 border border-line text-[10px]">
                    {referee.ratingPct}% rating
                  </span>
                )}
                <span className="badge bg-neutralBadge text-ink2 border border-line text-[10px]">
                  {referee.userId ? "Account linked" : "No account linked"}
                </span>
              </div>
              <p className="text-xs text-ink3 mt-2">
                {tournament?.name}
                {referee.contact ? ` · ${referee.contact}` : ""}
              </p>
            </div>
          </div>
          {referee.ratingPct != null && (
            <p className="text-[11px] text-ink3 mt-4 pt-4 border-t border-lineSoft">
              The rating is a number an organizer typed, not a computed score — Jogo collects no match assessments to
              derive one from.
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="card p-5">
            <p className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-1.5">Matches</p>
            <p className="font-score text-2xl text-inkDisplay leading-none">{worked.length}</p>
          </div>
          <div className="card p-5">
            <p className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-1.5">Fees recorded</p>
            <p className="font-score text-2xl text-inkDisplay leading-none">{money(total)}</p>
          </div>
          <div className="card p-5">
            <p className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-1.5">Unpaid</p>
            <p className={`font-score text-2xl leading-none ${unpaid > 0 ? "text-warning-500" : "text-inkDisplay"}`}>
              {money(unpaid)}
            </p>
          </div>
        </div>

        <div className="card p-5 sm:p-6">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-3">Fee ledger</h2>
          {fees.length === 0 ? (
            <p className="text-sm text-ink2 py-4 text-center">
              No fees recorded. An organizer sets these per assignment from the assignor grid.
            </p>
          ) : (
            <ul className="divide-y divide-lineSoft">
              {fees.map((f) => {
                const m = matchById.get(f.matchId);
                return (
                  <li key={f.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">
                        {money(f.feeCents)} · {f.role.toLowerCase()} ref
                      </p>
                      <p className="text-[11px] text-ink3 truncate">
                        {m ? `${m.round}${m.field ? ` · ${m.field}` : ""}` : "Match removed"}
                        {m?.scheduledAt ? ` · ${formatDate(m.scheduledAt)}` : ""}
                      </p>
                    </div>
                    <span className={`badge text-[10px] shrink-0 ${f.paidAt ? "badge-accepted" : "badge-pending"}`}>
                      {f.paidAt ? "PAID" : "OWED"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-[11px] text-ink3 mt-4 pt-4 border-t border-lineSoft">
            Recorded, not paid. Jogo has no payout rail — an organizer settles these outside the app and marks them
            off, the same way every other payment here works.
          </p>
        </div>
      </div>
    </main>
  );
}
