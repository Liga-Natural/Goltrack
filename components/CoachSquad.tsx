"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Portal } from "./Portal";
import { updatePlayerProfile, recordPlayerMetrics, setPlayerAvailability, sendCallUps } from "@/lib/actions";
import type { Player } from "@/lib/models";

export interface SquadRow {
  player: Player;
  status: string;
  yellows: number;
  reds: number;
  suspended: boolean;
  tested: boolean;
}

const STATUSES: { value: string; label: string; tone: string }[] = [
  { value: "ATTENDING", label: "In", tone: "badge-accepted" },
  { value: "INJURED", label: "Injured", tone: "badge-pending" },
  { value: "ABSENT", label: "Out", tone: "badge-danger" },
  { value: "NO_REPLY", label: "No reply", tone: "" },
];

export function CoachSquad({
  teamId,
  matchId,
  rows,
  matchLabel,
}: {
  teamId: string;
  matchId: string | null;
  rows: SquadRow[];
  matchLabel: string | null;
}) {
  const [editing, setEditing] = useState<Player | null>(null);
  const [testing, setTesting] = useState<Player | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setStatus(playerId: string, status: string) {
    if (!matchId) return;
    setError(null);
    startTransition(async () => {
      const result = await setPlayerAvailability(matchId, playerId, status);
      if (result.error) setError(result.error);
    });
  }

  const attending = rows.filter((r) => r.status === "ATTENDING").length;
  const noReply = rows.filter((r) => r.status === "NO_REPLY").length;

  return (
    <div className="space-y-4">
      {matchId && (
        <div className="card p-4 sm:p-5 flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-inkDisplay truncate">{matchLabel}</p>
            <p className="text-[11px] text-ink3">
              {attending} confirmed · {noReply} no reply
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary text-xs shrink-0"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await sendCallUps(teamId, matchId);
                setNotice(result.error || result.detail);
              })
            }
          >
            Send call-up
          </button>
        </div>
      )}
      {notice && (
        <p className="text-xs text-ink2" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="text-sm text-warning-500" role="alert">
          {error}
        </p>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[42rem]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-ink3 border-b border-lineSoft">
                <th className="text-left font-semibold px-4 py-3">Player</th>
                <th className="text-left font-semibold px-2 py-3">Position</th>
                <th className="text-left font-semibold px-2 py-3">Cards</th>
                <th className="text-left font-semibold px-2 py-3">Matchday</th>
                <th className="text-right font-semibold px-4 py-3">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lineSoft">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-ink2">
                    No players on this squad yet.
                  </td>
                </tr>
              ) : (
                rows.map(({ player, status, yellows, reds, suspended, tested }) => (
                  <tr key={player.id} className={suspended ? "opacity-70" : ""}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-score text-xs text-ink3 w-8 shrink-0">
                          {player.jerseyNumber ? `#${player.jerseyNumber}` : "—"}
                        </span>
                        <div className="min-w-0">
                          <Link
                            href={`/player/${player.id}`}
                            className="font-semibold truncate block hover:text-pitch-500"
                          >
                            {player.name}
                          </Link>
                          {!tested && <span className="text-[10px] text-ink3">not tested</span>}
                        </div>
                        {suspended && <span className="badge badge-danger text-[10px] shrink-0">SUSPENDED</span>}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-ink2 whitespace-nowrap">
                      {player.position || "—"}
                      {player.secondaryPosition && <span className="text-ink3"> / {player.secondaryPosition}</span>}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap">
                      {yellows === 0 && reds === 0 ? (
                        <span className="text-ink3">—</span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          {yellows > 0 && <span className="badge badge-pending text-[10px]">{yellows}Y</span>}
                          {reds > 0 && <span className="badge badge-danger text-[10px]">{reds}R</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      {matchId ? (
                        <div className="flex items-center gap-1">
                          {STATUSES.map((s) => (
                            <button
                              key={s.value}
                              type="button"
                              disabled={pending}
                              onClick={() => setStatus(player.id, s.value)}
                              className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                                status === s.value
                                  ? "border-pitch-400 bg-pitch-400/10 text-inkDisplay font-semibold"
                                  : "border-line text-ink3 hover:border-black/25"
                              }`}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-ink3 text-xs">No fixture</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          className="btn-ghost text-[11px] px-2.5 py-1.5"
                          onClick={() => setEditing(player)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-ghost text-[11px] px-2.5 py-1.5"
                          onClick={() => setTesting(player)}
                        >
                          Test
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(editing || testing) && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <button
              type="button"
              aria-label="Close"
              className="absolute inset-0 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm"
              onClick={() => {
                setEditing(null);
                setTesting(null);
                setError(null);
              }}
            />
            <div className="relative modal-panel rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              {editing && (
                <PlayerForm
                  player={editing}
                  pending={pending}
                  error={error}
                  onCancel={() => setEditing(null)}
                  onSubmit={(fd) =>
                    startTransition(async () => {
                      setError(null);
                      const result = await updatePlayerProfile(editing.id, fd);
                      if (result.error) setError(result.error);
                      else setEditing(null);
                    })
                  }
                />
              )}
              {testing && (
                <MetricsForm
                  player={testing}
                  pending={pending}
                  error={error}
                  onCancel={() => setTesting(null)}
                  onSubmit={(fd) =>
                    startTransition(async () => {
                      setError(null);
                      const result = await recordPlayerMetrics(testing.id, fd);
                      if (result.error) setError(result.error);
                      else setTesting(null);
                    })
                  }
                />
              )}
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-ink3 mt-1">{hint}</span>}
    </label>
  );
}

function Shell({
  title,
  hint,
  children,
  submitLabel,
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
  submitLabel: string;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (fd: FormData) => void;
}) {
  return (
    <form action={onSubmit} className="space-y-4">
      <div>
        <h3 className="text-lg font-extrabold text-inkDisplay">{title}</h3>
        <p className="text-xs text-ink3 mt-1">{hint}</p>
      </div>
      {children}
      {error && (
        <p className="text-xs text-warning-500" role="alert">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2 pt-1">
        <button type="submit" className="btn-primary text-sm flex-1" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
        <button type="button" className="btn-ghost text-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function PlayerForm({
  player,
  ...rest
}: {
  player: Player;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (fd: FormData) => void;
}) {
  return (
    <Shell title={player.name} hint="Squad number, positions, and the highlight link." submitLabel="Save" {...rest}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Jersey #">
          <input name="jerseyNumber" className="input w-full" defaultValue={player.jerseyNumber ?? ""} />
        </Field>
        <Field label="Class of">
          <input name="graduationYear" className="input w-full" defaultValue={player.graduationYear ?? ""} placeholder="2029" />
        </Field>
        <Field label="Primary position">
          <input name="position" className="input w-full" defaultValue={player.position ?? ""} placeholder="CB" />
        </Field>
        <Field label="Secondary">
          <input name="secondaryPosition" className="input w-full" defaultValue={player.secondaryPosition ?? ""} placeholder="CDM" />
        </Field>
      </div>
      <Field label="Highlight link" hint="Jogo stores the link, not the video.">
        <input name="videoUrl" className="input w-full" defaultValue={player.videoUrl ?? ""} placeholder="https://…" />
      </Field>
      <Field label="Who can open it">
        <select name="videoPrivacy" className="input w-full" defaultValue={player.videoPrivacy}>
          <option value="PRIVATE">Private — the player, their coach, the organizer</option>
          <option value="SCOUTS">Scouts only — same as private today</option>
          <option value="PUBLIC">Public — anyone with the profile link</option>
        </select>
      </Field>
      {/* Said plainly rather than implied by a dropdown that looks functional:
          there are no scout accounts in Jogo, so SCOUTS cannot mean anything
          different from PRIVATE yet. */}
      <p className="text-[11px] text-warning-500">
        &ldquo;Scouts only&rdquo; behaves exactly like private for now — Jogo has no scout account type to open it up
        to, so it is stored as your intent rather than enforced as a separate audience.
      </p>
    </Shell>
  );
}

function MetricsForm({
  player,
  ...rest
}: {
  player: Player;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (fd: FormData) => void;
}) {
  return (
    <Shell
      title={`Combine — ${player.name}`}
      hint="Type what the stopwatch said. Leave anything untested blank; blank is different from zero."
      submitLabel="Record results"
      {...rest}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="40-yard (s)">
          <input name="sprint40" className="input w-full" inputMode="decimal" placeholder="5.12" />
        </Field>
        <Field label="Vertical (in)">
          <input name="verticalJump" className="input w-full" inputMode="decimal" placeholder="24.5" />
        </Field>
        <Field label="Top speed (mph)">
          <input name="topSpeed" className="input w-full" inputMode="decimal" placeholder="17.4" />
        </Field>
        <Field label="Distance (mi)">
          <input name="distance" className="input w-full" inputMode="decimal" placeholder="4.2" />
        </Field>
        <Field label="Yo-Yo level">
          <input name="yoyo" className="input w-full" inputMode="decimal" placeholder="16.5" />
        </Field>
      </div>
      <p className="text-[11px] text-ink3">
        Top speed and distance are hand-entered too — Jogo has no GPS vest or wearable integration, so these are
        whatever your tracking kit reported.
      </p>
    </Shell>
  );
}
