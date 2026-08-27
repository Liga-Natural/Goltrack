import { notFound } from "next/navigation";
import Link from "next/link";
import { Tournaments, Teams, Players } from "@/lib/models";
import { Logo } from "@/components/Logo";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { markTeamPaidDemo } from "@/lib/actions";

export default function PayPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { team?: string };
}) {
  const tournament = Tournaments.bySlug(params.slug);
  if (!tournament || !searchParams.team) notFound();
  const team = Teams.byId(searchParams.team);
  if (!team || team.tournamentId !== tournament.id) notFound();
  const players = Players.listByTeam(team.id);
  const logoToken = team.logoToken || Teams.ensureLogoToken(team.id);

  const stripeConfigured = !!process.env.STRIPE_SECRET_KEY;

  return (
    <main className="min-h-screen">
      <header className="border-b border-black/5">
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
          <div className="flex items-center justify-between border-b border-black/10 pb-4 mb-4">
            <span className="text-black/60">Tournament entry fee</span>
            <span className="text-2xl font-semibold">${(tournament.feeCents / 100).toFixed(2)}</span>
          </div>

          {stripeConfigured ? (
            <p className="text-sm text-black/50 mb-4">You&apos;ll be redirected to a secure Stripe checkout.</p>
          ) : (
            <p className="text-sm text-black/40 mb-4">
              Demo mode: no payment processor is connected yet, so this simulates a successful payment. Add a{" "}
              <code className="text-black/60">STRIPE_SECRET_KEY</code> to go live with real payments.
            </p>
          )}

          <form action={markTeamPaidDemo.bind(null, team.id)}>
            <button className="btn-primary w-full">{stripeConfigured ? "Pay now" : "Pay now (demo)"}</button>
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
