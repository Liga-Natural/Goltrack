import Link from "next/link";
import { Tournaments, Users } from "@/lib/models";
import { getSportTheme } from "@/lib/sportTheme";
import { tournamentStatusClass } from "@/lib/statusStyles";


export default async function AdminTournamentsPage() {
  const tournaments = await Tournaments.listAll();
  const owners = await Promise.all(tournaments.map((t) => Users.byId(t.ownerId)));
  const ownerById = new Map(tournaments.map((t, i) => [t.id, owners[i]]));

  return (
    <div>
      <h1 className="text-3xl font-extrabold text-inkDisplay mb-1">All tournaments</h1>
      <p className="text-ink2 text-sm font-medium mb-6">Across every organizer on the platform.</p>

      {tournaments.length === 0 ? (
        <div className="card p-10 text-center text-black/50">No tournaments on the platform yet.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments.map((t) => {
            const theme = getSportTheme(t.sport);
            const owner = ownerById.get(t.id);
            return (
              <Link key={t.id} href={`/dashboard/tournaments/${t.id}`} className="card-interactive relative overflow-hidden p-5">
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${theme.dot}`} />
                <div className="flex items-start justify-between mb-3 gap-2 mt-1">
                  <h2 className="font-extrabold">{t.name}</h2>
                  <span className={`badge shrink-0 ${tournamentStatusClass(t.status)}`}>{t.status.replace("_", " ")}</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`badge ${theme.soft}`}>
                    {theme.emoji} {t.sport} {t.teamFormat}
                  </span>
                </div>
                <p className="text-sm text-black/40">{new Date(t.startDate).toLocaleDateString()}</p>
                <p className="text-xs text-black/30 mt-2 truncate">Owner: {owner?.name || t.supervisorName}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
