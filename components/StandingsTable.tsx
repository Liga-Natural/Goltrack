import { StandingRow } from "@/lib/standings";

export function StandingsTable({ rows, title }: { rows: StandingRow[]; title?: string }) {
  return (
    <div className="overflow-x-auto">
      {title && <h3 className="font-semibold mb-2 text-sm text-white/70">{title}</h3>}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-white/40 text-xs uppercase tracking-wide">
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
            <tr key={r.team.id} className="border-t border-white/5">
              <td className="py-2 pr-2 font-medium">
                <span className="text-white/30 mr-2">{i + 1}</span>
                {r.team.name}
              </td>
              <td className="py-2 px-2 text-center text-white/60">{r.played}</td>
              <td className="py-2 px-2 text-center text-white/60">{r.won}</td>
              <td className="py-2 px-2 text-center text-white/60">{r.drawn}</td>
              <td className="py-2 px-2 text-center text-white/60">{r.lost}</td>
              <td className="py-2 px-2 text-center text-white/60">{r.goalsFor}</td>
              <td className="py-2 px-2 text-center text-white/60">{r.goalsAgainst}</td>
              <td className="py-2 px-2 text-center text-white/60">{r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}</td>
              <td className="py-2 pl-2 text-center font-semibold">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
