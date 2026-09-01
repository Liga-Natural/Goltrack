"use client";

import { useState, useTransition } from "react";
import { saveTournamentPaymentSettings, sendDueReminders } from "@/lib/actions";
import { quoteRegistration } from "@/lib/pricing";
import type { PaymentRules, PlatformFeeConfig } from "@/lib/pricing";

const dollars = (cents: number) => (cents / 100).toFixed(2);
const dateValue = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export function PaymentSettingsForm({
  tournamentId,
  feeCents,
  rules,
  platform,
  stripeConfigured,
}: {
  tournamentId: string;
  feeCents: number;
  rules: PaymentRules;
  platform: PlatformFeeConfig;
  stripeConfigured: boolean;
}) {
  const [depositMode, setDepositMode] = useState(rules.depositMode);
  const [depositBasis, setDepositBasis] = useState(rules.depositBasis);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [reminder, setReminder] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // A live worked example, priced by the same function the invoice generator
  // uses. A rules screen that does not show you what the rules produce is a
  // screen you have to test in production.
  const [preview, setPreview] = useState<PaymentRules>(rules);
  const quote = quoteRegistration({
    feeCents,
    teamCount: Math.max(1, preview.multiTeamMinTeams || 1),
    rules: preview,
    platform,
  });

  function patch(part: Partial<PaymentRules>) {
    setPreview((p) => ({ ...p, ...part }));
  }

  return (
    <div className="space-y-6">
      {/* Merchant account. Named, not mocked: there is no Stripe integration
          in this codebase — only an env-var check — so a "Connect with Stripe"
          button here would be a button that lies. */}
      <div className="card p-5 sm:p-6">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-3">Merchant account</h2>
        <div className="flex items-start gap-3">
          <span className={`badge ${stripeConfigured ? "badge-pending" : "badge-danger"} text-[10px] shrink-0 mt-0.5`}>
            {stripeConfigured ? "KEY PRESENT" : "NOT CONNECTED"}
          </span>
          <div className="min-w-0">
            <p className="text-sm text-ink2">
              Jogo has no payment processor wired in. Card checkout, Stripe Connect onboarding, stored cards and
              auto-debit all need a gateway integration that does not exist here yet — so every rule below governs
              what a club is <em>billed</em>, and the money itself is collected by you, outside Jogo, and recorded on
              the invoice.
            </p>
            {stripeConfigured && (
              <p className="text-[11px] text-ink3 mt-1.5">
                A STRIPE_SECRET_KEY is set in the environment, but nothing reads it to charge anyone — it is checked
                and otherwise unused.
              </p>
            )}
          </div>
        </div>
      </div>

      <form
        action={(formData) => {
          setError(null);
          setSaved(false);
          startTransition(async () => {
            const result = await saveTournamentPaymentSettings(tournamentId, formData);
            if (result.error) setError(result.error);
            else setSaved(true);
          });
        }}
        className="space-y-6"
      >
        {/* Payment terms */}
        <div className="card p-5 sm:p-6 space-y-5">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2">Payment terms</h2>

          <div className="grid sm:grid-cols-2 gap-3">
            <Tile
              checked={depositMode === "FULL"}
              onSelect={() => {
                setDepositMode("FULL");
                patch({ depositMode: "FULL" });
              }}
              name="depositMode"
              value="FULL"
              title="Full payment only"
              detail="The whole entry fee is due at registration."
            />
            <Tile
              checked={depositMode === "DEPOSIT"}
              onSelect={() => {
                setDepositMode("DEPOSIT");
                patch({ depositMode: "DEPOSIT" });
              }}
              name="depositMode"
              value="DEPOSIT"
              title="Deposit + balance"
              detail="Take a deposit now, the rest by a due date."
            />
          </div>

          {depositMode === "DEPOSIT" && (
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Deposit type">
                <select
                  name="depositBasis"
                  className="input w-full"
                  value={depositBasis}
                  onChange={(e) => {
                    const v = e.target.value as "FLAT" | "PERCENT";
                    setDepositBasis(v);
                    patch({ depositBasis: v });
                  }}
                >
                  <option value="FLAT">Fixed amount</option>
                  <option value="PERCENT">Percentage</option>
                </select>
              </Field>
              {depositBasis === "FLAT" ? (
                <Field label="Deposit amount">
                  <input
                    name="depositAmount"
                    className="input w-full"
                    inputMode="decimal"
                    defaultValue={dollars(rules.depositCents)}
                    onChange={(e) => patch({ depositCents: Math.round(Number(e.target.value || 0) * 100) })}
                  />
                </Field>
              ) : (
                <Field label="Deposit %">
                  <input
                    name="depositPercent"
                    type="number"
                    min={1}
                    max={100}
                    className="input w-full"
                    defaultValue={rules.depositPercent}
                    onChange={(e) => patch({ depositPercent: Number(e.target.value || 0) })}
                  />
                </Field>
              )}
              <Field label="Balance due in (days)">
                <input
                  name="balanceDueDays"
                  type="number"
                  min={0}
                  className="input w-full"
                  defaultValue={rules.balanceDueDays}
                  onChange={(e) => patch({ balanceDueDays: Number(e.target.value || 0) })}
                />
              </Field>
            </div>
          )}
          {/* Keep the unused inputs in the form so switching mode doesn't wipe
              the other branch's stored value on save. */}
          {depositMode === "DEPOSIT" && depositBasis === "FLAT" && (
            <input type="hidden" name="depositPercent" value={rules.depositPercent} />
          )}
          {depositMode === "DEPOSIT" && depositBasis === "PERCENT" && (
            <input type="hidden" name="depositAmount" value={dollars(rules.depositCents)} />
          )}
          {depositMode === "FULL" && (
            <>
              <input type="hidden" name="depositBasis" value={rules.depositBasis} />
              <input type="hidden" name="depositAmount" value={dollars(rules.depositCents)} />
              <input type="hidden" name="depositPercent" value={rules.depositPercent} />
              <input type="hidden" name="balanceDueDays" value={rules.balanceDueDays} />
            </>
          )}
        </div>

        {/* Date-based rules */}
        <div className="card p-5 sm:p-6 space-y-4">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2">Early bird &amp; late fees</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Early bird until" optional>
              <input
                name="earlyBirdUntil"
                type="date"
                className="input w-full"
                defaultValue={dateValue(rules.earlyBirdUntil)}
                onChange={(e) => patch({ earlyBirdUntil: e.target.value ? `${e.target.value}T00:00:00` : null })}
              />
            </Field>
            <Field label="Discount per team">
              <input
                name="earlyBirdDiscount"
                className="input w-full"
                inputMode="decimal"
                defaultValue={dollars(rules.earlyBirdDiscountCents)}
                onChange={(e) => patch({ earlyBirdDiscountCents: Math.round(Number(e.target.value || 0) * 100) })}
              />
            </Field>
            <Field label="Late fee after" optional>
              <input
                name="lateFeeAfter"
                type="date"
                className="input w-full"
                defaultValue={dateValue(rules.lateFeeAfter)}
                onChange={(e) => patch({ lateFeeAfter: e.target.value ? `${e.target.value}T00:00:00` : null })}
              />
            </Field>
            <Field label="Late fee per team">
              <input
                name="lateFee"
                className="input w-full"
                inputMode="decimal"
                defaultValue={dollars(rules.lateFeeCents)}
                onChange={(e) => patch({ lateFeeCents: Math.round(Number(e.target.value || 0) * 100) })}
              />
            </Field>
          </div>
        </div>

        {/* Club discount */}
        <div className="card p-5 sm:p-6 space-y-4">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2">Multi-team club discount</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Applies from (teams)">
              <input
                name="multiTeamMinTeams"
                type="number"
                min={0}
                className="input w-full"
                defaultValue={rules.multiTeamMinTeams}
                onChange={(e) => patch({ multiTeamMinTeams: Number(e.target.value || 0) })}
              />
            </Field>
            <Field label="Discount %">
              <input
                name="multiTeamPercent"
                type="number"
                min={0}
                max={100}
                className="input w-full"
                defaultValue={rules.multiTeamPercent}
                onChange={(e) => patch({ multiTeamPercent: Number(e.target.value || 0) })}
              />
            </Field>
          </div>
          <p className="text-[11px] text-ink3">
            Counted per club across this tournament, matched on the club name a manager applied under. Set “applies
            from” to 0 to switch it off.
          </p>
        </div>

        {/* Offline payments */}
        <div className="card p-5 sm:p-6 space-y-4">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2">
            Offline &amp; manual payments
          </h2>
          <div className="grid sm:grid-cols-2 gap-2">
            <Check name="acceptCheck" label="Check" defaultChecked={rules.acceptCheck} />
            <Check name="acceptCash" label="Cash" defaultChecked={rules.acceptCash} />
            <Check name="acceptZelle" label="Zelle" defaultChecked={rules.acceptZelle} />
            <Check name="acceptWire" label="Bank wire" defaultChecked={rules.acceptWire} />
          </div>
          <Field label="Instructions shown on the invoice" optional>
            <textarea
              name="offlineInstructions"
              rows={4}
              className="input w-full min-h-[110px] h-auto py-3"
              defaultValue={rules.offlineInstructions ?? ""}
              placeholder={"Make checks payable to…\nMail to…\nZelle: …"}
            />
          </Field>
          <Check
            name="manualApproval"
            label="Require manual verification before marking a team paid"
            defaultChecked={rules.manualApproval}
            detail="Recommended while payments are collected offline — a check that has not cleared is not a payment."
          />
        </div>

        {/* Reminders */}
        <div className="card p-5 sm:p-6 space-y-4">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2">Payment reminders</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Days before due">
              <input
                name="reminderDaysBefore"
                type="number"
                min={0}
                className="input w-full"
                defaultValue={rules.reminderDaysBefore}
              />
            </Field>
            <Field label="Days overdue">
              <input
                name="reminderDaysAfter"
                type="number"
                min={0}
                className="input w-full"
                defaultValue={rules.reminderDaysAfter}
              />
            </Field>
            <div className="flex items-end pb-1">
              <Check name="reminderOnDueDate" label="On the due date" defaultChecked={rules.reminderOnDueDate} />
            </div>
          </div>
          <p className="text-[11px] text-ink3">
            Email only — there is no SMS provider connected. Nothing sends these on a timer either: Jogo has no
            scheduler, so the button below is what dispatches whichever reminders fall due today.
          </p>
        </div>

        {error && (
          <p className="text-sm text-warning-500" role="alert">
            {error}
          </p>
        )}
        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary text-sm" disabled={pending}>
            {pending ? "Saving…" : "Save payment rules"}
          </button>
          {saved && !error && (
            <span className="text-xs text-emerald-500" role="status">
              Saved.
            </span>
          )}
        </div>
      </form>

      {/* Worked example */}
      <div className="card mesh p-5 sm:p-6">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-4">
          What a club would be charged today
        </h2>
        <dl className="space-y-1.5 text-sm max-w-sm">
          {quote.lines.map((line, i) => (
            <div key={i} className="flex items-baseline justify-between gap-3">
              <dt className="text-ink2">{line.label}</dt>
              <dd className={`font-score ${line.kind === "discount" ? "text-emerald-500" : "text-ink2"}`}>
                {line.kind === "discount" ? "−" : ""}
                {money(line.amountCents)}
              </dd>
            </div>
          ))}
          <div className="pt-2 border-t border-line flex items-baseline justify-between gap-3">
            <dt className="font-semibold text-inkDisplay">Total</dt>
            <dd className="font-score text-inkDisplay text-base">{money(quote.totalCents)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink2">Due at registration</dt>
            <dd className="font-score text-inkDisplay">{money(quote.dueNowCents)}</dd>
          </div>
          {quote.balanceCents > 0 && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink2">Balance later</dt>
              <dd className="font-score text-warning-500">{money(quote.balanceCents)}</dd>
            </div>
          )}
        </dl>
        <p className="text-[11px] text-ink3 mt-3">
          Priced by the same function that generates invoices, for a club entering{" "}
          {Math.max(1, preview.multiTeamMinTeams || 1)} team
          {Math.max(1, preview.multiTeamMinTeams || 1) === 1 ? "" : "s"}. Updates as you edit; reflects saved rules
          once you save.
        </p>
      </div>

      {/* Dispatch */}
      <div className="card p-5 sm:p-6">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-3">Send due reminders</h2>
        <button
          type="button"
          className="btn-secondary text-sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await sendDueReminders(tournamentId);
              setReminder(result.error || result.detail);
            })
          }
        >
          Send today&apos;s reminders
        </button>
        {reminder && (
          <p className="text-xs text-ink2 mt-3" role="status">
            {reminder}
          </p>
        )}
      </div>
    </div>
  );
}

function Tile({
  checked,
  onSelect,
  name,
  value,
  title,
  detail,
}: {
  checked: boolean;
  onSelect: () => void;
  name: string;
  value: string;
  title: string;
  detail: string;
}) {
  return (
    <label
      className={`cursor-pointer rounded-xl border p-4 transition-colors ${
        checked ? "border-pitch-400 bg-pitch-400/10" : "border-line hover:border-black/25"
      }`}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onSelect} className="sr-only" />
      <span className="block text-sm font-semibold text-inkDisplay">{title}</span>
      <span className="block text-[11px] text-ink3 mt-1">{detail}</span>
    </label>
  );
}

function Field({ label, children, optional }: { label: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">
        {label}
        {optional && <span className="text-ink3 normal-case tracking-normal font-normal"> · optional</span>}
      </span>
      {children}
    </label>
  );
}

function Check({
  name,
  label,
  defaultChecked,
  detail,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
  detail?: string;
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-line p-3 cursor-pointer">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 shrink-0 accent-pitch-400"
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        {detail && <span className="block text-[11px] text-ink3">{detail}</span>}
      </span>
    </label>
  );
}
