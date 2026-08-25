import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Tournaments } from "@/lib/models";

const statusColors: Record<string, string> = {
  DRAFT: "bg-white/10 text-white/60",
  REGISTRATION_OPEN: "bg-pitch-400/15 text-pitch-400",
  SCHEDULED: "bg-blue-400/15 text-blue-300",
  LIVE: "bg-volt-400/20 text-volt-400",
  COMPLETED: "bg-white/10 text-white/40",
};

export default async function DashboardHome() {
  const user = await getCurrentUser();
  const tournaments = user ? Tournaments.listByOwner(user.id) : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Your tournaments</h1>
          <p className="text-white/50 text-sm mt-1">Create, schedule, and run your events.</p>
        </div>
        <Link href="/dashboard/tournaments/new" className="btn-primary">
          + New tournament
        </Link>
      </div>

      {tournaments.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-white/60 mb-4">You haven&apos;t created a tournament yet.</p>
          <Link href="/dashboard/tournaments/new" className="btn-primary">
            Create your first tournament
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments.map((t) => (
            <Link key={t.id} href={`/dashboard/tournaments/${t.id}`} className="card p-5 hover:border-pitch-400/30 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <h2 className="font-semibold">{t.name}</h2>
                <span className={`badge ${statusColors[t.status]}`}>{t.status.replace("_", " ")}</span>
              </div>
              <p className="text-sm text-white/50">{t.sport} · {t.format === "ROUND_ROBIN" ? "Round robin" : "Groups + knockout"}</p>
              <p className="text-sm text-white/40 mt-1">{new Date(t.startDate).toLocaleDateString()}</p>
              {t.location && <p className="text-sm text-white/40">{t.location}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
