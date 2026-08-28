"use client";

import { useState } from "react";
import { claimPlayerPassport } from "@/lib/actions";

// Collapsed behind a toggle rather than shown inline by default — most
// people scanning a passport on match day just want the QR code, not a
// signup form in their face. Opt-in keeps the passport page itself exactly
// as scannable as before this existed.
export function ClaimPassportForm({ playerId, defaultName }: { playerId: string; defaultName: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost w-full text-sm mt-4">
        Claim this passport
      </button>
    );
  }

  return (
    <form action={claimPlayerPassport.bind(null, playerId)} className="mt-4 rounded-xl border border-black/10 p-4 space-y-3">
      <p className="text-xs text-black/40">
        Create a login for this passport to see it any time from your own dashboard.
      </p>
      <div>
        <label className="label">Your name</label>
        <input className="input" name="name" defaultValue={defaultName} required />
      </div>
      <div>
        <label className="label">Email</label>
        <input className="input" type="email" name="email" required />
      </div>
      <div>
        <label className="label">Password</label>
        <input className="input" type="password" name="password" minLength={8} required />
      </div>
      <button className="btn-primary w-full text-sm">Claim passport</button>
    </form>
  );
}
