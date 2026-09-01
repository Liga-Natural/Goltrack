"use client";

import { useState, useTransition } from "react";
import { savePlatformFeeSettings, recordPlatformPayout } from "@/lib/actions";
import { describePlatformFee, platformFeeCents } from "@/lib/pricing";
import type { PlatformFeeConfig, PlatformFeeMode } from "@/lib/pricing";

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const MODES: { value: PlatformFeeMode; title: string; detail: string }[] = [
  { value: "PERCENT", title: "Percentage + flat", detail: "A cut of each registration, plus a fixed amount." },
  { value: "FLAT", title: "Flat per registration", detail: "One fixed amount per team, whatever the entry fee." },
  { value: "TIERED", title: "Subscription plan", detail: "A monthly fee instead of a cut of each registration." },
];

export function PlatformFeeForm({ config }: { config: PlatformFeeConfig }) {
  const [mode, setMode] = useState<PlatformFeeMode>(config.mode);
  const [percent, setPercent] = useState((config.percentBps / 100).toString());
  const [flat, setFlat] = useState((config.flatCents / 100).toFixed(2));
  const [passThrough, setPassThrough] = useState(config.passThrough);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  // Priced by the same function the rest of the app uses, on a $150 entry.
  const preview = platformFeeCents(15000, {
    ...config,
    mode,
    percentBps: Math.round(Number(percent || 0) * 100),
    flatCents: Math.round(Number(flat || 0) * 100),
    passThrough,
  });

  return (
    <form
      action={(formData) => {
        setError(null);
        setSaved(false);
        startTransition(async () => {
          const result = await savePlatformFeeSettings(formData);
          if (result.error) setError(result.error);
          else setSaved(true);
        });
      }}
      className="card p-5 sm:p-6 space-y-5"
    >
      <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2">Monetization</h2>

      <div className="grid sm:grid-cols-3 gap-3">
        {MODES.map((m) => (
          <label
            key={m.value}
            className={`cursor-pointer rounded-xl border p-4 transition-colors ${
              mode === m.value ? "border-pitch-400 bg-pitch-400/10" : "border-line hover:border-black/25"
            }`}
          >
            <input
              type="radio"
              name="mode"
              value={m.value}
              checked={mode === m.value}
              onChange={() => setMode(m.value)}
              className="sr-only"
            />
            <span className="block text-sm font-semibold text-inkDisplay">{m.title}</span>
            <span className="block text-[11px] text-ink3 mt-1">{m.detail}</span>
          </label>
        ))}
      </div>

      {mode === "TIERED" ? (
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Plan name">
            <input name="tierName" className="input w-full" defaultValue={config.tierName} />
          </Field>
          <Field label="Monthly price">
            <input
              name="tierMonthly"
              className="input w-full"
              inputMode="decimal"
              defaultValue={(config.tierMonthlyCents / 100).toFixed(2)}
            />
          </Field>
          {/* Carried so switching modes doesn't wipe the other branch's values. */}
          <input type="hidden" name="percent" value={percent} />
          <input type="hidden" name="flat" value={flat} />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Percentage of each registration">
            <input
              name="percent"
              className="input w-full"
              inputMode="decimal"
              value={mode === "FLAT" ? "0" : percent}
              disabled={mode === "FLAT"}
              onChange={(e) => setPercent(e.target.value)}
            />
          </Field>
          <Field label="Flat amount per registration">
            <input
              name="flat"
              className="input w-full"
              inputMode="decimal"
              value={flat}
              onChange={(e) => setFlat(e.target.value)}
            />
          </Field>
          <input type="hidden" name="tierName" value={config.tierName} />
          <input type="hidden" name="tierMonthly" value={(config.tierMonthlyCents / 100).toFixed(2)} />
        </div>
      )}

      <label className="flex items-start gap-3 rounded-xl border border-line p-3 cursor-pointer">
        <input
          type="checkbox"
          name="passThrough"
          checked={passThrough}
          onChange={(e) => setPassThrough(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-pitch-400"
        />
        <span className="min-w-0">
          <span className="block text-sm font-semibold">Pass the fee through to the registering team</span>
          <span className="block text-[11px] text-ink3">
            On — the fee is added to the club&apos;s bill at checkout. Off — the organizer absorbs it out of what they
            collect.
          </span>
        </span>
      </label>

      <p className="text-[11px] text-ink3">
        Current rule: <span className="text-ink2">{describePlatformFee({ ...config, mode })}</span>
        {mode !== "TIERED" && <> · on a $150 entry that is {money(preview)}.</>}
      </p>

      {error && (
        <p className="text-sm text-warning-500" role="alert">
          {error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary text-sm" disabled={pending}>
          {pending ? "Saving…" : "Save fee settings"}
        </button>
        {saved && !error && (
          <span className="text-xs text-emerald-500" role="status">
            Saved.
          </span>
        )}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">{label}</span>
      {children}
    </label>
  );
}

/** Logs a transfer the admin already made outside Jogo. */
export function RecordPayoutForm({ tournamentId }: { tournamentId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await recordPlatformPayout(tournamentId, formData);
          setError(result.error ?? null);
        });
      }}
      className="flex items-center gap-1.5"
    >
      <input name="amount" className="input text-xs w-20 px-2" placeholder="0.00" inputMode="decimal" required />
      <input name="reference" className="input text-xs w-20 px-2" placeholder="Ref" />
      <button type="submit" className="btn-ghost text-[11px] px-2.5 py-1.5" disabled={pending}>
        Log payout
      </button>
      {error && (
        <span className="text-[11px] text-warning-500" role="alert">
          {error}
        </span>
      )}
    </form>
  );
}
