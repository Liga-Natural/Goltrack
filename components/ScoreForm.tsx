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
    // Rigid column template at sm+, so scores / status buttons / the MOTM
    // slot line up down the vertical axis across every row in the list
    // instead of each row self-sizing to its own content. The last column
    // is always present and always 11rem even when the select inside it
    // doesn't render — that empty-but-reserved cell is what keeps a
    // scheduled row's scores from sliding right relative to a final row's.
    // Flex-wrap below sm, where a fixed 3-column track can't fit.
    <div className="flex items-center gap-3 flex-wrap justify-end sm:grid sm:grid-cols-[auto_auto_11rem] sm:gap-3">
      <div className="flex items-center gap-2">
        {/* The result is the thing a director glances at first, so the
            score reads at display scale (inkDisplay, the deepest ink) while
            the controls around it stay at UI scale. font-score carries
            tabular-nums, which is what actually keeps a 1 and a 7 the same
            width so the digits stay in column down the list. */}
        <input
          type="number"
          min={0}
          className="input w-16 text-center font-score text-2xl text-inkDisplay px-0"
          value={home}
          onChange={(e) => setHome(Number(e.target.value))}
        />
        <span className="text-ink3 font-score text-xl">-</span>
        <input
          type="number"
          min={0}
          className="input w-16 text-center font-score text-2xl text-inkDisplay px-0"
          value={away}
          onChange={(e) => setAway(Number(e.target.value))}
        />
      </div>
      {/* Live/Final double as the status display (filled = current status,
          ghost = not current) instead of sitting next to a separate,
          redundant status badge repeating the same word — one indicator
          instead of two competing for the same job. Fixed widths so the
          pair occupies identical space whichever state is active. */}
      <div className="flex items-center gap-1.5">
        <button
          className={`text-xs px-0 py-1.5 w-16 ${status === "LIVE" ? "btn-secondary" : "btn-ghost"}`}
          disabled={isPending}
          onClick={() => save("LIVE")}
        >
          Live
        </button>
        <button
          className={`text-xs px-0 py-1.5 w-16 ${status === "FINAL" ? "btn-primary" : "btn-ghost"}`}
          disabled={isPending}
          onClick={() => save("FINAL")}
        >
          Final
        </button>
      </div>
      <div className="flex items-center w-full sm:w-auto">
        {status === "FINAL" && eligiblePlayers && eligiblePlayers.length > 0 && (
          // border-l divider: a deliberate, un-intrusive break between the
          // score/status cluster and this "extra" control, so it reads as a
          // separate action pinned to the far right rather than crowding
          // the score.
          <div className="flex items-center border-l border-lineSoft pl-3 w-full">
            <select
              className="input text-xs h-10 w-full"
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
    </div>
  );
}
