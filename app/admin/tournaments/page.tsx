import Link from "next/link";
import { Tournaments, Users } from "@/lib/models";
import { getSportTheme } from "@/lib/sportTheme";

const statusColors: Record<string, string> = {
  DRAFT: "bg-black/10 text-black/60",
  REGISTRATION_OPEN: "bg-pitch-400/15 text-pitch-600",
  SCHEDULED: "bg-black/10 text-black/70",
  LIVE: "bg-volt-400/20 text-volt-500",
  COMPLETED: "bg-black/10 text-black/40",
};

export default async function AdminTournamentsPage() {
  const tournaments = Tournaments.listAll();

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">All tournaments</h1>
      <p className="text-black/50 text-sm mb-6">Across every organizer on the platform.</p>

      {tournaments.length === 0 ? (
        <div className="card p-10 text-center text-black/50">No tournaments on the platform yet.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments.map((t) => {
            const theme = getSportTheme(t.sport);
            const owner = Users.byId(t.ownerId);
            return (
              <Link key={t.id} href={`/dashboard/tournaments/${t.id}`} className="card-interactive relative overflow-hidden p-5">
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${theme.dot}`} />
                <div className="flex items-start justify-between mb-3 gap-2 mt-1">
                  <h2 className="font-semibold">{t.name}</h2>
                  <span className={`badge shrink-0 ${statusColors[t.status]}`}>{t.status.replace("_", " ")}</span>
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
