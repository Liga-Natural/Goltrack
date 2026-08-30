import type { Match, Team } from "@/lib/models";
import { TeamBadge } from "@/components/TeamBadge";
import { MatchStatusBadge } from "@/components/MatchStatusBadge";

function kickoff(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function Side({
  team,
  label,
  sport,
  score,
  winner,
  decided,
}: {
  team: Team | undefined;
  label: string | null;
  sport: string;
  score: number | null;
  winner: boolean;
  decided: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      {team ? (
        <TeamBadge
          id={team.id}
          name={team.name}
          hasCrest={team.hasCrest}
          crestUpdatedAt={team.crestUpdatedAt}
          logoUrl={team.logoUrl}
          sport={sport}
          size="sm"
        />
      ) : (
        <span className="h-6 w-6 shrink-0 rounded-full border border-line" />
      )}
      {/* truncate + min-w-0: long club names ("Barrio Legacy FC · 2012 A")
          otherwise push the score column off a phone entirely. */}
      <span className={`truncate text-sm ${decided && !winner ? "text-ink2" : "font-semibold text-black"}`}>
        {team ? team.name : label || "TBD"}
      </span>
      <span
        className={`ml-auto shrink-0 font-score text-base tabular-nums ${
          score === null ? "text-ink3" : decided && !winner ? "text-ink2" : "text-inkDisplay"
        }`}
      >
        {score ?? "–"}
      </span>
    </div>
  );
}

// One fixture per row, both teams stacked with their score on the right —
// the layout every scoreboard app converges on, because it lets you read a
// result in one vertical glance instead of parsing "2 : 1" back onto an
// inline "A vs B". Replaces three near-identical inline versions that had
// drifted apart across the public page, the dashboard, and the scores view.
export function FixtureList({
  matches,
  teamsById,
  sport,
  emptyLabel = "Nothing scheduled yet.",
  motmNames,
}: {
  matches: Match[];
  teamsById: Map<string, Team>;
  sport: string;
  emptyLabel?: string;
  /** matchId → player name. Optional: only the public page shows this. */
  motmNames?: Map<string, string>;
}) {
  if (matches.length === 0) {
    return <p className="text-sm text-ink2 py-6 text-center">{emptyLabel}</p>;
  }

  return (
    <div className="divide-y divide-lineSoft">
      {matches.map((m) => {
        const home = teamsById.get(m.homeTeamId || "");
        const away = teamsById.get(m.awayTeamId || "");
        const decided = m.status === "FINAL" && m.homeScore !== null && m.awayScore !== null;
        const homeWon = decided && (m.homeScore as number) > (m.awayScore as number);
        const awayWon = decided && (m.awayScore as number) > (m.homeScore as number);
        const time = kickoff(m.scheduledAt);
        // No groupName here: `round` is already stored as "Group A - Round 3"
        // for group games, so prefixing it printed "Group A · Group A -
        // Round 3". Knockout rounds ("Semifinal") carry a null groupName
        // anyway, so the group is never lost by leaving it out.
        const meta = [m.round, m.field, time].filter(Boolean).join(" · ");

        return (
          // A live fixture gets a left rule rather than a fill — on glass a
          // tinted row background reads as a second card edge, while a rule
          // sits in the row's own margin and stays legible on both themes.
          <div
            key={m.id}
            className={`py-3 ${m.status === "LIVE" ? "border-l-2 border-l-volt-400 pl-3 -ml-3" : ""}`}
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-[11px] uppercase tracking-wide text-ink3 truncate">{meta}</span>
              <MatchStatusBadge status={m.status} />
            </div>
            <div className="space-y-1.5">
              <Side team={home} label={m.homeLabel} sport={sport} score={m.homeScore} winner={homeWon} decided={decided} />
              <Side team={away} label={m.awayLabel} sport={sport} score={m.awayScore} winner={awayWon} decided={decided} />
            </div>
            {motmNames?.get(m.id) && (
              <p className="text-xs text-ink3 mt-2">
                <span className="text-warning-500">⭐</span> Man of the match:{" "}
                <span className="text-ink2">{motmNames.get(m.id)}</span>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
