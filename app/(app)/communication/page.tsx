import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Tournaments,
  Teams,
  Referees,
  Applications,
  Matches,
  ApplicationMessages,
  TournamentStaff,
} from "@/lib/models";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { BroadcastComposer } from "@/components/BroadcastComposer";
import { formatDate } from "@/lib/invoices";

export default async function CommunicationPage({ searchParams }: { searchParams: { t?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/communication");

  // The events this account may broadcast for: their own, plus any they are
  // assigned to. An admin sees everything.
  const owned = await Tournaments.listByOwner(user.id);
  const assignedIds = await TournamentStaff.listTournamentIdsForUser(user.id);
  const all = user.role === "ADMIN" ? await Tournaments.listAll() : [];
  const byId = new Map([...all, ...owned].map((t) => [t.id, t]));
  for (const id of assignedIds) {
    if (!byId.has(id)) {
      const t = await Tournaments.byId(id);
      if (t) byId.set(t.id, t);
    }
  }
  const tournaments = [...byId.values()];

  if (tournaments.length === 0) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16">
          <div className="card p-8 text-center">
            <h1 className="text-xl font-extrabold text-inkDisplay mb-2">No events to broadcast for</h1>
            <p className="text-sm text-ink2">
              This hub sends to the participants of an event you run. Create a tournament, or ask an organizer to
              assign you to theirs.
            </p>
            <Link href="/dashboard" className="btn-secondary text-sm inline-block mt-5">
              Back to dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const tournament = tournaments.find((t) => t.id === searchParams.t) ?? tournaments[0];

  if (!can(user, "COMMUNICATION")) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16">
          <div className="card p-8 text-center">
            <h1 className="text-xl font-extrabold text-inkDisplay mb-2">No messaging permission</h1>
            <p className="text-sm text-ink2">
              Your account cannot send broadcasts for this event. A super admin grants messaging access from Accounts.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const [teams, referees, applications, matches, log] = await Promise.all([
    Teams.listByTournament(tournament.id),
    Referees.listByTournament(tournament.id),
    Applications.listByTournament(tournament.id),
    Matches.listByTournament(tournament.id),
    ApplicationMessages.listByTournament(tournament.id),
  ]);

  const divisions = [...new Set(applications.map((a) => a.division).filter(Boolean) as string[])].sort();
  const fieldList = [...new Set(matches.map((m) => m.field).filter(Boolean) as string[])].join(", ");

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-inkDisplay mb-1">Communications</h1>
          <p className="text-ink2 text-sm font-medium">
            Tell everyone at once — and set what the public event page says about play.
          </p>
        </div>

        {tournaments.length > 1 && (
          <div className="card p-4 flex flex-wrap gap-2">
            {tournaments.map((t) => (
              <Link
                key={t.id}
                href={`/communication?t=${t.id}`}
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

        <BroadcastComposer
          tournament={tournament}
          teams={teams}
          referees={referees}
          applications={applications}
          divisions={divisions}
          fieldList={fieldList}
        />

        <div className="card overflow-hidden">
          <div className="p-5 sm:p-6 pb-3 flex items-baseline justify-between gap-3 flex-wrap">
            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2">Sent messages</h2>
            <Link href={`/t/${tournament.slug}`} className="text-[11px] text-ink2 hover:text-inkDisplay inline-flex items-center min-h-12">
              View public page →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[38rem]">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-ink3 border-b border-lineSoft">
                  <th className="text-left font-semibold px-5 py-3">Sent</th>
                  <th className="text-left font-semibold px-2 py-3">Audience</th>
                  <th className="text-left font-semibold px-2 py-3">Subject</th>
                  <th className="text-right font-semibold px-2 py-3">Recipients</th>
                  <th className="text-left font-semibold px-5 py-3">Delivery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lineSoft">
                {log.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-ink2">
                      Nothing sent for this event yet.
                    </td>
                  </tr>
                ) : (
                  log.map((m) => (
                    <tr key={m.id}>
                      <td className="px-5 py-3 text-ink2 whitespace-nowrap text-xs">{formatDate(m.createdAt)}</td>
                      <td className="px-2 py-3">
                        <span className="badge bg-neutralBadge text-ink2 border border-line text-[10px] whitespace-nowrap">
                          {m.audience}
                        </span>
                      </td>
                      <td className="px-2 py-3">
                        <span className="flex items-center gap-2 min-w-0">
                          {m.priority === "URGENT" && <span className="badge badge-danger text-[10px] shrink-0">URGENT</span>}
                          <span className="truncate max-w-[16rem]">{m.subject}</span>
                        </span>
                      </td>
                      <td className="px-2 py-3 text-right font-score">{m.recipientCount}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`badge text-[10px] ${
                            m.status === "SENT" ? "badge-accepted" : m.status === "FAILED" ? "badge-danger" : "badge-pending"
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-ink3 px-5 sm:px-6 py-4 border-t border-lineSoft">
            QUEUED means recorded but not delivered — that is what happens with no mail provider configured. The status
            here is what actually happened, never what was intended.
          </p>
        </div>
      </div>
    </main>
  );
}
