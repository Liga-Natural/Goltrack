import Link from "next/link";
import { TeamBadge } from "./TeamBadge";
import type { Team } from "@/lib/models";
import type { StandingRow } from "@/lib/standings";

export function TeamCard({
  team,
  sport,
  href,
  standing,
}: {
  team: Team;
  sport: string;
  href: string;
  standing?: StandingRow;
}) {
  return (
    <Link
      href={href}
      className="card p-4 flex items-center gap-3 hover:-translate-y-0.5 hover:shadow-lg transition-all"
    >
      <TeamBadge name={team.name} logoUrl={team.logoUrl} sport={sport} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold truncate">{team.name}</p>
        <p className="text-xs text-black/40">
          {team.groupName ? `Group ${team.groupName}` : "Unassigned"}
          {standing ? ` · ${standing.won}-${standing.drawn}-${standing.lost} · ${standing.points} pts` : ""}
        </p>
      </div>
    </Link>
  );
}
