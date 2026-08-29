"use client";

import { useState } from "react";
import { updateSiteAccentColor } from "@/lib/actions";
import { isValidHex } from "@/lib/colorRamp";

// Jogo's identity is black, red, and white — these presets are all
// variations of "red," not a jump to an unrelated hue like blue or green,
// so picking any of them keeps that identity intact.
const PRESETS = [
  { name: "Sideline Red", hex: "#F2545C" },
  { name: "Signal Coral", hex: "#FF5A36" },
  { name: "Crimson", hex: "#DC2626" },
  { name: "Cherry Rose", hex: "#E11D48" },
  { name: "Blood Orange", hex: "#EA580C" },
  { name: "Brick", hex: "#B91C1C" },
];

export function AccentColorPicker({ currentColor }: { currentColor: string }) {
  const [selected, setSelected] = useState(currentColor);
  const [hexInput, setHexInput] = useState(currentColor);
  const [saved, setSaved] = useState(false);

  const valid = isValidHex(hexInput);

  function pick(hex: string) {
    setSelected(hex);
    setHexInput(hex);
    setSaved(false);
  }

  function onHexChange(value: string) {
    setHexInput(value);
    setSaved(false);
    if (isValidHex(value)) setSelected(value);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="label mb-2">Presets</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {PRESETS.map((p) => (
            <button
              key={p.hex}
              type="button"
              onClick={() => pick(p.hex)}
              className={`group flex flex-col items-center gap-1.5 rounded-xl p-2 border transition-colors ${
                selected.toLowerCase() === p.hex.toLowerCase() ? "border-black" : "border-transparent hover:border-black/15"
              }`}
            >
              <span
                className="h-10 w-10 rounded-full border border-black/10 shrink-0"
                style={{ backgroundColor: p.hex }}
                aria-hidden="true"
              />
              <span className="text-[11px] text-black/50 text-center leading-tight">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Or enter a custom hex code</label>
        <div className="flex items-center gap-3">
          <span
            className="h-9 w-9 rounded-lg border border-black/10 shrink-0"
            style={{ backgroundColor: valid ? hexInput : "transparent" }}
            aria-hidden="true"
          />
          <input
            className="input max-w-[180px] font-mono"
            value={hexInput}
            onChange={(e) => onHexChange(e.target.value)}
            placeholder="#F2545C"
            maxLength={7}
          />
          {!valid && <span className="text-xs text-black/40">6-digit hex, e.g. #F2545C</span>}
        </div>
        <p className="text-xs text-black/30 mt-1.5">For a shade the presets above don&apos;t cover — stick to a red tone to keep the black/red/white identity.</p>
      </div>

      <div className="border-t border-black/5 pt-5">
        <p className="label mb-3">Preview</p>
        <div className="rounded-2xl border border-black/10 p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
              style={{ backgroundColor: selected }}
            >
              Primary button
            </button>
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{ backgroundColor: `${selected}26`, color: selected }}
            >
              Soft badge
            </span>
          </div>
          <p className="text-sm text-black/60">
            This is what a link or highlighted word looks like in{" "}
            <span className="font-semibold" style={{ color: selected }}>
              your chosen color
            </span>
            .
          </p>
        </div>
      </div>

      <form
        action={async (formData) => {
          await updateSiteAccentColor(formData);
          setSaved(true);
        }}
      >
        <input type="hidden" name="accentColor" value={selected} />
        <button className="btn-primary" disabled={!valid}>
          {saved ? "Saved ✓" : "Save accent color"}
        </button>
        <p className="text-xs text-black/30 mt-2">
          Applies site-wide — buttons, links, and badges everywhere, not just this page. (LIVE status stays a fixed
          emerald green, independent of this color, so a live match is always recognizable at a glance.) Takes effect
          immediately on pages rendered per-request (dashboard, tournament pages); the marketing pages catch up within
          about a minute.
        </p>
      </form>
    </div>
  );
}
