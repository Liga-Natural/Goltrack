import { notFound } from "next/navigation";
import Link from "next/link";
import { Tournaments, Teams, Players, PaymentSettings, PlatformFees } from "@/lib/models";
import { quoteRegistration, acceptedOfflineMethods } from "@/lib/pricing";
import { money, formatDate } from "@/lib/invoices";
import { Logo } from "@/components/Logo";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { markTeamPaidDemo } from "@/lib/actions";

export default async function PayPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { team?: string };
}) {
  const tournament = await Tournaments.bySlug(params.slug);
  if (!tournament || !searchParams.team) notFound();
  const team = await Teams.byId(searchParams.team);
  if (!team || team.tournamentId !== tournament.id) notFound();
  const players = await Players.listByTeam(team.id);
  const logoToken = team.logoToken || (await Teams.ensureLogoToken(team.id));

  const [rules, platform] = await Promise.all([
    PaymentSettings.forTournament(tournament.id),
    PlatformFees.get(),
  ]);
  // Priced by the same function that generates this club's invoice, so the
  // figure quoted at checkout is the figure they are billed.
  const quote = quoteRegistration({ feeCents: tournament.feeCents, rules, platform });
  const offlineMethods = acceptedOfflineMethods(rules);
  const stripeConfigured = !!process.env.STRIPE_SECRET_KEY;

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-line bg-white/40 backdrop-blur-xl">
        <div className="mx-auto max-w-xl px-4 sm:px-6 py-4">
          <Link href="/">
            <Logo />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 sm:px-6 py-10">
        <h1 className="text-2xl font-semibold mb-1">Almost there — pay the entry fee</h1>
        <p className="text-black/50 mb-6 text-sm">
          {team.name} · {players.length} players registered
        </p>

        <div className="card p-6">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-3">Fee summary</h2>
          <dl className="space-y-1.5 text-sm">
            {quote.lines.map((line, i) => (
              <div key={i} className="flex items-baseline justify-between gap-3">
                <dt className="text-ink2">{line.label}</dt>
                <dd className={`font-score ${line.kind === "discount" ? "text-emerald-500" : "text-ink2"}`}>
                  {line.kind === "discount" ? "−" : ""}
                  {money(line.amountCents)}
                </dd>
              </div>
            ))}
            <div className="pt-2.5 mt-1 border-t border-line flex items-baseline justify-between gap-3">
              <dt className="font-semibold text-inkDisplay">Total</dt>
              <dd className="font-score text-inkDisplay text-lg">{money(quote.totalCents)}</dd>
            </div>
          </dl>

          {quote.balanceCents > 0 ? (
            <div className="mt-4 rounded-xl border border-line p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-inkDisplay">Due now (deposit)</span>
                <span className="font-score text-xl text-inkDisplay">{money(quote.dueNowCents)}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3 mt-1.5">
                <span className="text-xs text-ink2">
                  Balance due {quote.balanceDueAt ? formatDate(quote.balanceDueAt) : "later"}
                </span>
                <span className="font-score text-sm text-warning-500">{money(quote.balanceCents)}</span>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-line p-4 flex items-baseline justify-between gap-3">
              <span className="text-sm font-semibold text-inkDisplay">Due now</span>
              <span className="font-score text-xl text-inkDisplay">{money(quote.dueNowCents)}</span>
            </div>
          )}

          {/* No card is taken and none is stored. Offering an "authorise
              future charges" checkbox with no vault behind it would be asking
              for consent to something that cannot happen. */}
          <p className="text-xs text-ink3 mt-4">
            {stripeConfigured
              ? "A STRIPE_SECRET_KEY is set, but no checkout is wired to it yet — this records the registration rather than taking a card."
              : "No card is taken here. Jogo has no payment processor connected, so no card is stored and future instalments are not auto-debited."}
          </p>

          {offlineMethods.length > 0 && (
            <div className="mt-4 pt-4 border-t border-lineSoft">
              <p className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-1.5">How to pay</p>
              <p className="text-xs text-ink2">{offlineMethods.join(" · ")}</p>
              {rules.offlineInstructions && (
                <p className="text-xs text-ink3 mt-2 whitespace-pre-line">{rules.offlineInstructions}</p>
              )}
            </div>
          )}

          <form action={markTeamPaidDemo.bind(null, team.id)} className="mt-5">
            <button className="btn-primary w-full">
              {rules.manualApproval ? "Confirm registration" : "Mark as paid (demo)"}
            </button>
            <p className="text-[11px] text-ink3 mt-2 text-center">
              {rules.manualApproval
                ? "The organizer verifies your payment before this team is marked paid."
                : "No processor is connected, so this records the team as paid without taking money."}
            </p>
          </form>
        </div>

        <div className="card p-6 mt-4">
          <h2 className="font-semibold text-sm mb-1">Add your team crest</h2>
          <p className="text-xs text-black/40 mb-3">
            This link is yours to keep — no login needed. Use it now or send it to whoever manages your team&apos;s logo; it also lets you replace the crest later.
          </p>
          <div className="flex items-center gap-2">
            <Link href={`/t/${params.slug}/crest/${logoToken}`} className="btn-secondary text-sm flex-1 text-center">
              Upload crest
            </Link>
            <CopyLinkButton path={`/t/${params.slug}/crest/${logoToken}`} />
          </div>
        </div>
      </div>
    </main>
  );
}
