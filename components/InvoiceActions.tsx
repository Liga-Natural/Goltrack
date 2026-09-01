"use client";

import { useState, useTransition } from "react";
import { Portal } from "./Portal";
import {
  recordInvoicePayment,
  issueInvoiceRefund,
  applyInvoiceDiscount,
  createInvoicePaymentPlan,
  sendInvoiceReminder,
} from "@/lib/actions";

type Dialog = "payment" | "discount" | "refund" | "plan" | null;

// Each action is a real write against the ledger, so each one gets a form
// rather than a one-click button: an amount recorded without a method, a
// reference or a date is an audit trail nobody can reconcile later.
export function InvoiceActions({
  tournamentId,
  invoiceId,
  balanceLabel,
  suggestedAmount,
}: {
  tournamentId: string;
  invoiceId: string;
  balanceLabel: string;
  /** The outstanding balance in plain dollars, pre-filled as the likely payment. */
  suggestedAmount: string;
}) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "warn"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(action: (fd: FormData) => Promise<{ error?: string }>) {
    return (formData: FormData) => {
      setError(null);
      startTransition(async () => {
        const result = await action(formData);
        if (result?.error) setError(result.error);
        else {
          setDialog(null);
          setNotice(null);
        }
      });
    };
  }

  function remind() {
    setNotice(null);
    startTransition(async () => {
      const result = await sendInvoiceReminder(tournamentId, invoiceId);
      setNotice({ tone: result.status === "SENT" ? "ok" : "warn", text: result.detail });
    });
  }

  const close = () => {
    setDialog(null);
    setError(null);
  };

  return (
    <>
      {/* no-print: this toolbar is the one thing that must never appear on the
          paper copy — a printed invoice with an "Issue refund" button on it
          reads as a draft, not a document. */}
      <div className="no-print space-y-3">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary text-xs" disabled={pending} onClick={remind}>
            Send payment reminder
          </button>
          <button type="button" className="btn-secondary text-xs" onClick={() => setDialog("payment")}>
            Record manual payment
          </button>
          <button type="button" className="btn-ghost text-xs" onClick={() => setDialog("discount")}>
            Apply custom discount
          </button>
          <button type="button" className="btn-ghost text-xs" onClick={() => setDialog("refund")}>
            Issue refund / adjustment
          </button>
          <button type="button" className="btn-ghost text-xs" onClick={() => setDialog("plan")}>
            Set payment plan
          </button>
        </div>
        {notice && (
          <p
            className={`text-xs ${notice.tone === "ok" ? "text-emerald-500" : "text-warning-500"}`}
            role="status"
          >
            {notice.text}
          </p>
        )}
      </div>

      {dialog && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <button
              type="button"
              aria-label="Close"
              className="absolute inset-0 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm"
              onClick={close}
            />
            <div className="relative modal-panel rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              {dialog === "payment" && (
                <Form
                  title="Record a manual payment"
                  hint={`${balanceLabel} outstanding. Use this for cash, a cheque, or a bank transfer taken outside Jogo.`}
                  action={submit(recordInvoicePayment.bind(null, tournamentId, invoiceId))}
                  submitLabel="Record payment"
                  pending={pending}
                  error={error}
                  onCancel={close}
                >
                  <Field label="Amount">
                    <input name="amount" className="input w-full" defaultValue={suggestedAmount} inputMode="decimal" required />
                  </Field>
                  <Field label="Method">
                    <select name="method" className="input w-full" defaultValue="TRANSFER">
                      <option value="CASH">Cash</option>
                      <option value="CHECK">Cheque</option>
                      <option value="TRANSFER">Bank transfer</option>
                      <option value="CARD">Card (taken elsewhere)</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </Field>
                  <Field label="Reference" optional>
                    <input name="reference" className="input w-full" placeholder="Cheque no., transfer ID" />
                  </Field>
                  <Field label="Note" optional>
                    <input name="note" className="input w-full" placeholder="Anything worth remembering" />
                  </Field>
                </Form>
              )}

              {dialog === "discount" && (
                <Form
                  title="Apply a custom discount"
                  hint="Replaces any discount already on this invoice — it is one figure on the invoice, not a running total."
                  action={submit(applyInvoiceDiscount.bind(null, tournamentId, invoiceId))}
                  submitLabel="Apply discount"
                  pending={pending}
                  error={error}
                  onCancel={close}
                >
                  <Field label="Discount code" optional>
                    <input name="code" className="input w-full" placeholder="EARLYBIRD" />
                  </Field>
                  <Field label="Type">
                    <select name="mode" className="input w-full" defaultValue="AMOUNT">
                      <option value="AMOUNT">Fixed amount</option>
                      <option value="PERCENT">Percentage of subtotal</option>
                    </select>
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Amount">
                      <input name="amount" className="input w-full" defaultValue="0" inputMode="decimal" />
                    </Field>
                    <Field label="Percent">
                      <input name="percent" className="input w-full" defaultValue="0" inputMode="decimal" />
                    </Field>
                  </div>
                  <p className="text-[11px] text-ink3">Whichever matches the type you picked above is the one used.</p>
                </Form>
              )}

              {dialog === "refund" && (
                <Form
                  title="Issue a refund or adjustment"
                  hint="Recorded as a negative entry against this invoice. Nothing is deleted — the original payment stays in the audit trail beside it. Moving the money itself happens in your bank or card processor."
                  action={submit(issueInvoiceRefund.bind(null, tournamentId, invoiceId))}
                  submitLabel="Record it"
                  pending={pending}
                  error={error}
                  onCancel={close}
                >
                  <Field label="Amount">
                    <input name="amount" className="input w-full" inputMode="decimal" required />
                  </Field>
                  <Field label="Kind">
                    <select name="kind" className="input w-full" defaultValue="REFUND">
                      <option value="REFUND">Refund — money returned to the club</option>
                      <option value="ADJUSTMENT">Adjustment — writing the balance down</option>
                    </select>
                  </Field>
                  <Field label="Reference" optional>
                    <input name="reference" className="input w-full" placeholder="Refund ID" />
                  </Field>
                  <Field label="Reason" optional>
                    <input name="note" className="input w-full" placeholder="Why this was issued" />
                  </Field>
                </Form>
              )}

              {dialog === "plan" && (
                <Form
                  title="Set a payment plan"
                  hint={`Splits the ${balanceLabel} still outstanding into a deposit plus monthly instalments. These are dates to chase and mark off by hand — Jogo has no payment processor connected, so nothing here debits anybody.`}
                  action={submit(createInvoicePaymentPlan.bind(null, tournamentId, invoiceId))}
                  submitLabel="Build the schedule"
                  pending={pending}
                  error={error}
                  onCancel={close}
                >
                  <Field label="Deposit">
                    <input name="deposit" className="input w-full" defaultValue="0" inputMode="decimal" />
                  </Field>
                  <Field label="Number of instalments">
                    <input name="installments" type="number" min={1} max={24} className="input w-full" defaultValue={3} />
                  </Field>
                  <Field label="First payment due">
                    <input
                      name="firstDue"
                      type="date"
                      className="input w-full"
                      defaultValue={new Date().toISOString().slice(0, 10)}
                    />
                  </Field>
                  <p className="text-[11px] text-warning-500">Replaces any schedule already on this invoice.</p>
                </Form>
              )}
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}

function Form({
  title,
  hint,
  action,
  submitLabel,
  pending,
  error,
  onCancel,
  children,
}: {
  title: string;
  hint: string;
  action: (formData: FormData) => void;
  submitLabel: string;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  return (
    <form action={action} className="space-y-4">
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
          {pending ? "Working…" : submitLabel}
        </button>
        <button type="button" className="btn-ghost text-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
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
