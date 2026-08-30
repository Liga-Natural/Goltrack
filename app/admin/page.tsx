import Link from "next/link";
import { Tournaments, Teams, Players, Users } from "@/lib/models";
import { tournamentStatusClass } from "@/lib/statusStyles";
import { TabPanel } from "@/components/TabPanel";
import { SPORTS } from "@/lib/sportTheme";
import type { Tournament } from "@/lib/models";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-1 truncate">{label}</p>
      <p className="font-score text-2xl text-inkDisplay leading-none">{value}</p>
    </div>
  );
}

function dateRange(t: Tournament): string {
  const fmt = (s: string | null) => {
    if (!s) return null;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString([], { month: "short", day: "numeric" });
  };
  const a = fmt(t.startDate);
  const b = fmt(t.endDate);
  if (a && b && a !== b) return `${a} – ${b}`;
  return a || "No dates set";
}

function TournamentRows({ rows, empty }: { rows: Tournament[]; empty: string }) {
  if (rows.length === 0) return <p className="text-sm text-ink2 py-6 text-center">{empty}</p>;
  return (
    <div className="divide-y divide-lineSoft">
      {rows.map((t) => (
        <Link
          key={t.id}
          href={`/dashboard/tournaments/${t.id}`}
          className="flex items-center gap-3 py-3.5 hover:bg-black/[0.03] transition-colors -mx-2 px-2 rounded-lg"
        >
          <span className="text-base shrink-0" aria-hidden="true">
            {SPORTS[t.sport]?.emoji || "🏆"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{t.name}</p>
            {/* One metadata line, not two stacked ones: at 390px the old
                "name / director · email" pair wrapped to three rows and the
                status badge got pushed under it. */}
            <p className="text-xs text-ink3 truncate">
              {dateRange(t)} · {t.supervisorName}
            </p>
          </div>
          <span className={`badge text-[10px] shrink-0 ${tournamentStatusClass(t.status)}`}>
            {t.status.replace("_", " ")}
          </span>
        </Link>
      ))}
    </div>
  );
}

export default async function AdminOverviewPage() {
  const [tournaments, roleCounts, teamCount, playerCount] = await Promise.all([
    Tournaments.listAll(),
    Users.countsByRole(),
    Teams.countAll(),
    Players.countAll(),
  ]);

  const liveOnes = tournaments.filter((t) => t.status === "LIVE");
  const openOnes = tournaments.filter((t) => t.status === "REGISTRATION_OPEN");

  const tabs = [
    { key: "recent", label: "Recent", count: tournaments.length, panel: <TournamentRows rows={tournaments.slice(0, 8)} empty="No tournaments on the platform yet." /> },
    { key: "live", label: "Live", count: liveOnes.length, panel: <TournamentRows rows={liveOnes} empty="Nothing is live right now." /> },
    { key: "open", label: "Registration open", count: openOnes.length, panel: <TournamentRows rows={openOnes} empty="No tournaments are taking registrations." /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-inkDisplay mb-1">Platform overview</h1>
        <p className="text-ink2 text-sm font-medium">Every tournament and account on Jogo, not just your own.</p>
      </div>

      {/* Seven numbers in one strip, replacing seven separate cards. The old
          layout spent the entire first screen on counts and pushed the only
          real content — the tournament list — below the fold. */}
      <div className="card p-5 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-6">
          <Stat label="Tournaments" value={tournaments.length} />
          <Stat label="Teams" value={teamCount} />
          <Stat label="Players" value={playerCount} />
          <Stat label="Organizers" value={roleCounts.ORGANIZER} />
          <Stat label="Managers" value={roleCounts.TEAM_MANAGER} />
          <Stat label="Claimed" value={roleCounts.PLAYER} />
          <Stat label="Admins" value={roleCounts.ADMIN} />
          <Stat label="Live now" value={liveOnes.length} />
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2">Tournaments</h2>
          <Link href="/admin/tournaments" className="text-xs font-semibold text-ink2 hover:text-black transition-colors">
            View all →
          </Link>
        </div>
        <TabPanel tabs={tabs} className="mt-3" />
      </div>
    </div>
  );
}
