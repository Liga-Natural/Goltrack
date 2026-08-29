import Link from "next/link";
import { Tournament } from "@/lib/models";
import { getSportTheme } from "@/lib/sportTheme";
import { TournamentBreadcrumb } from "./TournamentBreadcrumb";

const statusColors: Record<string, string> = {
  DRAFT: "bg-neutralBadge text-ink2",
  REGISTRATION_OPEN: "bg-pitch-400/15 text-pitch-600",
  SCHEDULED: "bg-neutralBadge text-ink2",
  LIVE: "bg-volt-400/20 text-volt-500",
  COMPLETED: "bg-neutralBadge text-ink3",
};

export function TournamentHeader({ tournament }: { tournament: Tournament }) {
  const theme = getSportTheme(tournament.sport);
  return (
    <div className="mb-6 pb-6 border-b border-black/5">
      <TournamentBreadcrumb tournamentId={tournament.id} tournamentName={tournament.name} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <h1 className="text-3xl font-extrabold">{tournament.name}</h1>
            <span className={`badge ${theme.soft}`}>
              {theme.emoji} {theme.label} {tournament.teamFormat}
            </span>
            <span className={`badge ${statusColors[tournament.status]}`}>{tournament.status.replace("_", " ")}</span>
          </div>
          <p className="text-black/50 text-sm">
            {tournament.format === "ROUND_ROBIN" ? "Round robin" : "Groups + knockout"} ·{" "}
            {new Date(tournament.startDate).toLocaleDateString()}
            {tournament.location ? ` · ${tournament.location}` : ""}
          </p>
        </div>
        <Link href={`/t/${tournament.slug}`} target="_blank" className="btn-secondary text-sm">
          View public page →
        </Link>
      </div>
    </div>
  );
}
