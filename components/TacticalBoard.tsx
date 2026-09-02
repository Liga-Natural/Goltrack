"use client";

import { useMemo, useState, useTransition } from "react";
import { FORMATIONS, formationById, parseSlots, assignSlot, ROLE_TINT } from "@/lib/lineup";
import { saveLineup } from "@/lib/actions";
import type { Player } from "@/lib/models";

interface Arrow {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function parseArrows(raw: string | null): Arrow[] {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list
      .filter((a) => a && typeof a === "object")
      .map((a) => ({ x1: Number(a.x1) || 0, y1: Number(a.y1) || 0, x2: Number(a.x2) || 0, y2: Number(a.y2) || 0 }));
  } catch {
    return [];
  }
}

// The pitch is an SVG in percentage space (see lib/lineup.ts), so the same
// coordinates place a node correctly on a phone and on a projector.
//
// Assignment is tap-to-place rather than HTML5 drag: a coach uses this on a
// touchscreen at the touchline, where dragstart/dragover do not fire at all.
// Pick a player, tap a slot. The same two taps work with a mouse and with a
// keyboard, which drag-and-drop never does.
export function TacticalBoard({
  teamId,
  matchId,
  players,
  initialFormation,
  initialSlots,
  initialArrows,
  initialNotes,
}: {
  teamId: string;
  matchId: string;
  players: Player[];
  initialFormation: string;
  initialSlots: string | null;
  initialArrows: string | null;
  initialNotes: string | null;
}) {
  const validIds = useMemo(() => new Set(players.map((p) => p.id)), [players]);
  const [formationId, setFormationId] = useState(initialFormation);
  const formation = formationById(formationId);
  const [slots, setSlots] = useState<Record<string, string>>(() =>
    parseSlots(initialSlots, formationById(initialFormation), validIds)
  );
  const [picked, setPicked] = useState<string | null>(null);
  const [arrows, setArrows] = useState<Arrow[]>(() => parseArrows(initialArrows));
  const [drawing, setDrawing] = useState(false);
  const [draft, setDraft] = useState<Arrow | null>(null);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const placed = new Set(Object.values(slots));
  const bench = players.filter((p) => !placed.has(p.id));

  function changeFormation(id: string) {
    setFormationId(id);
    // Slots are re-filtered against the new shape rather than cleared, so a
    // back four survives a switch from 4-3-3 to 4-2-3-1 instead of the coach
    // rebuilding the whole XI to change the front line.
    setSlots((s) => parseSlots(JSON.stringify(s), formationById(id), validIds));
    setSaved(false);
  }

  function tapSlot(slotId: string) {
    setSaved(false);
    if (picked) {
      setSlots((s) => assignSlot(s, slotId, picked));
      setPicked(null);
    } else if (slots[slotId]) {
      setSlots((s) => assignSlot(s, slotId, null));
    }
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("formation", formationId);
      fd.set("slots", JSON.stringify(slots));
      fd.set("arrows", JSON.stringify(arrows));
      fd.set("notes", notes);
      const result = await saveLineup(teamId, matchId, fd);
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  // Pointer position as a percentage of the pitch box, which is the same
  // coordinate space the formation slots and the stored arrows use.
  function pointerPercent(e: React.PointerEvent<HTMLDivElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - box.left) / box.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - box.top) / box.height) * 100)),
    };
  }

  const initials = (name: string) =>
    name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {FORMATIONS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => changeFormation(f.id)}
            className={`text-xs px-4 min-h-[48px] inline-flex items-center rounded-full border transition-colors ${
              formationId === f.id
                ? "border-pitch-400 bg-pitch-400/10 text-inkDisplay font-semibold"
                : "border-line text-ink2 hover:border-black/25"
            }`}
          >
            {f.name}
          </button>
        ))}
        <span className="text-[11px] text-ink3 ml-1">{formation.detail}</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setDrawing((d) => !d);
              setPicked(null);
            }}
            className={`text-xs px-4 min-h-[48px] inline-flex items-center rounded-full border transition-colors ${
              drawing ? "border-pitch-400 bg-pitch-400/10 text-inkDisplay font-semibold" : "border-line text-ink2"
            }`}
          >
            {drawing ? "Drawing runs" : "Draw runs"}
          </button>
          {arrows.length > 0 && (
            <button
              type="button"
              className="btn-ghost text-[11px] px-2.5 py-1.5"
              onClick={() => {
                setArrows([]);
                setSaved(false);
              }}
            >
              Clear runs
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_16rem] gap-4">
        {/* Pitch */}
        <div
          className="relative rounded-2xl overflow-hidden border border-line bg-pitch-400/[0.06]"
          onPointerDown={(e) => {
            if (!drawing) return;
            const at = pointerPercent(e);
            setDraft({ x1: at.x, y1: at.y, x2: at.x, y2: at.y });
          }}
          onPointerMove={(e) => {
            if (!drawing || !draft) return;
            const at = pointerPercent(e);
            setDraft({ ...draft, x2: at.x, y2: at.y });
          }}
          onPointerUp={() => {
            if (!draft) return;
            // A tap without movement is not a run; without this every stray
            // tap in draw mode leaves a zero-length arrowhead on the pitch.
            const far = Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1) > 3;
            if (far) {
              setArrows((a) => [...a, draft].slice(-40));
              setSaved(false);
            }
            setDraft(null);
          }}
          style={{ touchAction: drawing ? "none" : undefined }}
        >
          <svg viewBox="0 0 100 100" className="w-full block" style={{ aspectRatio: "3 / 4" }}>
            {/* Markings, deliberately faint: they orient the eye without
                competing with the player nodes, which are the content. */}
            <rect x="2" y="2" width="96" height="96" fill="none" stroke="rgb(var(--ink) / 0.14)" strokeWidth="0.5" />
            <line x1="2" y1="50" x2="98" y2="50" stroke="rgb(var(--ink) / 0.14)" strokeWidth="0.5" />
            <circle cx="50" cy="50" r="11" fill="none" stroke="rgb(var(--ink) / 0.14)" strokeWidth="0.5" />
            <rect x="28" y="2" width="44" height="14" fill="none" stroke="rgb(var(--ink) / 0.14)" strokeWidth="0.5" />
            <rect x="28" y="84" width="44" height="14" fill="none" stroke="rgb(var(--ink) / 0.14)" strokeWidth="0.5" />

            <defs>
              <marker id="run-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="rgb(var(--pitch-400))" />
              </marker>
            </defs>
            {[...arrows, ...(draft ? [draft] : [])].map((a, i) => (
              <line
                key={i}
                x1={a.x1}
                y1={a.y1}
                x2={a.x2}
                y2={a.y2}
                stroke="rgb(var(--pitch-400))"
                strokeWidth="0.9"
                strokeLinecap="round"
                markerEnd="url(#run-head)"
                opacity={draft && i === arrows.length ? 0.6 : 1}
              />
            ))}
          </svg>

          {formation.slots.map((slot) => {
            const player = slots[slot.id] ? byId.get(slots[slot.id]) : undefined;
            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => tapSlot(slot.id)}
                aria-label={player ? `${slot.label}: ${player.name}. Tap to clear.` : `Empty ${slot.label} slot`}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 group"
                style={{ left: `${slot.x}%`, top: `${slot.y}%`, pointerEvents: drawing ? "none" : undefined }}
              >
                <span
                  className={`h-10 w-10 rounded-full flex items-center justify-center text-[11px] font-display border-2 transition-transform group-active:scale-95 ${
                    player ? "text-inkDisplay" : "text-ink3 border-dashed"
                  }`}
                  style={{
                    borderColor: player ? ROLE_TINT[slot.role] : "rgb(var(--ink) / 0.25)",
                    backgroundColor: player ? "rgb(var(--surface))" : "transparent",
                  }}
                >
                  {player ? player.jerseyNumber || initials(player.name) : slot.label}
                </span>
                {player && (
                  <span className="text-[9px] text-ink2 max-w-[5rem] truncate leading-none">{player.name}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Squad picker */}
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-2">
            {drawing ? "Drag on the pitch to draw a run" : picked ? "Now tap a position" : "Tap a player, then a position"}
          </p>
          <div className="space-y-1.5 max-h-[24rem] overflow-y-auto pr-1">
            {players.length === 0 && <p className="text-xs text-ink3">No players on this squad yet.</p>}
            {players.map((p) => {
              const isPlaced = placed.has(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPicked(picked === p.id ? null : p.id)}
                  className={`w-full text-left flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors ${
                    picked === p.id
                      ? "border-pitch-400 bg-pitch-400/10"
                      : isPlaced
                        ? "border-line opacity-50"
                        : "border-line hover:border-black/25"
                  }`}
                >
                  <span className="font-score text-xs text-ink3 w-6 shrink-0">
                    {p.jerseyNumber ? `#${p.jerseyNumber}` : "—"}
                  </span>
                  <span className="text-xs truncate min-w-0 flex-1">{p.name}</span>
                  {p.position && <span className="text-[10px] text-ink3 shrink-0">{p.position}</span>}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-ink3 mt-2">
            {bench.length} on the bench · {Object.keys(slots).length} of {formation.slots.length} placed
          </p>
        </div>
      </div>

      <label className="block">
        <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">
          Notes for the squad
        </span>
        <textarea
          className="input w-full min-h-[80px] h-auto py-3"
          rows={2}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setSaved(false);
          }}
          placeholder="Press high on their goal kicks; watch their number 10."
        />
      </label>

      {error && (
        <p className="text-sm text-warning-500" role="alert">
          {error}
        </p>
      )}
      <div className="flex items-center gap-3 flex-wrap">
        <button type="button" className="btn-primary text-sm" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save lineup"}
        </button>
        <button type="button" className="btn-ghost text-sm" onClick={() => window.print()}>
          Print team sheet
        </button>
        {saved && !error && (
          <span className="text-xs text-emerald-500" role="status">
            Saved.
          </span>
        )}
      </div>
      <p className="text-[11px] text-ink3">
        Printing is how this reaches players and parents — Jogo has no push channel to a family&apos;s phone, so a
        sheet you hand out or attach is the honest export.
      </p>
    </div>
  );
}
