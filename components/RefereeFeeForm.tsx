"use client";

import { useState, useTransition } from "react";
import { setRefereeFee } from "@/lib/actions";

const ROLES = [
  { value: "CENTER", label: "Center" },
  { value: "AR1", label: "AR1" },
  { value: "AR2", label: "AR2" },
  { value: "FOURTH", label: "4th" },
];

/** Sets what one official is owed for one match. Recorded, never paid. */
export function RefereeFeeForm({
  tournamentId,
  matchId,
  refereeId,
  role,
  feeCents,
}: {
  tournamentId: string;
  matchId: string;
  refereeId: string;
  role: string;
  feeCents: number;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => {
        setError(null);
        setSaved(false);
        startTransition(async () => {
          const result = await setRefereeFee(tournamentId, matchId, refereeId, fd);
          if (result.error) setError(result.error);
          else setSaved(true);
        });
      }}
      className="flex items-center gap-1.5"
    >
      <select name="role" defaultValue={role} className="input text-xs w-20 px-2 py-1.5 h-9">
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <input
        name="fee"
        className="input text-xs w-16 px-2 py-1.5 h-9"
        inputMode="decimal"
        defaultValue={(feeCents / 100).toFixed(2)}
      />
      <button type="submit" className="btn-ghost text-[11px] px-2 py-1.5" disabled={pending}>
        {saved ? "Saved" : "Set"}
      </button>
      {error && (
        <span className="text-[11px] text-warning-500" role="alert">
          {error}
        </span>
      )}
    </form>
  );
}
