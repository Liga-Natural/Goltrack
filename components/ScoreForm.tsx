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
    <div className="flex items-center gap-2 flex-wrap justify-end">
      <input
        type="number"
        min={0}
        className="input w-14 text-center"
        value={home}
        onChange={(e) => setHome(Number(e.target.value))}
      />
      <span className="text-black/30">-</span>
      <input
        type="number"
        min={0}
        className="input w-14 text-center"
        value={away}
        onChange={(e) => setAway(Number(e.target.value))}
      />
      <button className="btn-secondary text-xs px-2 py-1.5" disabled={isPending} onClick={() => save("LIVE")}>
        Live
      </button>
      <button className="btn-primary text-xs px-2 py-1.5" disabled={isPending} onClick={() => save("FINAL")}>
        Final
      </button>
      {status === "FINAL" && eligiblePlayers && eligiblePlayers.length > 0 && (
        <select
          className="input text-xs py-1.5 w-40"
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
      )}
    </div>
  );
}
