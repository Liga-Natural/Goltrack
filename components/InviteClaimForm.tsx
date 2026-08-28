"use client";

import { useState } from "react";
import { claimTeamInvite } from "@/lib/actions";

export function InviteClaimForm({ token }: { token: string }) {
  const [players, setPlayers] = useState([0, 1, 2, 3]);

  return (
    <form action={claimTeamInvite.bind(null, token)} className="card p-6 space-y-5">
      <div>
        <label className="label">Team name</label>
        <input className="input" name="name" required />
        <p className="text-xs text-black/30 mt-1">You&apos;ll get a link to upload your team crest right after this.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Captain / contact name</label>
          <input className="input" name="contactName" required />
        </div>
        <div>
          <label className="label">Contact email</label>
          <input className="input" type="email" name="contactEmail" required />
        </div>
      </div>
      <div>
        <label className="label">Password</label>
        <input className="input" type="password" name="password" minLength={8} required />
        <p className="text-xs text-black/30 mt-1">
          At least 8 characters — this logs you into your team&apos;s dashboard after you register.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Roster</label>
          <button
            type="button"
            className="text-xs text-pitch-600 hover:underline"
            onClick={() => setPlayers((p) => [...p, p.length])}
          >
            + Add player
          </button>
        </div>
        <div className="space-y-2">
          {players.map((i) => (
            <div key={i} className="flex gap-2">
              <input className="input flex-1" name="playerName" placeholder={`Player ${i + 1} name`} />
              <input className="input w-20" name="playerJersey" placeholder="#" />
            </div>
          ))}
        </div>
      </div>

      <button className="btn-primary w-full">Continue to payment</button>
    </form>
  );
}
