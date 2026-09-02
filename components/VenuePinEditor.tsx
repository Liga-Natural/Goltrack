"use client";

import { useState, useTransition } from "react";
import { saveModuleSettings } from "@/lib/actions";
import { PIN_KINDS, parsePins, type PinKind, type VenuePin } from "@/lib/modules";

/**
 * The complex map an organizer draws for their own venue.
 *
 * Jogo has no site plan for anyone's fields and no way to get one, so this is
 * not a real map with satellite imagery — it is a labelled diagram the
 * organizer arranges themselves, which is what the paper sheet taped to the
 * check-in table already is. Pins are placed by clicking the box; the
 * coordinates are percentages, so the same layout holds on a phone.
 */
export function VenuePinEditor({
  tournamentId,
  enabled,
  pins: initialPins,
  address,
  fields,
}: {
  tournamentId: string;
  enabled: boolean;
  pins: string | null;
  address: string;
  fields: string[];
}) {
  const [pins, setPins] = useState<VenuePin[]>(() => parsePins(initialPins));
  const [kind, setKind] = useState<PinKind>("FIELD");
  const [label, setLabel] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function place(e: React.MouseEvent<HTMLDivElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - box.left) / box.width) * 1000) / 10;
    const y = Math.round(((e.clientY - box.top) / box.height) * 1000) / 10;
    const text = label.trim() || PIN_KINDS.find((k) => k.value === kind)?.label || "Pin";
    setPins((p) => [...p, { kind, label: text, x, y }].slice(0, 40));
    setLabel("");
  }

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          fd.set("venuePins", JSON.stringify(pins));
          const result = await saveModuleSettings(tournamentId, fd);
          setNotice(result.error || "Saved. The public match centre reflects this now.");
        })
      }
      className="card p-5 sm:p-6 space-y-5"
    >
      <input type="hidden" name="matchCenterEnabled__present" value="1" />

      <label className="flex items-start gap-3 cursor-pointer min-h-[48px] rounded-2xl bg-surface2 p-4">
        <input type="checkbox" name="matchCenterEnabled" defaultChecked={enabled} className="mt-0.5 h-4 w-4 accent-pitch-400" />
        <span>
          <span className="block text-sm font-semibold text-inkDisplay">Publish the live match centre</span>
          <span className="block text-[11px] text-ink3 mt-0.5">
            Anyone with the link sees the running score, goals and cards for every match of this event. With this off,
            a match centre link returns nothing at all.
          </span>
        </span>
      </label>

      <label className="block">
        <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">
          Venue address (for the directions links)
        </span>
        <input name="venueAddress" className="input w-full" defaultValue={address} placeholder="Magic City Fields, Miami FL" />
      </label>

      <div>
        <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
          <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold">Complex map</span>
          <span className="text-[11px] text-ink3">Click the box to drop a pin</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {PIN_KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => setKind(k.value)}
              className={`text-xs px-3.5 py-2 rounded-full transition-[box-shadow,color] ${
                kind === k.value
                  ? "clay-pill-active bg-pitch-400/15 text-inkDisplay font-semibold"
                  : "bg-surface2 text-ink2 clay-pill-raised"
              }`}
            >
              {k.glyph} {k.label}
            </button>
          ))}
          <input
            className="input w-auto flex-1 min-w-[10rem]"
            placeholder={fields.length ? `Label — e.g. ${fields[0]}` : "Label"}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>

        <div
          onClick={place}
          className="relative rounded-3xl bg-surface2 h-72 cursor-crosshair overflow-hidden"
          style={{ boxShadow: "var(--clay-field)" }}
        >
          {pins.length === 0 && (
            <span className="absolute inset-0 flex items-center justify-center text-xs text-ink3">
              Empty. Pick a pin type and click where it belongs.
            </span>
          )}
          {pins.map((pin, i) => (
            <span
              key={`${pin.label}-${i}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-inkDisplay clay-pill-raised"
              style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
            >
              {PIN_KINDS.find((k) => k.value === pin.kind)?.glyph} {pin.label}
            </span>
          ))}
        </div>

        {pins.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {pins.map((pin, i) => (
              <button
                key={`chip-${i}`}
                type="button"
                onClick={() => setPins((p) => p.filter((_, j) => j !== i))}
                className="badge bg-neutralBadge text-ink2 text-[10px]"
                title="Remove this pin"
              >
                {pin.label} ✕
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary text-sm" disabled={pending}>
          {pending ? "Saving…" : "Save match centre settings"}
        </button>
        {notice && (
          <span className="text-xs text-ink2" role="status">
            {notice}
          </span>
        )}
      </div>
    </form>
  );
}
