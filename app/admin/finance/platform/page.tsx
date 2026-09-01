import { redirect } from "next/navigation";
import { Tournaments, PlatformFees, PlatformPayouts, collectedByTournament } from "@/lib/models";
import { getCurrentUser } from "@/lib/auth";
import { platformFeeCents, describePlatformFee } from "@/lib/pricing";
import { money, formatDate } from "@/lib/invoices";
import { PlatformFeeForm, RecordPayoutForm } from "@/components/PlatformFeeForm";

function Kpi({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="card p-5 min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-1.5 truncate">{label}</p>
      <p className="font-score text-2xl text-inkDisplay leading-none">{value}</p>
      {detail && <p className="text-[11px] text-ink3 mt-2">{detail}</p>}
    </div>
  );
}

export default async function PlatformFinancePage() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (current.role !== "ADMIN") redirect("/dashboard");

  const [tournaments, platform, collected, payouts, payoutRows] = await Promise.all([
    Tournaments.listAll(),
    PlatformFees.get(),
    collectedByTournament(),
    PlatformPayouts.totalsByTournament(),
    PlatformPayouts.listAll(50),
  ]);

  // Gross volume is money actually recorded against invoices, not billed
  // amounts: an invoice nobody has paid is not volume. Fees are computed from
  // the current rule over that collected total, so changing the rule restates
  // the figure rather than rewriting history — which is worth knowing before
  // reading it as booked revenue.
  const rows = tournaments
    .map((t) => {
      const collectedCents = collected.get(t.id) ?? 0;
      const feeCents = platformFeeCents(collectedCents, platform);
      const paidOutCents = payouts.get(t.id) ?? 0;
      const owedCents = Math.max(0, collectedCents - feeCents - paidOutCents);
      const status = collectedCents === 0 ? "NO REVENUE" : owedCents === 0 ? "PAID OUT" : paidOutCents > 0 ? "PARTIAL" : "PENDING";
      return { t, collectedCents, feeCents, paidOutCents, owedCents, status };
    })
    .sort((a, b) => b.collectedCents - a.collectedCents);

  const gmv = rows.reduce((s, r) => s + r.collectedCents, 0);
  const fees = rows.reduce((s, r) => s + r.feeCents, 0);
  const paidOut = rows.reduce((s, r) => s + r.paidOutCents, 0);
  const owed = rows.reduce((s, r) => s + r.owedCents, 0);

  const statusClass = (s: string) =>
    s === "PAID OUT" ? "badge-accepted" : s === "PENDING" || s === "PARTIAL" ? "badge-pending" : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-inkDisplay mb-1">Platform finance</h1>
        <p className="text-ink2 text-sm font-medium">
          What the platform has processed, what Jogo&apos;s cut comes to, and what is still owed to organizers.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Gross volume" value={money(gmv)} detail="Recorded against invoices, net of refunds" />
        <Kpi label="Platform fees" value={money(fees)} detail={describePlatformFee(platform)} />
        <Kpi label="Payouts recorded" value={money(paidOut)} detail={`${payoutRows.length} transfer${payoutRows.length === 1 ? "" : "s"} logged`} />
        <Kpi label="Owed to organizers" value={money(owed)} detail="Collected, less fees, less payouts logged" />
      </div>

      {/* The honest framing of the tile above. Jogo never holds anyone's money,
          so there is no escrow balance to report — organizers collect
          directly and this is a reconciliation figure, not a float. */}
      <div className="card p-4 sm:p-5">
        <p className="text-[11px] text-ink3">
          Jogo does not hold funds. Organizers collect payments themselves and record them against invoices, so
          &ldquo;owed to organizers&rdquo; is a reconciliation figure — what the books say is outstanding between you
          and each event — not a balance sitting in an escrow account. Payouts below are transfers you made elsewhere
          and logged here; nothing on this page moves money.
        </p>
      </div>

      <PlatformFeeForm config={platform} />

      <div className="card overflow-hidden">
        <div className="p-5 sm:p-6 pb-3">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2">Organizer payout ledger</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[40rem]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-ink3 border-b border-lineSoft">
                <th className="text-left font-semibold px-5 py-3">Tournament</th>
                <th className="text-right font-semibold px-2 py-3">Collected</th>
                <th className="text-right font-semibold px-2 py-3">Platform fee</th>
                <th className="text-right font-semibold px-2 py-3">Paid out</th>
                <th className="text-right font-semibold px-2 py-3">Owed</th>
                <th className="text-left font-semibold px-3 py-3">Status</th>
                <th className="text-right font-semibold px-3 py-3">Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lineSoft">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-ink2">
                    No tournaments yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.t.id}>
                    <td className="px-5 py-3">
                      <p className="font-semibold truncate max-w-[16rem]">{r.t.name}</p>
                    </td>
                    <td className="px-2 py-3 text-right font-score">{money(r.collectedCents)}</td>
                    <td className="px-2 py-3 text-right font-score text-ink2">{money(r.feeCents)}</td>
                    <td className="px-2 py-3 text-right font-score text-ink2">{money(r.paidOutCents)}</td>
                    <td className="px-2 py-3 text-right font-score text-inkDisplay">{money(r.owedCents)}</td>
                    <td className="px-3 py-3">
                      <span className={`badge ${statusClass(r.status)} text-[10px] whitespace-nowrap`}>{r.status}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end">
                        <RecordPayoutForm tournamentId={r.t.id} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {payoutRows.length > 0 && (
        <div className="card p-5 sm:p-6">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-3">Recorded payouts</h2>
          <ul className="divide-y divide-lineSoft">
            {payoutRows.map((p) => {
              const t = tournaments.find((x) => x.id === p.tournamentId);
              return (
                <li key={p.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{t?.name || "Unknown tournament"}</p>
                    <p className="text-xs text-ink3 truncate">
                      {formatDate(p.recordedAt)}
                      {p.reference ? ` · ${p.reference}` : ""}
                      {p.recordedByName ? ` · by ${p.recordedByName}` : ""}
                    </p>
                  </div>
                  <span className="font-score text-sm text-inkDisplay shrink-0">{money(p.amountCents)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
