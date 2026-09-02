"use client";

import { useMemo, useState } from "react";
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
// blank and much taller than the screen. Columns are the fields actually in
// use, for the same reason.
export function ScheduleMatrix({
  matches,
  teams,
  referees,
  conflicts,
  divisionByTeamId = {},
}: {
  matches: Match[];
  teams: Team[];
  referees: Referee[];
  conflicts: Conflict[];
  /** Division each entrant was accepted into, where the organizer recorded one. */
  divisionByTeamId?: Record<string, string>;
}) {
  const teamsById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const refsById = useMemo(() => new Map(referees.map((r) => [r.id, r])), [referees]);

  const scheduled = useMemo(() => matches.filter((m) => m.scheduledAt && m.field), [matches]);

  // A match belongs to the division of the teams in it. Both sides normally
  // share one; a cross-division friendly has none rather than a guess.
  const divisionOf = (m: Match): string | null => {
    const home = m.homeTeamId ? divisionByTeamId[m.homeTeamId] : undefined;
    const away = m.awayTeamId ? divisionByTeamId[m.awayTeamId] : undefined;
    if (home && away) return home === away ? home : null;
    return home ?? away ?? null;
  };

  // Both filter bars are built from what this tournament actually has. No
  // U-10/U-12/U-14 ladder is offered where nobody recorded a division —
  // tabs that filter to nothing are worse than no tabs.
  const divisions = useMemo(() => {
    const found = new Set<string>();
    for (const m of scheduled) {
      const d = divisionOf(m);
      if (d) found.add(d);
    }
    return [...found].sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduled, divisionByTeamId]);

  const stages = useMemo(() => {
    const groups = new Set<string>();
    const rounds = new Set<string>();
    for (const m of scheduled) {
      if (m.stage === "GROUP" && m.groupName) groups.add(m.groupName);
      if (m.stage !== "GROUP" && m.round) rounds.add(m.round);
    }
    return [
      ...[...groups].sort().map((g) => ({ key: `GROUP:${g}`, label: `Group ${g}` })),
      ...[...rounds].sort().map((r) => ({ key: `ROUND:${r}`, label: r })),
    ];
  }, [scheduled]);

  const [division, setDivision] = useState<string>("ALL");
  const [stage, setStage] = useState<string>("ALL");
  const [selected, setSelected] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      scheduled.filter((m) => {
        if (division !== "ALL" && divisionOf(m) !== division) return false;
        if (stage === "ALL") return true;
        const [kind, value] = stage.split(":");
        return kind === "GROUP" ? m.stage === "GROUP" && m.groupName === value : m.stage !== "GROUP" && m.round === value;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scheduled, division, stage, divisionByTeamId]
  );

  const fields = useMemo(() => Array.from(new Set(visible.map((m) => m.field as string))).sort(), [visible]);
  const slots = useMemo(() => Array.from(new Set(visible.map((m) => m.scheduledAt as string))).sort(), [visible]);

  // matchId -> the conflicts touching it, so a cell can carry its own reason
  // rather than the page just listing warnings somewhere above the grid.
  const flagged = useMemo(() => {
    const map = new Map<string, Conflict[]>();
    for (const c of conflicts) {
      for (const id of c.matchIds) map.set(id, [...(map.get(id) ?? []), c]);
    }
    return map;
  }, [conflicts]);

  if (scheduled.length === 0) {
    return <p className="text-sm text-ink2 py-10 text-center">Nothing scheduled with a time and field yet.</p>;
  }

  const at = (field: string, slot: string) => visible.find((m) => m.field === field && m.scheduledAt === slot);
  let lastDay = "";

  // Clay pills: a raised lozenge that presses in when it is the selected
  // one, which is the same physics as every other control in the system.
  const pill = (active: boolean) =>
    `shrink-0 whitespace-nowrap text-xs px-4 py-2 rounded-full transition-[box-shadow,background-color,color] ${
      active
        ? "clay-pill-active bg-pitch-400/15 text-inkDisplay font-semibold"
        : "bg-surface2 text-ink2 hover:text-inkDisplay clay-pill-raised"
    }`;

  return (
    <div className="space-y-4">
      {/* Age groups. Scrolls sideways on a phone rather than wrapping into a
          block that pushes the grid off the first screen. */}
      <div>
        <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-2">Age group</span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button type="button" onClick={() => setDivision("ALL")} className={pill(division === "ALL")}>
            All
          </button>
          {divisions.map((d) => (
            <button key={d} type="button" onClick={() => setDivision(d)} className={pill(division === d)}>
              {d}
            </button>
          ))}
          {divisions.length === 0 && (
            <span className="text-[11px] text-ink3">
              No divisions recorded on this event’s entrants, so there is nothing to split by yet.
            </span>
          )}
        </div>
      </div>

      {/* Stage. Group letters and knockout rounds, whichever exist. */}
      <div>
        <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-2">Stage</span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button type="button" onClick={() => setStage("ALL")} className={pill(stage === "ALL")}>
            All matches
          </button>
          {stages.map((s) => (
            <button key={s.key} type="button" onClick={() => setStage(s.key)} className={pill(stage === s.key)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-ink3">
        {visible.length} of {scheduled.length} scheduled {scheduled.length === 1 ? "match" : "matches"}
        {fields.length > 0 ? ` · ${fields.length} field${fields.length === 1 ? "" : "s"} in use` : ""}
      </p>

      {visible.length === 0 ? (
        <p className="text-sm text-ink2 py-10 text-center">Nothing matches that combination of age group and stage.</p>
      ) : (
        // The grid is wider than a phone by nature — several columns of
        // fixtures cannot compress. Scrolls inside its own bounds, with the
        // time column pinned so a row stays identifiable once you scroll right.
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full text-sm border-separate border-spacing-0 min-w-[44rem]">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-surface text-left text-[11px] uppercase tracking-wide text-ink2 font-semibold py-2 pr-3">
                  Time
                </th>
                {fields.map((f) => (
                  <th key={f} className="text-left py-2 px-1.5">
                    <span className="inline-block rounded-full bg-surface2 px-3.5 py-1.5 text-[11px] uppercase tracking-wide text-ink2 font-semibold clay-pill-raised">
                      {f}
                    </span>
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
                    <th className="sticky left-0 z-10 bg-surface text-left align-top py-3 pr-3 border-t border-lineSoft whitespace-nowrap">
                      <span className="font-score text-sm text-inkDisplay">{slotLabel(slot)}</span>
                      {/* The date only prints when it changes, so a two-day
                          tournament reads as two blocks instead of repeating
                          the same date down every row. */}
                      {newDay && <span className="block text-[10px] text-ink3 font-normal">{day}</span>}
                    </th>
                    {fields.map((f) => {
                      const m = at(f, slot);
                      if (!m) {
                        return (
                          <td key={f} className="py-3 px-3 border-t border-lineSoft align-top text-ink3 text-xs">
                            —
                          </td>
                        );
                      }
                      const issues = flagged.get(m.id) ?? [];
                      const ref = m.refereeId ? refsById.get(m.refereeId) : null;
                      const div = divisionOf(m);
                      const isSelected = selected === m.id;
                      return (
                        <td key={f} className="py-2 px-1.5 border-t border-lineSoft align-top">
                          <button
                            type="button"
                            onClick={() => setSelected(isSelected ? null : m.id)}
                            className={`w-full text-left rounded-2xl p-3 bg-surface2 transition-[box-shadow,transform] active:translate-y-[1px] ${
                              isSelected
                                ? "border border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                                : issues.length > 0
                                  ? "badge-danger clay-tile"
                                  : "clay-tile"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1.5 mb-1">
                              <span className="text-[10px] uppercase tracking-wide opacity-70 truncate">
                                {m.stage === "GROUP" && m.groupName ? `Group ${m.groupName}` : m.round}
                              </span>
                              <StatusChip status={m.status} />
                            </div>
                            {div && (
                              <span className="badge bg-neutralBadge text-ink2 border border-line text-[10px] mb-1 inline-block">
                                {div}
                              </span>
                            )}
                            <div className="text-xs font-semibold space-y-0.5">
                              <div className="truncate">
                                <TeamInline team={teamsById.get(m.homeTeamId || "")} sport="Soccer" />
                              </div>
                              <div className="truncate">
                                <TeamInline team={teamsById.get(m.awayTeamId || "")} sport="Soccer" />
                              </div>
                            </div>
                            {m.status === "FINAL" && (
                              <p className="font-score text-sm text-inkDisplay mt-1">
                                {m.homeScore ?? 0} – {m.awayScore ?? 0}
                              </p>
                            )}
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
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// LIVE keeps its colour in both themes; the other two stay quiet so a live
// match is the thing your eye lands on in a grid of forty fixtures.
function StatusChip({ status }: { status: string }) {
  if (status === "LIVE") {
    return (
      <span className="badge live-chip text-[10px] inline-flex items-center gap-1 shrink-0">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
        </span>
        LIVE
      </span>
    );
  }
  if (status === "FINAL") {
    return <span className="badge bg-neutralBadge text-ink2 border border-line text-[10px] shrink-0">FINAL</span>;
  }
  return <span className="badge badge-pending text-[10px] shrink-0">UPCOMING</span>;
}
