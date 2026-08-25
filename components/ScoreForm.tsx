"use client";

import { useState, useTransition } from "react";
import { updateMatchScore } from "@/lib/actions";

export function ScoreForm({
  tournamentId,
  matchId,
  initialHome,
  initialAway,
  initialStatus,
}: {
  tournamentId: string;
  matchId: string;
  initialHome: number | null;
  initialAway: number | null;
  initialStatus: string;
}) {
  const [home, setHome] = useState(initialHome ?? 0);
  const [away, setAway] = useState(initialAway ?? 0);
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();

  function save(nextStatus?: string) {
    const s = (nextStatus ?? status) as "SCHEDULED" | "LIVE" | "FINAL";
    startTransition(() => {
      updateMatchScore(tournamentId, matchId, home, away, s);
      setStatus(s);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={0}
        className="input w-14 text-center"
        value={home}
        onChange={(e) => setHome(Number(e.target.value))}
      />
      <span className="text-white/30">-</span>
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
    </div>
  );
}
