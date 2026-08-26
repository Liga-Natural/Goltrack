import { notFound } from "next/navigation";
import Link from "next/link";
import { Tournaments, Teams, Players } from "@/lib/models";
import { Logo } from "@/components/Logo";
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
      </div>
    </main>
  );
}
