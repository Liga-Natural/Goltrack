import Link from "next/link";
import { Tournament } from "@/lib/models";
import { getSportTheme } from "@/lib/sportTheme";
import { TournamentBreadcrumb } from "./TournamentBreadcrumb";
import { tournamentStatusClass } from "@/lib/statusStyles";


export function TournamentHeader({ tournament }: { tournament: Tournament }) {
  const theme = getSportTheme(tournament.sport);
  return (
    <div className="mb-6 pb-6 border-b border-black/5">
      <TournamentBreadcrumb tournamentId={tournament.id} tournamentName={tournament.name} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {/* Badges on their own row below the title, not inline beside it.
              Inline, a long tournament name wraps to three lines on a phone
              and the badges get dragged into the gap beside the last line —
              "Soccer 9v9" ended up sitting on top of the heading. They only
              share a line once there is room for both (sm+). */}
          <h1 className="text-3xl font-extrabold text-inkDisplay mb-2">{tournament.name}</h1>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`badge ${theme.soft}`}>
              {theme.emoji} {theme.label} {tournament.teamFormat}
            </span>
            <span className={`badge ${tournamentStatusClass(tournament.status)}`}>{tournament.status.replace("_", " ")}</span>
          </div>
          <p className="text-ink2 text-sm font-medium">
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
