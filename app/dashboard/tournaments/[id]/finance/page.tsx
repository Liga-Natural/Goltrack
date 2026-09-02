import Link from "next/link";
import { Tournaments, Teams, Applications, Invoices } from "@/lib/models";
import { TeamBadge } from "@/components/TeamBadge";
import { deriveStatus, invoiceStatusClass, money as fullMoney, formatDate } from "@/lib/invoices";
import { generateInvoices, setTeamWaiverReceived } from "@/lib/actions";

const money = (cents: number) =>
  `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-1 truncate">{label}</p>
      <p className={`font-score text-2xl leading-none ${tone || "text-inkDisplay"}`}>{value}</p>
    </div>
  );
}

export default async function FinancePage({ params }: { params: { id: string } }) {
  const tournament = (await Tournaments.byId(params.id))!;
  const [allTeams, applications, invoices, invoiceTotals] = await Promise.all([
    Teams.listByTournament(params.id),
    Applications.listByTournament(params.id),
    Invoices.listByTournament(params.id),
    // One grouped query per figure rather than three queries per invoice —
    // a 40-team event would otherwise open 120 round trips to render a list.
    Invoices.totalsByTournament(params.id),
  ]);
  const teams = allTeams.filter((t) => t.name);

  const fee = tournament.feeCents;
  const paidTeams = teams.filter((t) => t.paid);

  // Headline money comes from the invoice ledger, summed the same way the
  // invoice list below and the invoice page itself compute a grand total:
  // line items, less discounts, plus any processing fee, against payments
  // recorded. The old figures here were teams x fee and paid-teams x fee,
  // which ignored a discount and counted a part payment as nothing — so an
  // organizer who discounted one entry saw "Invoiced $1,650" while the
  // invoice said $1,635, and the platform ledger disagreed about collected
  // cash. One event's money now reads the same everywhere it is shown.
  const ledger = invoices.reduce(
    (acc, inv) => {
      const roll = invoiceTotals.get(inv.id) ?? { chargedCents: 0, paidCents: 0 };
      acc.invoiced += Math.max(0, roll.chargedCents - inv.discountCents + inv.processingFeeCents);
      acc.collected += roll.paidCents;
      return acc;
    },
    { invoiced: 0, collected: 0 }
  );
  // Before any invoice is raised there is no ledger to read, so the entry fee
  // per entrant stands in — and the caption says which of the two you are
  // looking at rather than letting an estimate pass as a bill.
  const fromLedger = invoices.length > 0;
  const invoiced = fromLedger ? ledger.invoiced : teams.length * fee;
  const collected = fromLedger ? ledger.collected : paidTeams.length * fee;
  const outstanding = Math.max(0, invoiced - collected);

  // Payment intent recorded at application time, which is richer than the
  // team row's single paid flag: it distinguishes a deposit from an invoice
  // request from nothing at all.
  const intentByTeamId = new Map(
    applications.filter((a) => a.teamId).map((a) => [a.teamId as string, a.paymentStatus])
  );

  const status =
    outstanding === 0 && teams.length > 0 ? "Paid" : collected > 0 ? "Partial" : "Outstanding";
  const statusCls =
    status === "Paid" ? "badge-accepted" : status === "Partial" ? "badge-pending" : "badge-danger";

  return (
    <div className="space-y-6">
      <div className="card mesh p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <h1 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2">Entry fees</h1>
          <span className={`badge ${statusCls} text-[10px]`}>{status}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          <Stat label="Invoiced" value={money(invoiced)} />
          <Stat label="Collected" value={money(collected)} tone="text-emerald-500" />
          <Stat
            label="Outstanding"
            value={money(outstanding)}
            tone={outstanding > 0 ? "text-warning-500" : "text-inkDisplay"}
          />
          <Stat label="Rate" value={`${money(fee)}/team`} />
        </div>
        <div className="h-1.5 rounded-full bg-black/10 overflow-hidden mt-5">
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
            style={{ width: `${invoiced ? Math.round((collected / invoiced) * 100) : 0}%` }}
          />
        </div>
        <p className="text-[11px] text-ink3 mt-2">
          {fromLedger
            ? `${paidTeams.length} of ${teams.length} teams settled · from ${invoices.length} invoice${
                invoices.length === 1 ? "" : "s"
              }, including discounts and part payments`
            : `${paidTeams.length} of ${teams.length} teams settled · estimated at the flat ${money(
                fee
              )} entry fee per entrant — no invoices raised yet`}
        </p>
      </div>

      <div className="card p-5 sm:p-6">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-4">Line items</h2>
        {teams.length === 0 ? (
          <p className="text-sm text-ink2 py-8 text-center">No entrants yet, so nothing is invoiced.</p>
        ) : (
          <div className="divide-y divide-lineSoft">
            {teams.map((t) => {
              const intent = intentByTeamId.get(t.id);
              return (
                <div key={t.id} className="flex items-center gap-3 py-3">
                  <TeamBadge
                    id={t.id}
                    name={t.name}
                    hasCrest={t.hasCrest}
                    crestUpdatedAt={t.crestUpdatedAt}
                    logoUrl={t.logoUrl}
                    sport={tournament.sport}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{t.name}</p>
                    <p className="text-xs text-ink3 truncate">
                      Entry fee{t.groupName ? ` · Group ${t.groupName}` : ""}
                      {intent && intent !== "UNPAID" ? ` · ${intent.replace("_", " ").toLowerCase()}` : ""}
                    </p>
                  </div>
                  <span className="font-score text-sm text-inkDisplay shrink-0">{money(fee)}</span>
                  <span className={`badge text-[10px] shrink-0 ${t.paid ? "badge-accepted" : "badge-pending"}`}>
                    {t.paid ? "Paid" : "Due"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invoices */}
      <div className="card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2">Invoices</h2>
          <form action={generateInvoices.bind(null, tournament.id)}>
            <button type="submit" className="btn-secondary text-xs">
              {invoices.length === 0 ? "Raise invoices" : "Raise any missing"}
            </button>
          </form>
        </div>

        {invoices.length === 0 ? (
          <p className="text-sm text-ink2 py-6 text-center">
            No invoices raised yet. Raising them creates one per entrant at the {money(fee)} entry fee, numbered
            INV-{new Date().getFullYear()}-0001 onward.
          </p>
        ) : (
          <div className="divide-y divide-lineSoft">
            {invoices.map((inv) => {
              const roll = invoiceTotals.get(inv.id) ?? { chargedCents: 0, paidCents: 0 };
              // Same shape computeTotals returns, built from the grouped
              // query so the badge here agrees with the invoice page.
              const grand = Math.max(0, roll.chargedCents - inv.discountCents + inv.processingFeeCents);
              const totals = {
                subtotalCents: roll.chargedCents,
                lineDiscountCents: 0,
                invoiceDiscountCents: inv.discountCents,
                discountCents: inv.discountCents,
                processingFeeCents: inv.processingFeeCents,
                grandTotalCents: grand,
                netPaidCents: roll.paidCents,
                paymentsInCents: roll.paidCents,
                refundsCents: 0,
                balanceCents: grand - roll.paidCents,
              };
              const status = deriveStatus(totals, inv.dueAt);
              return (
                <Link
                  key={inv.id}
                  href={`/dashboard/tournaments/${tournament.id}/finance/invoices/${inv.id}`}
                  className="flex items-center gap-3 py-3 hover:opacity-80 transition-opacity"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">
                      <span className="font-score text-ink2 mr-2">{inv.number}</span>
                      {inv.billToClub}
                    </p>
                    <p className="text-xs text-ink3 truncate">
                      Due {formatDate(inv.dueAt)}
                      {inv.division ? ` · ${inv.division}` : ""}
                    </p>
                  </div>
                  <span className="font-score text-sm text-inkDisplay shrink-0">
                    {fullMoney(totals.balanceCents)}
                  </span>
                  <span className={`badge ${invoiceStatusClass[status]} text-[10px] shrink-0`}>{status}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Was "not built" until this release: waivers now have somewhere to
          live (teams.waiverReceivedAt). What is tracked is deliberately
          narrow — the organizer confirming they hold the paperwork — because
          Jogo still stores no documents and collects no signatures. */}
      <div className="card p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2">Waivers &amp; forms</h2>
          <p className="text-xs text-ink2">
            <span className="text-inkDisplay font-score">{teams.filter((t) => t.waiverReceivedAt).length}</span> of{" "}
            {teams.length} on file
          </p>
        </div>
        {teams.length === 0 ? (
          <p className="text-sm text-ink2 py-6 text-center">No entrants yet.</p>
        ) : (
          <div className="divide-y divide-lineSoft">
            {teams.map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{t.name}</p>
                  <p className="text-xs text-ink3">
                    {t.waiverReceivedAt ? `Received ${formatDate(t.waiverReceivedAt)}` : "Not received"}
                  </p>
                </div>
                <form action={setTeamWaiverReceived.bind(null, tournament.id, t.id, !t.waiverReceivedAt)}>
                  <button
                    type="submit"
                    className={`text-[11px] px-2.5 py-1.5 ${t.waiverReceivedAt ? "btn-ghost" : "btn-secondary"}`}
                  >
                    {t.waiverReceivedAt ? "Clear" : "Mark received"}
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-ink3 mt-4 pt-4 border-t border-lineSoft">
          This records that you hold a club’s paperwork and when you confirmed it. Jogo does not store the documents
          themselves or capture signatures — collecting those needs a document store this app does not have.
        </p>
      </div>
    </div>
  );
}
