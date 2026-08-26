"use client";

import { useState, useTransition } from "react";
import { checkInPlayerByPassport } from "@/lib/actions";

export function CheckInScanner({ tournamentId }: { tournamentId: string }) {
  const [value, setValue] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    startTransition(async () => {
      const result = await checkInPlayerByPassport(tournamentId, value.trim());
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok) setValue("");
    });
  }

  return (
    <div className="card p-5">
      <h3 className="font-semibold mb-1">On-site check-in</h3>
      <p className="text-sm text-black/50 mb-3">
        Scan a player&apos;s passport QR code (or type their passport ID) to verify eligibility and check them in.
      </p>
      <form onSubmit={submit} className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="Passport ID"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
        />
        <button className="btn-primary" disabled={isPending}>
          Check in
        </button>
      </form>
      {message && (
        <p className={`text-sm mt-3 ${message.ok ? "text-pitch-500" : "text-red-600"}`}>{message.text}</p>
      )}
    </div>
  );
}
