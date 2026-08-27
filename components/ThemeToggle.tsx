"use client";

import { useState } from "react";
import { updateSiteTheme } from "@/lib/actions";
import type { SiteTheme } from "@/lib/models";

const OPTIONS: { value: SiteTheme; label: string; sub: string }[] = [
  { value: "light", label: "White main", sub: "Paper background, black text — the current site" },
  { value: "dark", label: "Black main", sub: "Ink background, white text — same layout, inverted" },
];

export function ThemeToggle({ currentTheme }: { currentTheme: SiteTheme }) {
  const [saving, setSaving] = useState<SiteTheme | null>(null);

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {OPTIONS.map((opt) => {
        const active = currentTheme === opt.value;
        // These previews must show each option's actual look regardless of
        // the theme currently live on the page — bg-black/bg-white can't be
        // used here since tailwind.config.ts remaps them to the live
        // --ink/--paper vars. Literal inline colors keep them absolute.
        const preview =
          opt.value === "dark" ? (
            <div
              className="h-16 rounded-lg flex items-center gap-2 px-3"
              style={{ backgroundColor: "#121212", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              <span className="h-2.5 w-2.5 rounded-full bg-pitch-400" />
              <span className="h-2 flex-1 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.25)" }} />
            </div>
          ) : (
            <div
              className="h-16 rounded-lg flex items-center gap-2 px-3"
              style={{ backgroundColor: "#FAFAF8", border: "1px solid rgba(0,0,0,0.15)" }}
            >
              <span className="h-2.5 w-2.5 rounded-full bg-pitch-400" />
              <span className="h-2 flex-1 rounded-full" style={{ backgroundColor: "rgba(0,0,0,0.15)" }} />
            </div>
          );

        return (
          <form
            key={opt.value}
            action={async (formData) => {
              setSaving(opt.value);
              await updateSiteTheme(formData);
              setSaving(null);
            }}
          >
            <input type="hidden" name="theme" value={opt.value} />
            <button
              type="submit"
              disabled={active || saving !== null}
              className={`w-full text-left rounded-xl p-3 border transition-colors ${
                active ? "border-black" : "border-black/10 hover:border-black/25"
              } disabled:cursor-default`}
            >
              {preview}
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{opt.label}</p>
                  <p className="text-xs text-black/40">{opt.sub}</p>
                </div>
                {active && <span className="badge bg-pitch-400/10 text-pitch-600 shrink-0">Active</span>}
                {saving === opt.value && <span className="text-xs text-black/40 shrink-0">Saving…</span>}
              </div>
            </button>
          </form>
        );
      })}
    </div>
  );
}
