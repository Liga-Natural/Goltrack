import type { Match, Team, Referee } from "@/lib/models";
import type { Conflict } from "@/lib/conflicts";
import { REST_MINUTES } from "@/lib/conflicts";
import { TeamInline } from "@/components/TeamInline";

function slotLabel(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

// Field × time-slot grid — the shape every tournament desk already works in,
// because "what is on Field 2 at 10:15" is the question asked all day and a
// flat fixture list answers it slowly.
//
// Rows are real kick-off times taken from the fixtures rather than a
// synthetic every-15-minutes axis: a generated schedule lands on regular
// centres, and inventing empty rows between them would make the grid mostly
// blank and much taller than the screen.
export function ScheduleMatrix({
  matches,
  teams,
  referees,
  conflicts,
}: {
  matches: Match[];
  teams: Team[];
  referees: Referee[];
  conflicts: Conflict[];
}) {
  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const refsById = new Map(referees.map((r) => [r.id, r]));

  const scheduled = matches.filter((m) => m.scheduledAt && m.field);
  if (scheduled.length === 0) {
    return <p className="text-sm text-ink2 py-10 text-center">Nothing scheduled with a time and field yet.</p>;
  }

  const fields = Array.from(new Set(scheduled.map((m) => m.field as string))).sort();
  const slots = Array.from(new Set(scheduled.map((m) => m.scheduledAt as string))).sort();

  // matchId -> the conflicts touching it, so a cell can carry its own reason
  // rather than the page just listing warnings somewhere above the grid.
  const flagged = new Map<string, Conflict[]>();
  for (const c of conflicts) {
    for (const id of c.matchIds) {
      flagged.set(id, [...(flagged.get(id) ?? []), c]);
    }
  }

  const at = (field: string, slot: string) =>
    scheduled.find((m) => m.field === field && m.scheduledAt === slot);

  let lastDay = "";

  return (
    // The grid is wider than a phone by nature — six columns of fixtures
    // cannot compress. Scrolls inside its own bounds, with the time column
    // pinned so a row stays identifiable once you scroll right.
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full text-sm border-separate border-spacing-0 min-w-[44rem]">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white text-left text-[11px] uppercase tracking-wide text-ink2 font-semibold py-2 pr-3">
              Time
            </th>
            {fields.map((f) => (
              <th key={f} className="text-left text-[11px] uppercase tracking-wide text-ink2 font-semibold py-2 px-3">
                {f}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => {
            const day = dayLabel(slot);
            const newDay = day !== lastDay;
            lastDay = day;
            return (
              <tr key={slot}>
                <th className="sticky left-0 z-10 bg-white text-left align-top py-3 pr-3 border-t border-lineSoft whitespace-nowrap">
                  <span className="font-score text-sm text-inkDisplay">{slotLabel(slot)}</span>
                  {/* The date only prints when it changes, so a two-day
                      tournament reads as two blocks instead of repeating the
                      same date down every row. */}
                  {newDay && <span className="block text-[10px] text-ink3 font-normal">{day}</span>}
                </th>
                {fields.map((f) => {
                  const m = at(f, slot);
                  if (!m) {
                    return <td key={f} className="py-3 px-3 border-t border-lineSoft align-top text-ink3 text-xs">—</td>;
                  }
                  const issues = flagged.get(m.id) ?? [];
                  const ref = m.refereeId ? refsById.get(m.refereeId) : null;
                  return (
                    <td key={f} className="py-2 px-1.5 border-t border-lineSoft align-top">
                      <div
                        className={`rounded-lg p-2.5 border ${
                          issues.length > 0 ? "badge-danger" : "border-line"
                        }`}
                      >
                        <p className="text-[10px] uppercase tracking-wide opacity-70 truncate">
                          {m.round}
                        </p>
                        <div className="text-xs font-semibold mt-1 space-y-0.5">
                          <div className="truncate">
                            <TeamInline team={teamsById.get(m.homeTeamId || "")} sport="Soccer" />
                          </div>
                          <div className="truncate">
                            <TeamInline team={teamsById.get(m.awayTeamId || "")} sport="Soccer" />
                          </div>
                        </div>
                        <p className="text-[10px] mt-1.5 opacity-70 truncate">
                          {ref ? `Ref: ${ref.name}` : "No referee assigned"}
                        </p>
                        {issues.length > 0 && (
                          <p className="text-[10px] font-bold mt-1.5 uppercase tracking-wide">
                            {issues.some((i) => i.kind === "FIELD_DOUBLE_BOOKED")
                              ? "Double-booked"
                              : issues.some((i) => i.kind === "TEAM_DOUBLE_BOOKED")
                                ? "Team clash"
                                : `Rest < ${REST_MINUTES}min`}
                          </p>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
