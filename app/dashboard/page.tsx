import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Tournaments } from "@/lib/models";
import { getSportTheme } from "@/lib/sportTheme";

const statusColors: Record<string, string> = {
  DRAFT: "bg-black/10 text-black/60",
  REGISTRATION_OPEN: "bg-pitch-400/15 text-pitch-600",
  SCHEDULED: "bg-black/10 text-black/70",
  LIVE: "bg-volt-400/20 text-volt-500",
  COMPLETED: "bg-black/10 text-black/40",
};

export default async function DashboardHome() {
  const user = await getCurrentUser();
  const tournaments = user ? Tournaments.listByOwner(user.id) : [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Your tournaments</h1>
          <p className="text-black/50 text-sm mt-1">Create, schedule, and run your events.</p>
        </div>
        <Link href="/dashboard/tournaments/new" className="btn-primary shrink-0 self-start sm:self-auto whitespace-nowrap">
          + New tournament
        </Link>
      </div>

      {tournaments.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-black/60 mb-4">You haven&apos;t created a tournament yet.</p>
          <Link href="/dashboard/tournaments/new" className="btn-primary">
            Create your first tournament
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments.map((t) => {
            const theme = getSportTheme(t.sport);
            return (
              <Link
                key={t.id}
                href={`/dashboard/tournaments/${t.id}`}
                className="card p-5 hover:border-pitch-400/30 hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-start justify-between mb-3 gap-2">
                  <h2 className="font-semibold">{t.name}</h2>
                  <span className={`badge shrink-0 ${statusColors[t.status]}`}>{t.status.replace("_", " ")}</span>
                </div>
                <p className="text-sm text-black/50">
                  {theme.emoji} {t.sport} · {t.teamFormat} ·{" "}
                  {t.format === "ROUND_ROBIN" ? "Round robin" : "Groups + knockout"}
                </p>
                <p className="text-sm text-black/40 mt-1">{new Date(t.startDate).toLocaleDateString()}</p>
                {t.location && <p className="text-sm text-black/40">{t.location}</p>}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
