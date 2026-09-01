import type { Invoice, InvoiceItem, InvoicePayment, InvoiceInstallment, BusinessIdentity } from "@/lib/models";
import { computeTotals, deriveStatus, lineTotalCents, money, formatDate } from "@/lib/invoices";

// The paper copy. Every colour here is a literal hex, never a theme token:
// tailwind.config.ts maps `black` to --ink and `white` to --paper, so in dark
// mode `text-black` is white ink. A document that has to come out of a printer
// as black-on-white must not participate in theming at all.
const INK = "#111111";
const MUTED = "#5b5b5b";
const RULE = "#d8d8d8";

export function InvoiceDocument({
  invoice,
  items,
  payments,
  installments,
  business,
  tournamentName,
  waiverReceivedAt,
}: {
  invoice: Invoice;
  items: InvoiceItem[];
  payments: InvoicePayment[];
  installments: InvoiceInstallment[];
  business: BusinessIdentity;
  tournamentName: string;
  waiverReceivedAt: string | null;
}) {
  const totals = computeTotals(invoice, items, payments);
  const status = deriveStatus(totals, invoice.dueAt);

  return (
    <article
      className="invoice-doc mx-auto bg-[#ffffff] p-10"
      style={{ color: INK, width: "100%", maxWidth: "48rem" }}
    >
      <header className="flex items-start justify-between gap-8 pb-6" style={{ borderBottom: `2px solid ${INK}` }}>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/jogo-wordmark.png" alt="Jogo" style={{ height: 26, width: "auto" }} />
          <div className="mt-3 text-[11px] leading-relaxed" style={{ color: MUTED }}>
            {/* Unset fields say so. An invoice carrying an invented address or
                tax ID is a document someone files with their accounts. */}
            <p style={{ color: INK, fontWeight: 700 }}>{business.businessName || "Business name not set"}</p>
            {business.businessAddress ? (
              business.businessAddress.split("\n").map((line, i) => <p key={i}>{line}</p>)
            ) : (
              <p>Business address not set</p>
            )}
            <p>Tax ID: {business.taxId || "not set"}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold" style={{ color: MUTED }}>
            Invoice
          </p>
          <p className="text-2xl font-extrabold tabular-nums leading-tight">{invoice.number}</p>
          <table className="mt-3 text-[11px] ml-auto">
            <tbody>
              <Meta label="Issued" value={formatDate(invoice.issuedAt)} />
              <Meta label="Due" value={formatDate(invoice.dueAt)} />
              <Meta label="Status" value={status} bold />
            </tbody>
          </table>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-8 py-6" style={{ borderBottom: `1px solid ${RULE}` }}>
        <div>
          <SectionLabel>Billed to</SectionLabel>
          <p className="font-bold text-sm">{invoice.billToClub}</p>
          <div className="text-[11px] leading-relaxed" style={{ color: MUTED }}>
            <p>{invoice.billToContact}</p>
            <p>{invoice.billToEmail}</p>
            {invoice.billToPhone && <p>{invoice.billToPhone}</p>}
          </div>
        </div>
        <div>
          <SectionLabel>Event</SectionLabel>
          <p className="font-bold text-sm">{tournamentName}</p>
          <div className="text-[11px] leading-relaxed" style={{ color: MUTED }}>
            <p>Division: {invoice.division || "not assigned"}</p>
            <p>
              Teams registered: {invoice.teamCount}
            </p>
            <p>Waivers on file: {waiverReceivedAt ? formatDate(waiverReceivedAt) : "not recorded"}</p>
          </div>
        </div>
      </section>

      <section className="py-6">
        <table className="w-full text-[11px]" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${INK}` }}>
              <Th align="left">Description</Th>
              <Th align="right">Qty</Th>
              <Th align="right">Unit</Th>
              <Th align="right">Discount</Th>
              <Th align="right">Amount</Th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center" style={{ color: MUTED }}>
                  No line items on this invoice.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} style={{ borderBottom: `1px solid ${RULE}` }}>
                  <Td align="left">{item.description}</Td>
                  <Td align="right">{item.quantity}</Td>
                  <Td align="right">{money(item.unitPriceCents)}</Td>
                  <Td align="right">{item.discountCents ? `−${money(item.discountCents)}` : "—"}</Td>
                  <Td align="right" bold>
                    {money(lineTotalCents(item))}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="flex justify-end mt-5">
          <table className="text-[11px] min-w-[16rem]">
            <tbody>
              <Total label="Subtotal" value={money(totals.subtotalCents)} />
              {totals.discountCents > 0 && (
                <Total
                  label={`Discounts${invoice.discountCode ? ` (${invoice.discountCode})` : ""}`}
                  value={`−${money(totals.discountCents)}`}
                />
              )}
              {totals.processingFeeCents > 0 && (
                <Total label="Processing fees" value={money(totals.processingFeeCents)} />
              )}
              <Total label="Grand total" value={money(totals.grandTotalCents)} strong />
              <Total label="Paid to date" value={money(totals.netPaidCents)} />
              <Total label="Balance due" value={money(totals.balanceCents)} strong />
            </tbody>
          </table>
        </div>
      </section>

      {installments.length > 0 && (
        <section className="py-5" style={{ borderTop: `1px solid ${RULE}` }}>
          <SectionLabel>Payment schedule</SectionLabel>
          <table className="w-full text-[11px]" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${RULE}` }}>
                <Th align="left">Instalment</Th>
                <Th align="left">Due</Th>
                <Th align="right">Amount</Th>
                <Th align="right">Settled</Th>
              </tr>
            </thead>
            <tbody>
              {installments.map((inst) => (
                <tr key={inst.id} style={{ borderBottom: `1px solid ${RULE}` }}>
                  <Td align="left">{inst.label}</Td>
                  <Td align="left">{formatDate(inst.dueAt)}</Td>
                  <Td align="right">{money(inst.amountCents)}</Td>
                  <Td align="right">{inst.paidAt ? formatDate(inst.paidAt) : "—"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="py-5" style={{ borderTop: `1px solid ${RULE}` }}>
        <SectionLabel>Payment audit trail</SectionLabel>
        {payments.length === 0 ? (
          <p className="text-[11px]" style={{ color: MUTED }}>
            No payments recorded against this invoice.
          </p>
        ) : (
          <table className="w-full text-[11px]" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${RULE}` }}>
                <Th align="left">Date</Th>
                <Th align="left">Reference</Th>
                <Th align="left">Method</Th>
                <Th align="left">Recorded by</Th>
                <Th align="right">Amount</Th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} style={{ borderBottom: `1px solid ${RULE}` }}>
                  <Td align="left">{formatDate(p.recordedAt)}</Td>
                  <Td align="left">{p.reference || p.id.slice(0, 8)}</Td>
                  <Td align="left">{p.method}</Td>
                  <Td align="left">{p.recordedByName || "—"}</Td>
                  <Td align="right" bold>
                    {money(p.amountCents)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <footer className="pt-5 text-[10px] leading-relaxed" style={{ borderTop: `1px solid ${RULE}`, color: MUTED }}>
        {invoice.notes && <p className="mb-2">{invoice.notes}</p>}
        <p>
          Payments are recorded by the organizer. Jogo does not process card payments, so every entry above was taken
          outside this system and entered by the named person.
        </p>
      </footer>
    </article>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.18em] font-bold mb-2" style={{ color: MUTED }}>
      {children}
    </p>
  );
}

function Meta({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <tr>
      <td className="pr-3 text-left" style={{ color: MUTED }}>
        {label}
      </td>
      <td className="text-right tabular-nums" style={{ fontWeight: bold ? 700 : 400 }}>
        {value}
      </td>
    </tr>
  );
}

function Th({ children, align }: { children: React.ReactNode; align: "left" | "right" }) {
  return (
    <th
      className="py-2 text-[10px] uppercase tracking-wider font-bold"
      style={{ textAlign: align, color: MUTED }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
  bold,
}: {
  children: React.ReactNode;
  align: "left" | "right";
  bold?: boolean;
}) {
  return (
    <td className="py-2 tabular-nums" style={{ textAlign: align, fontWeight: bold ? 700 : 400 }}>
      {children}
    </td>
  );
}

function Total({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <tr style={strong ? { borderTop: `1px solid ${INK}` } : undefined}>
      <td className="py-1.5 pr-6 text-left" style={{ color: strong ? INK : MUTED, fontWeight: strong ? 700 : 400 }}>
        {label}
      </td>
      <td className="py-1.5 text-right tabular-nums" style={{ fontWeight: strong ? 700 : 400 }}>
        {value}
      </td>
    </tr>
  );
}
