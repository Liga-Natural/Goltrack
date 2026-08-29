import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Tournaments } from "@/lib/models";
import { getSportTheme } from "@/lib/sportTheme";
import { tournamentStatusClass } from "@/lib/statusStyles";


export default async function DashboardHome() {
  const user = await getCurrentUser();
  const tournaments = user ? await Tournaments.listByOwner(user.id) : [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-inkDisplay">Your tournaments</h1>
          <p className="text-black/50 text-sm mt-1">Create, schedule, and run your events.</p>
        </div>
        <Link href="/dashboard/tournaments/new" className="btn-primary shrink-0 self-start sm:self-auto whitespace-nowrap">
          + New tournament
        </Link>
      </div>

      {tournaments.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-black/60 mb-1">No tournaments on the board yet.</p>
          <p className="text-black/40 text-sm mb-5">Set up sport, format, and fees — you can open registration whenever you're ready.</p>
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
                  <span className="text-xs text-black/40">
                    {t.format === "ROUND_ROBIN" ? "Round robin" : "Groups + knockout"}
                  </span>
                </div>
                <p className="text-sm text-black/40">{new Date(t.startDate).toLocaleDateString()}</p>
                {t.location && <p className="text-sm text-black/40">{t.location}</p>}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
