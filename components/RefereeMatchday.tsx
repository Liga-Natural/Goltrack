"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { SignaturePad } from "./SignaturePad";
import { logMatchEvent, deleteMatchEvent, submitMatchReport } from "@/lib/actions";
import type { MatchEvent } from "@/lib/models";

export interface RosterEntry {
  id: string;
  name: string;
  jerseyNumber: string | null;
  suspended: boolean;
}

type Step = "roster" | "score" | "report";

// The whole matchday on a phone at the touchline: check the rosters, keep the
// score and the cards, then sign the card off. One screen at a time, thumb-
// sized targets, and every write goes to the server — this replaces the
// wireframe pad that could only hold state in the browser.
export function RefereeMatchday({
  matchId,
  homeName,
  awayName,
  homeTeamId,
  awayTeamId,
  homeRoster,
  awayRoster,
  events,
  playerNames,
  initialHome,
  initialAway,
  report,
  refereeName,
}: {
  matchId: string;
  homeName: string;
  awayName: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeRoster: RosterEntry[];
  awayRoster: RosterEntry[];
  events: MatchEvent[];
  playerNames: Record<string, string>;
  initialHome: number;
  initialAway: number;
  report: { homeScore: number; awayScore: number; notes: string | null; submittedAt: string } | null;
  refereeName: string;
}) {
  const [step, setStep] = useState<Step>(report ? "report" : "roster");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // The score shown is derived from recorded goals, not a separate counter —
  // two numbers that can disagree is exactly how a match card ends up not
  // matching the goals written beneath it.
  const goalsFor = (teamId: string | null) =>
    teamId ? events.filter((e) => e.type === "GOAL" && e.teamId === teamId).length : 0;
  const home = homeTeamId ? goalsFor(homeTeamId) : initialHome;
  const away = awayTeamId ? goalsFor(awayTeamId) : initialAway;

  function log(fields: Record<string, string>) {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      for (const [k, v] of Object.entries(fields)) fd.set(k, v);
      const result = await logMatchEvent(matchId, fd);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="max-w-sm mx-auto space-y-4">
      <div className="flex items-center gap-1">
        {(["roster", "score", "report"] as Step[]).map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(s)}
            className={`flex-1 text-[11px] py-2 rounded-lg border transition-colors ${
              step === s
                ? "border-pitch-400 bg-pitch-400/10 text-inkDisplay font-semibold"
                : "border-line text-ink3"
            }`}
          >
            {i + 1}. {s === "roster" ? "Roster" : s === "score" ? "Score" : "Report"}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-warning-500" role="alert">
          {error}
        </p>
      )}

      {step === "roster" && (
        <>
          <RosterCheck team={homeName} roster={homeRoster} checked={checked} setChecked={setChecked} />
          <RosterCheck team={awayName} roster={awayRoster} checked={checked} setChecked={setChecked} />
          <button type="button" className="btn-primary w-full text-sm" onClick={() => setStep("score")}>
            Rosters checked — start match
          </button>
          <p className="text-[11px] text-ink3 text-center">
            Ticks are yours to work from and are not saved: Jogo has no player photo to check a face against, so this
            is a checklist, not an identity verification.
          </p>
        </>
      )}

      {step === "score" && (
        <ScorePad
          matchId={matchId}
          homeName={homeName}
          awayName={awayName}
          homeTeamId={homeTeamId}
          awayTeamId={awayTeamId}
          homeRoster={homeRoster}
          awayRoster={awayRoster}
          events={events}
          playerNames={playerNames}
          home={home}
          away={away}
          pending={pending}
          onLog={log}
          onDelete={(id) =>
            startTransition(async () => {
              const result = await deleteMatchEvent(matchId, id);
              if (result.error) setError(result.error);
            })
          }
          onDone={() => setStep("report")}
        />
      )}

      {step === "report" && (
        <ReportForm
          matchId={matchId}
          homeName={homeName}
          awayName={awayName}
          home={report?.homeScore ?? home}
          away={report?.awayScore ?? away}
          notes={report?.notes ?? ""}
          submittedAt={report?.submittedAt ?? null}
          refereeName={refereeName}
          pending={pending}
          onError={setError}
          startTransition={startTransition}
        />
      )}
    </div>
  );
}

