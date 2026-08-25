"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { registerTeamPublic } from "@/lib/actions";

export default function RegisterPage() {
  const params = useParams<{ slug: string }>();
  const [players, setPlayers] = useState([0, 1, 2, 3]);

  return (
    <main className="min-h-screen">
      <header className="border-b border-white/5">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-4">
          <Link href="/">
            <Logo />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
        <h1 className="text-2xl font-semibold mb-1">Register your team</h1>
        <p className="text-white/50 mb-6 text-sm">
          Add your roster now — each player gets a digital GolTrack Passport with a QR code for fast check-in on
          match day.
        </p>

        <form action={registerTeamPublic.bind(null, params.slug)} className="card p-6 space-y-5">
          <div>
            <label className="label">Team name</label>
            <input className="input" name="name" required />
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
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Roster</label>
              <button
                type="button"
                className="text-xs text-pitch-400 hover:underline"
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
      </div>
    </main>
  );
}
