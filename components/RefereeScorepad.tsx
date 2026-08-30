"use client";

import { useState } from "react";

// PHASE 1 WIREFRAME.
//
// The score counters, card tally and PIN screen are front-end state. Two
// things genuinely block persistence here and both are out of scope for a
// wireframe pass: there is no referee PIN column to check a code against,
// and no discipline table to record yellows and reds in. updateMatchScore
// exists but is gated on requireOwnedTournament — correct, since a referee
// is not the organizer, and opening it up needs a real referee auth model
// rather than a shared code.
//
// So: the interaction is complete and walkable, and the submit button says
// plainly that it does not yet write. That is the honest half — a button
// labelled "Submit final score" that silently discarded a result would be
// the worst possible failure on a match day.
const PIN = "1234";

function Tally({
  label,
  value,
  onAdd,
  onSub,
  big,
}: {
  label: string;
  value: number;
  onAdd: () => void;
  onSub: () => void;
  big?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onSub}
        aria-label={`Subtract ${label}`}
        className="h-11 w-11 shrink-0 rounded-full border border-line text-lg font-bold text-ink2 active:scale-95 transition-transform"
      >
        −
      </button>
      <span className={`font-score tabular-nums text-inkDisplay text-center ${big ? "text-5xl w-20" : "text-2xl w-12"}`}>
        {value}
      </span>
      <button
        type="button"
        onClick={onAdd}
        aria-label={`Add ${label}`}
        className="h-11 w-11 shrink-0 rounded-full border border-line text-lg font-bold text-black active:scale-95 transition-transform"
      >
        +
      </button>
    </div>
  );
}

export function RefereeScorepad({
  homeName,
  awayName,
  meta,
}: {
  homeName: string;
  awayName: string;
  meta: string;
}) {
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [err, setErr] = useState(false);
  const [home, setHome] = useState(0);
  const [away, setAway] = useState(0);
  const [cards, setCards] = useState({ hy: 0, hr: 0, ay: 0, ar: 0 });
  const [submitted, setSubmitted] = useState(false);

  const bump = (k: keyof typeof cards, d: number) =>
    setCards((c) => ({ ...c, [k]: Math.max(0, c[k] + d) }));

  if (!unlocked) {
    return (
      <div className="card p-6 max-w-sm mx-auto text-center">
        <h1 className="text-xl font-extrabold text-inkDisplay mb-1">Referee access</h1>
        <p className="text-xs text-ink3 mb-6">{meta}</p>
        <input
          className="input text-center font-score text-2xl tracking-[0.4em] mb-3"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, ""));
            setErr(false);
          }}
          placeholder="••••"
          aria-label="Referee PIN"
        />
        {err && <p className="badge badge-danger text-xs w-full justify-center mb-3">Wrong PIN</p>}
        <button
          type="button"
          onClick={() => (pin === PIN ? setUnlocked(true) : setErr(true))}
          className="btn-primary w-full text-sm py-2.5"
        >
          Unlock scorepad
        </button>
        <p className="text-[11px] text-ink3 mt-4">Wireframe — demo PIN is 1234. No referee PIN is stored yet.</p>
      </div>
    );
  }

  return (
    <div className="card p-5 sm:p-6 max-w-sm mx-auto">
      <p className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-4 text-center">{meta}</p>

      {[
        { name: homeName, score: home, set: setHome, y: "hy", r: "hr" },
        { name: awayName, score: away, set: setAway, y: "ay", r: "ar" },
      ].map((side) => (
        <div key={side.name} className="py-4 border-b border-lineSoft last:border-b-0">
          <p className="text-sm font-semibold truncate mb-3">{side.name}</p>
          <div className="flex items-center justify-between gap-3">
            <Tally
              label={`goals for ${side.name}`}
              value={side.score}
              onAdd={() => side.set((v: number) => v + 1)}
              onSub={() => side.set((v: number) => Math.max(0, v - 1))}
              big
            />
            <div className="flex flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={() => bump(side.y as keyof typeof cards, 1)}
                className="badge badge-pending text-[10px] px-2.5 py-1.5"
              >
                🟨 {cards[side.y as keyof typeof cards]}
              </button>
              <button
                type="button"
                onClick={() => bump(side.r as keyof typeof cards, 1)}
                className="badge badge-danger text-[10px] px-2.5 py-1.5"
              >
                🟥 {cards[side.r as keyof typeof cards]}
              </button>
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setSubmitted(true)}
        className="btn-primary w-full text-base py-3 mt-5"
      >
        {submitted ? "Recorded locally ✓" : "Submit final score"}
      </button>
      <p className="text-[11px] text-ink3 mt-3 text-center">
        Wireframe — this does not write to the tournament yet. Scores are still entered from the organizer&apos;s Live
        scores page.
      </p>
    </div>
  );
}
