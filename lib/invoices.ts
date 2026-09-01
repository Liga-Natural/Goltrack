import type { Invoice, InvoiceItem, InvoicePayment, InvoiceInstallment } from "@/lib/models";

// Every figure on an invoice is derived here, in one place, from the rows
// that actually exist — never stored as a summary column. A cached total is
// a total that can disagree with its own line items after a discount is
// applied or a refund is recorded, and an invoice that disagrees with itself
// is worse than no invoice at all.

export const money = (cents: number) =>
  `${cents < 0 ? "-" : ""}$${Math.abs(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export type InvoiceStatus = "PAID" | "PARTIAL" | "OVERDUE" | "DUE";

export interface InvoiceTotals {
  subtotalCents: number;
  lineDiscountCents: number;
  invoiceDiscountCents: number;
  discountCents: number;
  processingFeeCents: number;
  grandTotalCents: number;
  /** Money in, net of refunds — refunds are stored as negative payments. */
  netPaidCents: number;
  paymentsInCents: number;
  refundsCents: number;
  balanceCents: number;
}

export function lineTotalCents(item: InvoiceItem): number {
  return Math.max(0, item.quantity * item.unitPriceCents - item.discountCents);
}

export function computeTotals(
  invoice: Pick<Invoice, "discountCents" | "processingFeeCents">,
  items: InvoiceItem[],
  payments: InvoicePayment[]
): InvoiceTotals {
  const subtotalCents = items.reduce((sum, i) => sum + i.quantity * i.unitPriceCents, 0);
  const lineDiscountCents = items.reduce((sum, i) => sum + i.discountCents, 0);
  const invoiceDiscountCents = invoice.discountCents;
  const discountCents = lineDiscountCents + invoiceDiscountCents;
  const processingFeeCents = invoice.processingFeeCents;

  // Clamped at zero: a discount larger than the line items must not produce a
  // negative invoice that then reads as an overpayment owed back to the club.
  const grandTotalCents = Math.max(0, subtotalCents - discountCents + processingFeeCents);

  const paymentsInCents = payments.filter((p) => p.amountCents > 0).reduce((s, p) => s + p.amountCents, 0);
  const refundsCents = payments.filter((p) => p.amountCents < 0).reduce((s, p) => s + -p.amountCents, 0);
  const netPaidCents = paymentsInCents - refundsCents;

  return {
    subtotalCents,
    lineDiscountCents,
    invoiceDiscountCents,
    discountCents,
    processingFeeCents,
    grandTotalCents,
    netPaidCents,
    paymentsInCents,
    refundsCents,
    balanceCents: grandTotalCents - netPaidCents,
  };
}

// OVERDUE outranks PARTIAL deliberately. A club that paid a deposit and then
// missed the due date is a collections problem, not a payment-in-progress —
// the badge should say the thing an organizer has to act on, and the amounts
// beside it already show how much of it was covered.
export function deriveStatus(totals: InvoiceTotals, dueAt: string, now = new Date()): InvoiceStatus {
  if (totals.balanceCents <= 0 && totals.grandTotalCents > 0) return "PAID";
  const due = new Date(dueAt);
  if (!Number.isNaN(due.getTime()) && due.getTime() < now.getTime()) return "OVERDUE";
  if (totals.netPaidCents > 0) return "PARTIAL";
  return "DUE";
}

export const invoiceStatusClass: Record<InvoiceStatus, string> = {
  PAID: "badge-accepted",
  PARTIAL: "badge-pending",
  OVERDUE: "badge-danger",
  DUE: "badge-pending",
};

/** The earliest scheduled instalment nobody has settled yet. */
export function nextInstallment(installments: InvoiceInstallment[]): InvoiceInstallment | undefined {
  return installments
    .filter((i) => !i.paidAt)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
}

export function daysUntil(iso: string, now = new Date()): number | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.round((d.getTime() - now.getTime()) / 86_400_000);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// A payment plan the organizer defines: a deposit taken now, then the
// remainder split evenly across monthly instalments. The rounding remainder
// goes on the final instalment rather than being spread, so every figure is a
// whole cent and the parts add up to the total exactly.
export function buildPaymentPlan(
  grandTotalCents: number,
  depositCents: number,
  installmentCount: number,
  firstDueAt: Date
): { label: string; amountCents: number; dueAt: string }[] {
  const deposit = Math.max(0, Math.min(depositCents, grandTotalCents));
  const remainder = grandTotalCents - deposit;
  const count = Math.max(1, Math.min(24, Math.floor(installmentCount)));
  const per = Math.floor(remainder / count);

  const plan: { label: string; amountCents: number; dueAt: string }[] = [];
  if (deposit > 0) {
    plan.push({ label: "Deposit", amountCents: deposit, dueAt: firstDueAt.toISOString() });
  }
  for (let i = 0; i < count; i++) {
    const due = new Date(firstDueAt);
    due.setMonth(due.getMonth() + i + (deposit > 0 ? 1 : 0));
    const isLast = i === count - 1;
    plan.push({
      label: `Instalment ${i + 1} of ${count}`,
      amountCents: isLast ? remainder - per * (count - 1) : per,
      dueAt: due.toISOString(),
    });
  }
  return plan.filter((p) => p.amountCents > 0);
}

/**
 * INV-2026-0001. The sequence restarts each year and is derived from the
 * highest number already issued in that year, so numbering stays gapless and
 * readable. A unique index on the column is what actually prevents a
 * collision if two organizers issue at the same instant; this only has to
 * propose the next one.
 */
export function nextInvoiceNumber(existingNumbers: string[], year: number): string {
  const prefix = `INV-${year}-`;
  const highest = existingNumbers
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.slice(prefix.length), 10))
    .filter((n) => Number.isFinite(n))
    .reduce((max, n) => Math.max(max, n), 0);
  return `${prefix}${String(highest + 1).padStart(4, "0")}`;
}
