import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Tournaments,
  Teams,
  Invoices,
  InvoiceItems,
  InvoicePayments,
  InvoiceInstallments,
  SiteSettings,
} from "@/lib/models";
import {
  computeTotals,
  deriveStatus,
  invoiceStatusClass,
  lineTotalCents,
  nextInstallment,
  daysUntil,
  money,
  formatDate,
} from "@/lib/invoices";
import { InvoiceActions } from "@/components/InvoiceActions";
import { InvoicePaper } from "@/components/InvoicePaper";
import { InvoiceDocument } from "@/components/InvoiceDocument";
import { setInstallmentPaid, setTeamWaiverReceived } from "@/lib/actions";

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string; invoiceId: string };
}) {
  const tournament = await Tournaments.byId(params.id);
  if (!tournament) notFound();

  const invoice = await Invoices.byId(params.invoiceId);
  // Scoped to the tournament in the URL, not just looked up by id: without
  // this an invoice id from one event would render inside another event's
  // dashboard.
  if (!invoice || invoice.tournamentId !== tournament.id) notFound();

  const [items, payments, installments, business, team] = await Promise.all([
    InvoiceItems.listByInvoice(invoice.id),
    InvoicePayments.listByInvoice(invoice.id),
    InvoiceInstallments.listByInvoice(invoice.id),
    SiteSettings.getBusiness(),
    invoice.teamId ? Teams.byId(invoice.teamId) : Promise.resolve(undefined),
  ]);

  const totals = computeTotals(invoice, items, payments);
  const status = deriveStatus(totals, invoice.dueAt);
  const next = nextInstallment(installments);
  const dueInDays = daysUntil(invoice.dueAt);
  const depositPaid = installments.filter((i) => i.paidAt).reduce((s, i) => s + i.amountCents, 0);

  return (
    <div className="space-y-6">
      <div className="no-print">
        <Link
          href={`/dashboard/tournaments/${tournament.id}/finance`}
          className="text-xs text-ink2 hover:text-inkDisplay"
        >
          ← Back to finance
        </Link>
      </div>

      {/* Header */}
      <div className="card mesh p-5 sm:p-6 no-print">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-score text-2xl text-inkDisplay leading-none">{invoice.number}</h1>
              <span className={`badge ${invoiceStatusClass[status]} text-[10px]`}>{status}</span>
            </div>
            <p className="text-sm text-ink2 mt-2">{invoice.billToClub}</p>
            <p className="text-xs text-ink3">
              Issued {formatDate(invoice.issuedAt)} · Due {formatDate(invoice.dueAt)}
              {dueInDays !== null && status !== "PAID" && (
                <span className={dueInDays < 0 ? "text-warning-500" : ""}>
                  {dueInDays < 0 ? ` · ${Math.abs(dueInDays)} days overdue` : ` · in ${dueInDays} days`}
                </span>
              )}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-1">Balance due</p>
            <p
              className={`font-score text-3xl leading-none ${
                totals.balanceCents > 0 ? "text-warning-500" : "text-emerald-500"
              }`}
            >
              {money(totals.balanceCents)}
            </p>
            <p className="text-[11px] text-ink3 mt-1">
              {money(totals.netPaidCents)} of {money(totals.grandTotalCents)} settled
            </p>
          </div>
        </div>

        <div className="h-1.5 rounded-full bg-black/10 overflow-hidden mt-5">
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
            style={{
              width: `${
                totals.grandTotalCents
                  ? Math.min(100, Math.round((totals.netPaidCents / totals.grandTotalCents) * 100))
                  : 0
              }%`,
            }}
          />
        </div>
      </div>

      <div className="card p-5 sm:p-6 no-print">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-4">Actions</h2>
        <InvoiceActions
          tournamentId={tournament.id}
          invoiceId={invoice.id}
          balanceLabel={money(totals.balanceCents)}
          suggestedAmount={(Math.max(0, totals.balanceCents) / 100).toFixed(2)}
        />
      </div>

      {/* Billed party + event */}
      <div className="grid sm:grid-cols-2 gap-4 no-print">
        <div className="card p-5">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-3">Billed to</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Club" value={invoice.billToClub} />
            <Row label="Manager" value={invoice.billToContact || "—"} />
            <Row label="Email" value={invoice.billToEmail || "—"} />
            <Row label="Phone" value={invoice.billToPhone || "—"} />
          </dl>
        </div>
        <div className="card p-5">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-3">Event</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Tournament" value={tournament.name} />
            <Row label="Division" value={invoice.division || "Not assigned"} />
            <Row label="Teams" value={String(invoice.teamCount)} />
            <Row label="Group" value={team?.groupName ? `Group ${team.groupName}` : "—"} />
          </dl>
        </div>
      </div>

      {/* Line items */}
      <div className="card p-5 sm:p-6 no-print overflow-hidden">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-4">Line items</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[34rem]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-ink3">
                <th className="text-left font-semibold pb-2">Description</th>
                <th className="text-right font-semibold pb-2">Qty</th>
                <th className="text-right font-semibold pb-2">Unit</th>
                <th className="text-right font-semibold pb-2">Discount</th>
                <th className="text-right font-semibold pb-2">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lineSoft">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-ink2">
                    Nothing itemised on this invoice yet.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 pr-3">{item.description}</td>
                    <td className="py-3 text-right font-score">{item.quantity}</td>
                    <td className="py-3 text-right font-score">{money(item.unitPriceCents)}</td>
                    <td className="py-3 text-right font-score text-ink3">
                      {item.discountCents ? `−${money(item.discountCents)}` : "—"}
                    </td>
                    <td className="py-3 text-right font-score text-inkDisplay">{money(lineTotalCents(item))}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-5">
          <dl className="w-full sm:w-72 space-y-1.5 text-sm">
            <Money label="Subtotal" value={money(totals.subtotalCents)} />
            {totals.discountCents > 0 && (
              <Money
                label={`Discounts${invoice.discountCode ? ` · ${invoice.discountCode}` : ""}`}
                value={`−${money(totals.discountCents)}`}
              />
            )}
            {totals.processingFeeCents > 0 && (
              <Money label="Processing fees" value={money(totals.processingFeeCents)} />
            )}
            <div className="pt-2 border-t border-line">
              <Money label="Grand total" value={money(totals.grandTotalCents)} strong />
            </div>
            <Money label="Paid to date" value={money(totals.netPaidCents)} />
            {totals.refundsCents > 0 && <Money label="Refunded" value={`−${money(totals.refundsCents)}`} />}
            <div className="pt-2 border-t border-line">
              <Money label="Balance due" value={money(totals.balanceCents)} strong />
            </div>
          </dl>
        </div>
      </div>

      {/* Payment plan */}
      <div className="card p-5 sm:p-6 no-print">
        <div className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2">Payment plan</h2>
          {next && (
            <p className="text-xs text-ink2">
              Next: <span className="text-inkDisplay font-semibold">{money(next.amountCents)}</span> on{" "}
              {formatDate(next.dueAt)}
            </p>
          )}
        </div>

        {installments.length === 0 ? (
          <p className="text-sm text-ink2">
            No plan on this invoice — the full {money(totals.grandTotalCents)} is due on {formatDate(invoice.dueAt)}.
            Use “Set payment plan” above to split it.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 mb-5">
              <Stat label="Settled on plan" value={money(depositPaid)} />
              <Stat label="Remaining balance" value={money(totals.balanceCents)} />
              <Stat label="Next due" value={next ? formatDate(next.dueAt) : "—"} />
            </div>
            <ul className="divide-y divide-lineSoft">
              {installments.map((inst) => (
                <li key={inst.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{inst.label}</p>
                    <p className="text-xs text-ink3">
                      Due {formatDate(inst.dueAt)}
                      {inst.paidAt ? ` · settled ${formatDate(inst.paidAt)}` : ""}
                    </p>
                  </div>
                  <span className="font-score text-sm text-inkDisplay shrink-0">{money(inst.amountCents)}</span>
                  <form
                    action={setInstallmentPaid.bind(
                      null,
                      tournament.id,
                      invoice.id,
                      inst.id,
                      !inst.paidAt
                    )}
                  >
                    <button
                      type="submit"
                      className={`text-[11px] px-2.5 py-1.5 shrink-0 ${inst.paidAt ? "btn-ghost" : "btn-secondary"}`}
                    >
                      {inst.paidAt ? "Undo" : "Mark settled"}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* The gap, named. Auto-debit and a card on file are the two things a
            reader of this panel would reasonably assume are here. */}
        <p className="text-[11px] text-ink3 mt-4 pt-4 border-t border-lineSoft">
          Instalments are marked off by hand. There is no payment processor connected to Jogo, so no card is stored and
          nothing is auto-debited — wiring one up is what would make these dates collect on their own.
        </p>
      </div>

      {/* Waivers */}
      {team && (
        <div className="card p-5 sm:p-6 no-print">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-1.5">
                Waivers &amp; forms
              </h2>
              <p className="text-sm">
                {team.waiverReceivedAt ? (
                  <span className="text-emerald-500 font-semibold">
                    On file since {formatDate(team.waiverReceivedAt)}
                  </span>
                ) : (
                  <span className="text-warning-500 font-semibold">Not yet received</span>
                )}
              </p>
              <p className="text-[11px] text-ink3 mt-1.5 max-w-lg">
                A record that you hold this club’s paperwork, stamped with the date you confirmed it. Jogo does not
                collect or store signed documents, so this is your confirmation — not an e-signature.
              </p>
            </div>
            <form action={setTeamWaiverReceived.bind(null, tournament.id, team.id, !team.waiverReceivedAt)}>
              <button type="submit" className={team.waiverReceivedAt ? "btn-ghost text-xs" : "btn-secondary text-xs"}>
                {team.waiverReceivedAt ? "Clear" : "Mark received"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Audit trail */}
      <div className="card p-5 sm:p-6 no-print overflow-hidden">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-4">Transaction history</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-ink2 py-6 text-center">Nothing recorded against this invoice yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[34rem]">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-ink3">
                  <th className="text-left font-semibold pb-2">Date</th>
                  <th className="text-left font-semibold pb-2">Reference</th>
                  <th className="text-left font-semibold pb-2">Method</th>
                  <th className="text-left font-semibold pb-2">Recorded by</th>
                  <th className="text-right font-semibold pb-2">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lineSoft">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 pr-3 whitespace-nowrap">{formatDate(p.recordedAt)}</td>
                    <td className="py-3 pr-3 text-ink2 font-mono text-xs">{p.reference || p.id.slice(0, 8)}</td>
                    <td className="py-3 pr-3">
                      <span className="badge text-[10px]">{p.method}</span>
                    </td>
                    <td className="py-3 pr-3 text-ink2">{p.recordedByName || "—"}</td>
                    <td
                      className={`py-3 text-right font-score ${
                        p.amountCents < 0 ? "text-warning-500" : "text-emerald-500"
                      }`}
                    >
                      {money(p.amountCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {payments.some((p) => p.note) && (
          <ul className="mt-4 pt-4 border-t border-lineSoft space-y-1.5">
            {payments
              .filter((p) => p.note)
              .map((p) => (
                <li key={p.id} className="text-[11px] text-ink3">
                  <span className="font-mono">{p.reference || p.id.slice(0, 8)}</span> — {p.note}
                </li>
              ))}
          </ul>
        )}
      </div>

      {/* Print / preview. The document is server-rendered and handed to the
          client wrapper as children, so none of it ships as a client bundle.
          Deliberately not wrapped in a no-print card here — InvoicePaper owns
          its own chrome precisely so the paper copy is never a descendant of
          something print hides. */}
      <InvoicePaper>
        <InvoiceDocument
          invoice={invoice}
          items={items}
          payments={payments}
          installments={installments}
          business={business}
          tournamentName={tournament.name}
          waiverReceivedAt={team?.waiverReceivedAt ?? null}
        />
      </InvoicePaper>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="text-[11px] uppercase tracking-wide text-ink3 font-semibold w-20 shrink-0">{label}</dt>
      <dd className="min-w-0 truncate">{value}</dd>
    </div>
  );
}

function Money({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={strong ? "font-semibold text-inkDisplay" : "text-ink2"}>{label}</dt>
      <dd className={`font-score ${strong ? "text-inkDisplay text-base" : "text-ink2"}`}>{value}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-1 truncate">{label}</p>
      <p className="font-score text-xl text-inkDisplay leading-none">{value}</p>
    </div>
  );
}
