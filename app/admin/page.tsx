import Link from "next/link";
import { Tournaments, Teams, Players, Users } from "@/lib/models";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card-elevated p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 h-[2px] w-8 bg-pitch-400" />
      <p className="text-xs uppercase tracking-wide text-black/40 mb-1.5">{label}</p>
      <p className="font-score text-3xl">{value}</p>
    </div>
  );
}

export default async function AdminOverviewPage() {
  const tournaments = Tournaments.listAll();
  const roleCounts = Users.countsByRole();
  const recentTournaments = tournaments.slice(0, 5);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Platform overview</h1>
      <p className="text-black/50 text-sm mb-6">Every tournament and account on Jogo, not just your own.</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Tournaments" value={tournaments.length} />
        <StatCard label="Teams" value={Teams.countAll()} />
        <StatCard label="Players" value={Players.countAll()} />
        <StatCard label="Organizers" value={roleCounts.ORGANIZER} />
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-black/40 mb-1">Team managers</p>
          <p className="font-score text-xl">{roleCounts.TEAM_MANAGER}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-black/40 mb-1">Players (claimed)</p>
          <p className="font-score text-xl">{roleCounts.PLAYER}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-black/40 mb-1">Admins</p>
          <p className="font-score text-xl">{roleCounts.ADMIN}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Recent tournaments</h2>
        <Link href="/admin/tournaments" className="text-sm text-pitch-600 hover:underline">
          View all →
        </Link>
      </div>
      <div className="card divide-y divide-black/5">
        {recentTournaments.length === 0 ? (
          <p className="p-6 text-sm text-black/40 text-center">No tournaments on the platform yet.</p>
        ) : (
          recentTournaments.map((t) => (
            <Link key={t.id} href={`/dashboard/tournaments/${t.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-black/[0.02] transition-colors">
              <div>
                <p className="font-medium text-sm">{t.name}</p>
                <p className="text-xs text-black/40">{t.supervisorName} · {t.supervisorEmail}</p>
              </div>
              <span className="badge bg-black/5 text-black/60 text-xs">{t.status.replace("_", " ")}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
