import { StandingRow } from "@/lib/standings";
import { TeamBadge } from "@/components/TeamBadge";

export function StandingsTable({ rows, title, sport }: { rows: StandingRow[]; title?: string; sport: string }) {
  return (
    // min-w-0 overrides the grid item's default min-width:auto — without
    // it, the table's own min-width refuses to shrink below its
    // min-content size and drags the whole grid track (and everything
    // above it, up to the page) wider instead of scrolling internally.
    // Classic CSS Grid "blowout": the overflow-x-auto below only works once
    // its ancestor is actually allowed to be narrower than its content.
    <div className="min-w-0">
      {title && <h3 className="font-semibold mb-2 text-sm text-black/70">{title}</h3>}
      {/* A plain overflow-x-auto, scoped to the card's own padding — no
          negative-margin bleed. That trick sounds like it should buy the
          scroll area more room, but a block with overflow:auto and a
          negative margin doesn't reliably stop at the padding edge; in
          practice it kept sizing itself wider than the card and got cut off
          by the real viewport edge instead, which is a worse version of the
          exact clipping this was meant to fix. Scrolling *inside* the
          card's normal bounds is the boring, reliable version. */}
      <div className="relative">
        {/* Horizontal scroll on a data table is easy to miss entirely on a
            phone — nothing about a plain overflow-x-auto signals there's
            more to the right. A static edge fade is a cheap, JS-free hint
            that doesn't need to track scroll position to stay honest: the
            table is always wider than a mobile viewport here. */}
        <div className="sm:hidden pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[420px]">
          <thead>
            <tr className="text-left text-ink2 text-[10px] sm:text-xs uppercase tracking-wide">
              <th className="py-2 pr-2">Team</th>
              <th className="py-2 px-1.5 sm:px-2 text-center">P</th>
              <th className="py-2 px-1.5 sm:px-2 text-center">W</th>
              <th className="py-2 px-1.5 sm:px-2 text-center">D</th>
              <th className="py-2 px-1.5 sm:px-2 text-center">L</th>
              <th className="py-2 px-1.5 sm:px-2 text-center">GF</th>
              <th className="py-2 px-1.5 sm:px-2 text-center">GA</th>
              <th className="py-2 px-1.5 sm:px-2 text-center">GD</th>
              <th className="py-2 pl-1.5 sm:pl-2 pr-1 text-center">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              // No row fill at all — just a lineSoft rule between rows.
              // bg-surface here used to be an opaque panel colour, which on
              // a frosted card painted a solid slab over the glass and made
              // the table look pasted on. The edge-fade below is from-white
              // (= --paper, the canvas) for the same reason.
              <tr key={r.team.id} className="border-b border-lineSoft last:border-b-0">
                <td className="py-3.5 pr-2 font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="text-ink3 font-medium">{i + 1}</span>
                    <TeamBadge
                      id={r.team.id}
                      name={r.team.name}
                      hasCrest={r.team.hasCrest}
                      crestUpdatedAt={r.team.crestUpdatedAt}
                      logoUrl={r.team.logoUrl}
                      sport={sport}
                      size="sm"
                    />
                    <span>{r.team.name}</span>
                  </div>
                </td>
                {/* tabular-nums alone here (not the full .font-score/display
                    treatment) — at single-digit table-cell size, every
                    column in the display face would read as uniformly heavy
                    and erase the emphasis Pts is supposed to have. */}
                <td className="tabular-nums py-3.5 px-1.5 sm:px-2 text-center text-black">{r.played}</td>
                <td className="tabular-nums py-3.5 px-1.5 sm:px-2 text-center text-black">{r.won}</td>
                <td className="tabular-nums py-3.5 px-1.5 sm:px-2 text-center text-black">{r.drawn}</td>
                <td className="tabular-nums py-3.5 px-1.5 sm:px-2 text-center text-black">{r.lost}</td>
                <td className="tabular-nums py-3.5 px-1.5 sm:px-2 text-center text-black">{r.goalsFor}</td>
                <td className="tabular-nums py-3.5 px-1.5 sm:px-2 text-center text-black">{r.goalsAgainst}</td>
                <td className="tabular-nums py-3.5 px-1.5 sm:px-2 text-center text-black">
                  {r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}
                </td>
                <td className="font-score py-3.5 pl-1.5 sm:pl-2 pr-1 text-center text-inkDisplay">{r.points}</td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
