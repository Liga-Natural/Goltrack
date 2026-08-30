"use client";

import { useState } from "react";
import type { Conflict } from "@/lib/conflicts";

// PHASE 1 WIREFRAME for the status itself: venue state and the broadcast it
// would trigger are front-end state only. There is no column for a
// tournament's operational status and no mail/SMS provider to broadcast
// through, so switching this changes what the organizer sees and nothing
// else. The label says so rather than implying a message went out.
//
// The conflict cards below it are NOT a wireframe — findConflicts() reads
// the real fixture list, so those warnings are true.
const STATES = [
  { key: "OPEN", label: "Fields open", cls: "badge-accepted" },
  { key: "DELAY", label: "Weather delay", cls: "badge-pending" },
  { key: "PAUSED", label: "Games paused", cls: "badge-danger" },
] as const;

export function VenueStatusBar({ conflicts }: { conflicts: Conflict[] }) {
  const [status, setStatus] = useState<string>("OPEN");
  const [sent, setSent] = useState(false);

  return (
    <div className="space-y-4 mb-6">
      <div className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          {/* No separate "current state" badge: the selected toggle already
              is the state, and showing both rendered "Fields open" twice
              side by side. The active pill carries the status colour. */}
          <div className="flex flex-wrap gap-1.5">
            {STATES.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => {
                  setStatus(s.key);
                  setSent(false);
                }}
                aria-pressed={status === s.key}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                  status === s.key
                    ? `badge ${s.cls}`
                    : "border-line text-ink2 hover:text-black hover:bg-black/[0.03]"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSent(true)}
            className="btn-secondary text-xs ml-auto shrink-0"
          >
            {sent ? "Queued ✓" : "Broadcast to all teams"}
          </button>
        </div>
        <p className="text-[11px] text-ink3 mt-2.5">
          Wireframe — venue status and broadcast are local state. No provider is connected to deliver them yet.
        </p>
      </div>

      {conflicts.length > 0 && (
        <div className="space-y-2">
          {conflicts.map((c, i) => (
            <div
              key={`${c.kind}-${i}`}
              className="card badge-danger flex items-start gap-3 p-4 rounded-2xl"
            >
              <span className="text-base leading-none mt-0.5 shrink-0" aria-hidden="true">⚠</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{c.title}</p>
                <p className="text-xs opacity-80 mt-0.5">{c.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
