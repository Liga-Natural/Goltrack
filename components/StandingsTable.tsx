import { StandingRow } from "@/lib/standings";
import { TeamBadge } from "@/components/TeamBadge";

export function StandingsTable({ rows, title, sport }: { rows: StandingRow[]; title?: string; sport: string }) {
  return (
    <div className="overflow-x-auto">
      {title && <h3 className="font-semibold mb-2 text-sm text-black/70">{title}</h3>}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-black/40 text-xs uppercase tracking-wide">
            <th className="py-2 pr-2">Team</th>
            <th className="py-2 px-2 text-center">P</th>
            <th className="py-2 px-2 text-center">W</th>
            <th className="py-2 px-2 text-center">D</th>
            <th className="py-2 px-2 text-center">L</th>
            <th className="py-2 px-2 text-center">GF</th>
            <th className="py-2 px-2 text-center">GA</th>
            <th className="py-2 px-2 text-center">GD</th>
            <th className="py-2 pl-2 text-center">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.team.id} className="border-t border-black/5">
              <td className="py-2 pr-2 font-medium">
                <div className="flex items-center gap-2">
                  <span className="text-black/30">{i + 1}</span>
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
              <td className="py-2 px-2 text-center text-black/60">{r.played}</td>
              <td className="py-2 px-2 text-center text-black/60">{r.won}</td>
              <td className="py-2 px-2 text-center text-black/60">{r.drawn}</td>
              <td className="py-2 px-2 text-center text-black/60">{r.lost}</td>
              <td className="py-2 px-2 text-center text-black/60">{r.goalsFor}</td>
              <td className="py-2 px-2 text-center text-black/60">{r.goalsAgainst}</td>
              <td className="py-2 px-2 text-center text-black/60">{r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}</td>
              <td className="py-2 pl-2 text-center font-semibold">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
