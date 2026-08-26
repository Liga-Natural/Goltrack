import { TeamBadge } from "@/components/TeamBadge";
import type { Team } from "@/lib/models";

// Small "crest + name" pairing reused anywhere a team shows up inline in a
// list — schedule fixtures, the knockout bracket, the scores board. Falls
// back to a plain label (e.g. "TBD" or a knockout seed placeholder) when
// there's no team row yet, which is common before a bracket fills in.
export function TeamInline({ team, sport, fallback = "TBD" }: { team: Team | undefined; sport: string; fallback?: string }) {
  if (!team) return <span>{fallback}</span>;
  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <TeamBadge id={team.id} name={team.name} hasCrest={team.hasCrest} crestUpdatedAt={team.crestUpdatedAt} logoUrl={team.logoUrl} sport={sport} size="sm" />
      {team.name}
    </span>
  );
}
