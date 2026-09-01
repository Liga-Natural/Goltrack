import { Tournaments, Teams, Applications } from "@/lib/models";
import { TeamBadge } from "@/components/TeamBadge";

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
  const [allTeams, applications] = await Promise.all([
    Teams.listByTournament(params.id),
    Applications.listByTournament(params.id),
  ]);
  const teams = allTeams.filter((t) => t.name);

  // Every entrant owes the entry fee — there is no per-team pricing in the
  // schema, so the invoice is teams x fee. Stated plainly rather than
  // implied, because it is the assumption the whole page rests on.
  const fee = tournament.feeCents;
  const invoiced = teams.length * fee;
  const paidTeams = teams.filter((t) => t.paid);
  const collected = paidTeams.length * fee;
  const outstanding = invoiced - collected;

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
          {paidTeams.length} of {teams.length} teams settled · invoice assumes the flat {money(fee)} entry fee per
          entrant
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

      {/* Named rather than mocked. Waivers are a real PlayMetrics feature and
          a real gap here: there is no forms or documents table, so any
          "collected vs missing" tracker would be decoration with nothing
          behind it. */}
      <div className="card p-5 sm:p-6">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-2">Waivers &amp; forms</h2>
        <p className="text-sm text-ink2">
          Not built. Tracking club waivers needs a documents table and a per-registration checklist — there is nothing
          in the schema to read, so this is left empty rather than shown as a tracker that always says zero.
        </p>
      </div>
    </div>
  );
}
