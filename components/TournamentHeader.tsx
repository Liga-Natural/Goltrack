import Link from "next/link";
import { Tournament } from "@/lib/models";
import { getSportTheme } from "@/lib/sportTheme";

const statusColors: Record<string, string> = {
  DRAFT: "bg-white/10 text-white/60",
  REGISTRATION_OPEN: "bg-pitch-400/15 text-pitch-400",
  SCHEDULED: "bg-blue-400/15 text-blue-300",
  LIVE: "bg-volt-400/20 text-volt-400",
  COMPLETED: "bg-white/10 text-white/40",
};

export function TournamentHeader({ tournament }: { tournament: Tournament }) {
  const theme = getSportTheme(tournament.sport);
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-6 pb-6 border-b border-white/5">
      <div>
        <div className="flex items-center gap-2.5 mb-1.5">
          <h1 className="text-2xl font-semibold">{tournament.name}</h1>
          <span className="badge bg-white/10 text-white/70">
            {theme.emoji} {theme.label}
          </span>
          <span className={`badge ${statusColors[tournament.status]}`}>{tournament.status.replace("_", " ")}</span>
        </div>
        <p className="text-white/50 text-sm">
          {tournament.sport} · {tournament.format === "ROUND_ROBIN" ? "Round robin" : "Groups + knockout"} ·{" "}
          {new Date(tournament.startDate).toLocaleDateString()}
          {tournament.location ? ` · ${tournament.location}` : ""}
        </p>
      </div>
      <Link href={`/t/${tournament.slug}`} target="_blank" className="btn-secondary text-sm">
        View public page →
      </Link>
    </div>
  );
}
