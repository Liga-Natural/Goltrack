"use client";

import { useState, useTransition } from "react";
import { updateMatchScore, setMatchMotm } from "@/lib/actions";
import type { Player } from "@/lib/models";

export function ScoreForm({
  tournamentId,
  matchId,
  initialHome,
  initialAway,
  initialStatus,
  initialMotm,
  eligiblePlayers,
}: {
  tournamentId: string;
  matchId: string;
  initialHome: number | null;
  initialAway: number | null;
  initialStatus: string;
  initialMotm?: string | null;
  eligiblePlayers?: Player[];
}) {
  const [home, setHome] = useState(initialHome ?? 0);
  const [away, setAway] = useState(initialAway ?? 0);
  const [status, setStatus] = useState(initialStatus);
  const [motm, setMotm] = useState(initialMotm ?? "");
  const [isPending, startTransition] = useTransition();

  function save(nextStatus?: string) {
    const s = (nextStatus ?? status) as "SCHEDULED" | "LIVE" | "FINAL";
    startTransition(() => {
      updateMatchScore(tournamentId, matchId, home, away, s);
      setStatus(s);
    });
  }

  function saveMotm(playerId: string) {
    setMotm(playerId);
    startTransition(() => {
      setMatchMotm(tournamentId, matchId, playerId);
    });
  }

  return (
    <div className="flex items-center gap-3 flex-wrap justify-end">
      <div className="flex items-center gap-2">
        {/* Bigger, bolder score boxes — the actual result is the thing a
            director glances at first, so it should read at a glance instead
            of blending in with the surrounding controls at input-field
            size. */}
        <input
          type="number"
          min={0}
          className="input w-16 h-12 text-center font-score text-2xl px-0"
          value={home}
          onChange={(e) => setHome(Number(e.target.value))}
        />
        <span className="text-black/30 font-score text-xl">-</span>
        <input
          type="number"
          min={0}
          className="input w-16 h-12 text-center font-score text-2xl px-0"
          value={away}
          onChange={(e) => setAway(Number(e.target.value))}
        />
      </div>
      {/* Live/Final now double as the status display (filled = current
          status, ghost = not current) instead of sitting next to a
          separate, redundant MatchStatusBadge repeating the same word —
          one indicator instead of two competing for the same job. */}
      <div className="flex items-center gap-1.5">
        <button
          className={status === "LIVE" ? "btn-secondary text-xs px-2.5 py-1.5" : "btn-ghost text-xs px-2.5 py-1.5"}
          disabled={isPending}
          onClick={() => save("LIVE")}
        >
          Live
        </button>
        <button
          className={status === "FINAL" ? "btn-primary text-xs px-2.5 py-1.5" : "btn-ghost text-xs px-2.5 py-1.5"}
          disabled={isPending}
          onClick={() => save("FINAL")}
        >
          Final
        </button>
      </div>
      {status === "FINAL" && eligiblePlayers && eligiblePlayers.length > 0 && (
        // border-l divider: a deliberate, un-intrusive break between the
        // score/status cluster and this "extra" control, so it reads as a
        // separate action pinned to the far right rather than crowding the
        // score.
        <div className="flex items-center border-l border-hairline pl-3 w-full sm:w-auto">
          <select
            // Fixed w-40 clipped "Man of the match" on mobile, where this
            // wraps to its own row anyway (flex-wrap on the parent) — full
            // width there actually has the room, so use it instead of
            // truncating; back to a compact fixed width once it's sharing a
            // row with the score inputs and buttons on wider screens.
            className="input text-xs py-1.5 w-full sm:w-40"
            value={motm}
            onChange={(e) => saveMotm(e.target.value)}
          >
            <option value="">⭐ Man of the match</option>
            {eligiblePlayers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