function RosterCheck({
  team,
  roster,
  checked,
  setChecked,
}: {
  team: string;
  roster: RosterEntry[];
  checked: Set<string>;
  setChecked: (s: Set<string>) => void;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <h2 className="text-sm font-extrabold text-inkDisplay truncate">{team}</h2>
        <span className="text-[11px] text-ink3 shrink-0">
          {roster.filter((r) => checked.has(r.id)).length}/{roster.length}
        </span>
      </div>
      {roster.length === 0 ? (
        <p className="text-xs text-ink3">No roster submitted for this team.</p>
      ) : (
        <ul className="space-y-1.5">
          {roster.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                disabled={p.suspended}
                onClick={() => {
                  const next = new Set(checked);
                  if (next.has(p.id)) next.delete(p.id);
                  else next.add(p.id);
                  setChecked(next);
                }}
                className={`w-full flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  p.suspended
                    ? "border-warning-500/40 bg-warning-500/5 cursor-not-allowed"
                    : checked.has(p.id)
                      ? "border-pitch-400 bg-pitch-400/10"
                      : "border-line"
                }`}
              >
                <span className="font-score text-xs text-ink3 w-8 shrink-0">
                  {p.jerseyNumber ? `#${p.jerseyNumber}` : "—"}
                </span>
                <span className="text-sm truncate min-w-0 flex-1">{p.name}</span>
                {/* A suspended player cannot be ticked in at all — the whole
                    point of surfacing eligibility on this screen is that the
                    referee is the last person who can stop them playing. */}
                {p.suspended ? (
                  <span className="badge badge-danger text-[10px] shrink-0">SUSPENDED</span>
                ) : (
                  checked.has(p.id) && <span className="text-pitch-500 text-sm shrink-0">✓</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ScorePad({
  homeName,
  awayName,
  homeTeamId,
  awayTeamId,
  homeRoster,
  awayRoster,
  events,
  playerNames,
  home,
  away,
  pending,
  onLog,
  onDelete,
  onDone,
}: {
  matchId: string;
  homeName: string;
  awayName: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeRoster: RosterEntry[];
  awayRoster: RosterEntry[];
  events: MatchEvent[];
  playerNames: Record<string, string>;
  home: number;
  away: number;
  pending: boolean;
  onLog: (fields: Record<string, string>) => void;
  onDelete: (id: string) => void;
  onDone: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [picker, setPicker] = useState<{ type: string; side: "home" | "away" } | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      tick.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else if (tick.current) {
      clearInterval(tick.current);
      tick.current = null;
    }
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, [running]);

  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const minute = String(Math.floor(seconds / 60));
  const roster = picker?.side === "home" ? homeRoster : awayRoster;
  const teamId = picker?.side === "home" ? homeTeamId : awayTeamId;

  return (
    <div className="space-y-4">
      <div className="card p-4 text-center">
        <p className="font-score text-4xl text-inkDisplay leading-none">{clock}</p>
        <p className="text-[11px] text-ink3 mt-1.5">
          Runs in this browser only — closing the page loses the clock, not the score.
        </p>
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            className={running ? "btn-secondary flex-1 text-sm" : "btn-primary flex-1 text-sm"}
            onClick={() => setRunning((r) => !r)}
          >
            {running ? "Pause" : seconds ? "Resume" : "Start"}
          </button>
          <button type="button" className="btn-ghost text-sm" onClick={() => setSeconds(0)}>
            Reset
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-2 gap-3 text-center">
          {(["home", "away"] as const).map((side) => (
            <div key={side}>
              <p className="text-xs text-ink2 truncate mb-1">{side === "home" ? homeName : awayName}</p>
              <p className="font-score text-5xl text-inkDisplay leading-none">{side === "home" ? home : away}</p>
              <button
                type="button"
                disabled={pending || !(side === "home" ? homeTeamId : awayTeamId)}
                onClick={() => setPicker({ type: "GOAL", side })}
                className="btn-primary w-full text-sm mt-3"
              >
                + Goal
              </button>
              <div className="flex gap-1.5 mt-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setPicker({ type: "YELLOW", side })}
                  className="btn-ghost flex-1 text-[11px] py-2"
                >
                  Yellow
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setPicker({ type: "RED", side })}
                  className="btn-ghost flex-1 text-[11px] py-2"
                >
                  Red
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-ink3 mt-3 text-center">
          The score counts recorded goals, so it can never disagree with the list below.
        </p>
      </div>

      {picker && (
        <div className="card p-4">
          <p className="text-sm font-semibold text-inkDisplay mb-2">
            {picker.type === "GOAL" ? "Who scored?" : `Who gets the ${picker.type.toLowerCase()}?`}
          </p>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {roster.map((p) => (
              <button
                key={p.id}
                type="button"
                className="w-full flex items-center gap-2.5 rounded-lg border border-line px-3 py-2.5 text-left"
                onClick={() => {
                  onLog({
                    type: picker.type,
                    side: picker.side,
                    teamId: teamId ?? "",
                    playerId: p.id,
                    minute,
                  });
                  setPicker(null);
                }}
              >
                <span className="font-score text-xs text-ink3 w-8 shrink-0">
                  {p.jerseyNumber ? `#${p.jerseyNumber}` : "—"}
                </span>
                <span className="text-sm truncate">{p.name}</span>
              </button>
            ))}
            {picker.type === "GOAL" && (
              // A goal with no scorer is still a goal; a card without a player
              // is refused by the server, so it is not offered here.
              <button
                type="button"
                className="w-full rounded-lg border border-dashed border-line px-3 py-2.5 text-xs text-ink2"
                onClick={() => {
                  onLog({ type: "GOAL", teamId: teamId ?? "", minute, note: "Scorer not recorded" });
                  setPicker(null);
                }}
              >
                Goal — scorer unknown
              </button>
            )}
          </div>
          <button type="button" className="btn-ghost w-full text-xs mt-2" onClick={() => setPicker(null)}>
            Cancel
          </button>
        </div>
      )}

      <div className="card p-4">
        <h3 className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-2">Match log</h3>
        {events.length === 0 ? (
          <p className="text-xs text-ink3">Nothing recorded yet.</p>
        ) : (
          <ul className="divide-y divide-lineSoft">
            {events.map((e) => (
              <li key={e.id} className="flex items-center gap-2 py-2">
                <span
                  className={`badge text-[10px] shrink-0 ${
                    e.type === "RED" ? "badge-danger" : e.type === "YELLOW" ? "badge-pending" : "badge-accepted"
                  }`}
                >
                  {e.type}
                </span>
                <span className="text-xs text-ink2 min-w-0 flex-1 truncate">
                  {e.minute != null ? `${e.minute}' ` : ""}
                  {(e.playerId && playerNames[e.playerId]) || e.note || "—"}
                </span>
                <button
                  type="button"
                  className="text-[11px] text-ink3 underline shrink-0"
                  disabled={pending}
                  onClick={() => onDelete(e.id)}
                >
                  Undo
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button type="button" className="btn-primary w-full text-sm" onClick={onDone}>
        Full time — sign the card
      </button>
    </div>
  );
}

function ReportForm({
  matchId,
  homeName,
  awayName,
  home,
  away,
  notes,
  submittedAt,
  refereeName,
  pending,
  onError,
  startTransition,
}: {
  matchId: string;
  homeName: string;
  awayName: string;
  home: number;
  away: number;
  notes: string;
  submittedAt: string | null;
  refereeName: string;
  pending: boolean;
  onError: (e: string | null) => void;
  startTransition: (fn: () => Promise<void>) => void;
}) {
  const [done, setDone] = useState(Boolean(submittedAt));
  return (
    <form
      action={(fd) => {
        onError(null);
        startTransition(async () => {
          const result = await submitMatchReport(matchId, fd);
          if (result.error) onError(result.error);
          else setDone(true);
        });
      }}
      className="card p-4 space-y-4"
    >
      <div>
        <h2 className="text-sm font-extrabold text-inkDisplay">Match report</h2>
        <p className="text-[11px] text-ink3 mt-1">
          Submitting sets the official result and marks the match final.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5 truncate">
            {homeName}
          </span>
          <input name="homeScore" type="number" min={0} className="input w-full text-center font-score text-xl" defaultValue={home} required />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5 truncate">
            {awayName}
          </span>
          <input name="awayScore" type="number" min={0} className="input w-full text-center font-score text-xl" defaultValue={away} required />
        </label>
      </div>

      <label className="block">
        <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">Notes</span>
        <textarea
          name="notes"
          rows={3}
          defaultValue={notes}
          className="input w-full min-h-[80px] h-auto py-3"
          placeholder="Injuries, dismissals, anything the organizer needs."
        />
      </label>

      <label className="block">
        <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">Referee</span>
        <input name="refereeName" className="input w-full" defaultValue={refereeName} />
      </label>
      <SignaturePad name="refereeSignature" label="Referee signature" />

      <label className="block">
        <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">
          Field marshal
        </span>
        <input name="marshalName" className="input w-full" placeholder="Name" />
      </label>
      <SignaturePad name="marshalSignature" label="Field marshal signature" />

      <button type="submit" className="btn-primary w-full text-sm" disabled={pending}>
        {pending ? "Submitting…" : submittedAt ? "Resubmit report" : "Submit signed report"}
      </button>
      {done && (
        <p className="text-xs text-emerald-500 text-center" role="status">
          Report saved and the result recorded.
        </p>
      )}
      <p className="text-[11px] text-ink3">
        Signatures are stored as an image of what was drawn — the same standing as a signature on a paper match card,
        not a cryptographically verified one.
      </p>
    </form>
  );
}
