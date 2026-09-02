import { formatLabel } from "@/lib/formatLabel";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Tournaments, TournamentStaff } from "@/lib/models";
import { getSportTheme } from "@/lib/sportTheme";
import { tournamentStatusClass } from "@/lib/statusStyles";
import { RoleWorkspace } from "@/components/RoleWorkspace";


export default async function DashboardHome() {
  const user = await getCurrentUser();
  // Owned plus assigned. Staff invited onto someone else's event can open it
  // (see the tournament layout), so it has to be listed here too — access with
  // no way to navigate to it is access in name only.
  const owned = user ? await Tournaments.listByOwner(user.id) : [];
  const assignedIds = user ? await TournamentStaff.listTournamentIdsForUser(user.id) : [];
  const ownedIds = new Set(owned.map((t) => t.id));
  const assigned = (
    await Promise.all(assignedIds.filter((id) => !ownedIds.has(id)).map((id) => Tournaments.byId(id)))
  ).filter((t): t is NonNullable<typeof t> => Boolean(t));
  const tournaments = [...owned, ...assigned];

  // The organizer view is composed on the server and handed to the client
  // role switcher as a prop, so switching roles costs no round trip and the
  // real dashboard keeps its server-rendered data.
  const organizerView = (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-inkDisplay">Your tournaments</h1>
          <p className="text-ink2 text-sm mt-1">Create, schedule, and run your events.</p>
        </div>
        <Link href="/dashboard/tournaments/new" className="btn-primary shrink-0 self-start sm:self-auto whitespace-nowrap">
          + New tournament
        </Link>
      </div>

      {tournaments.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-ink2 mb-1">No tournaments on the board yet.</p>
          <p className="text-ink3 text-sm mb-5">Set up sport, format, and fees — you can open registration whenever you're ready.</p>
          <Link href="/dashboard/tournaments/new" className="btn-primary">
            Create your first tournament
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments.map((t, i) => {
            const theme = getSportTheme(t.sport);
            return (
              <Link
                key={t.id}
                href={`/dashboard/tournaments/${t.id}`}
                className="card-interactive relative overflow-hidden p-5 animate-fade-up"
                style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
              >
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${theme.dot}`} />
                <div className="flex items-start justify-between mb-3 gap-2 mt-1">
                  <h2 className="font-extrabold">{t.name}</h2>
                  <span className={`badge shrink-0 ${tournamentStatusClass(t.status)}`}>{t.status.replace("_", " ")}</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`badge ${theme.soft}`}>
                    {theme.emoji} {t.sport} {t.teamFormat}
                  </span>
                  <span className="text-xs text-ink3">
                    {formatLabel(t.format)}
                  </span>
                </div>
                <p className="text-sm text-ink3">{new Date(t.startDate).toLocaleDateString()}</p>
                {t.location && <p className="text-sm text-ink3">{t.location}</p>}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );

  return <RoleWorkspace organizer={organizerView} />;
}
