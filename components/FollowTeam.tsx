"use client";

import { useEffect, useState } from "react";
import type { Match, Team } from "@/lib/models";

const KEY = "jogo:following";

// Per-viewer favourites in localStorage. Genuinely persistent — unlike the
// other Phase 1 wireframes, this survives a reload, because "which teams do
// I care about" is a preference belonging to one browser rather than data
// the tournament owns. No account needed, which is the point: a parent in a
// stand should not have to sign up to follow their kid's fixtures.
//
// Every access is wrapped: localStorage throws outright in some contexts
// (private windows with site data blocked, embedded webviews), and an
// unguarded read there would take the whole public page down.
function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // Preference is lost on reload; the session still works.
  }
}

export function FollowHeart({ teamId, teamName }: { teamId: string; teamName: string }) {
  const [on, setOn] = useState(false);
  // Read after mount, never during render: the server has no localStorage,
  // so reading it inline would produce different markup on the two passes
  // and trip a hydration mismatch.
  useEffect(() => setOn(read().includes(teamId)), [teamId]);

  function toggle() {
    const next = on ? read().filter((id) => id !== teamId) : [...read(), teamId];
    write(next);
    setOn(!on);
    window.dispatchEvent(new CustomEvent("jogo:following-changed"));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? `Unfollow ${teamName}` : `Follow ${teamName}`}
      className={`shrink-0 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
        on ? "badge-danger" : "border-line text-ink2 hover:text-black hover:bg-black/[0.03]"
      }`}
    >
      {on ? "♥ Following" : "♡ Follow"}
    </button>
  );
}

function fmt(iso: string | null): string {
  if (!iso) return "TBC";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "TBC"
    : d.toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" });
}

// Sticky bar of the next fixtures for whichever teams this browser follows.
// Renders nothing at all when nobody is followed, so it costs a spectator
// no screen space until they opt in.
export function FollowBar({ matches, teams }: { matches: Match[]; teams: Team[] }) {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setIds(read());
    sync();
    window.addEventListener("jogo:following-changed", sync);
    // Another tab on the same tournament should agree with this one.
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("jogo:following-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (ids.length === 0) return null;

  const byId = new Map(teams.map((t) => [t.id, t]));
  const mine = matches
    .filter((m) => m.status !== "FINAL")
    .filter((m) => ids.includes(m.homeTeamId || "") || ids.includes(m.awayTeamId || ""))
    .sort((a, b) => (a.scheduledAt || "").localeCompare(b.scheduledAt || ""))
    .slice(0, 3);

  return (
    <div className="sticky bottom-0 z-40 -mx-4 sm:-mx-6 mt-8">
      <div className="modal-panel border-x-0 border-b-0 px-4 sm:px-6 py-3">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-2">
          Following {ids.length} team{ids.length === 1 ? "" : "s"}
        </p>
        {mine.length === 0 ? (
          <p className="text-xs text-ink3">No upcoming fixtures for your teams.</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {mine.map((m) => (
              <div key={m.id} className="shrink-0 rounded-xl border border-line px-3 py-2 min-w-[13rem]">
                <p className="text-xs font-semibold truncate">
                  {byId.get(m.homeTeamId || "")?.name || "TBD"} v {byId.get(m.awayTeamId || "")?.name || "TBD"}
                </p>
                <p className="text-[11px] text-ink3 truncate">
                  {fmt(m.scheduledAt)}
                  {m.field ? ` · ${m.field}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Field map. A schematic laid out from the fixture list rather than a real
// venue map — Jogo stores a field's *name*, not its coordinates, so an
// accurate map is not derivable from the data. Pitches are drawn in order
// and lit when something is live on them, which is the part a spectator
// actually needs: which one to walk to now.
export function FieldMapCard({ matches, teams }: { matches: Match[]; teams: Team[] }) {
  const byId = new Map(teams.map((t) => [t.id, t]));
  const fields = Array.from(new Set(matches.map((m) => m.field).filter(Boolean))) as string[];
  if (fields.length === 0) return null;

  return (
    <div className="card p-5 sm:p-6">
      <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-4">Where to go</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {fields.map((f) => {
          const live = matches.find((m) => m.field === f && m.status === "LIVE");
          return (
            <div
              key={f}
              className={`relative rounded-xl border p-4 overflow-hidden ${
                live ? "badge-accepted" : "border-line"
              }`}
            >
              {/* Halfway line + centre circle: enough to read as a pitch at
                  thumbnail size without pretending to be a survey. */}
              <div className="absolute inset-x-3 top-1/2 h-px bg-current opacity-20" aria-hidden="true" />
              <div
                className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-current opacity-20"
                aria-hidden="true"
              />
              <div className="relative">
                <p className="text-sm font-extrabold truncate">{f}</p>
                {live ? (
                  <p className="text-[11px] mt-1 truncate">
                    {byId.get(live.homeTeamId || "")?.name || "TBD"} v {byId.get(live.awayTeamId || "")?.name || "TBD"}
                  </p>
                ) : (
                  <p className="text-[11px] text-ink3 mt-1">No live match</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
