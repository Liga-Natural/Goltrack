import { notFound } from "next/navigation";
import { Tournaments, PaymentSettings, PlatformFees } from "@/lib/models";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { describePlatformFee, platformFeeCents } from "@/lib/pricing";
import { money } from "@/lib/invoices";
import { PaymentSettingsForm } from "@/components/PaymentSettingsForm";

export default async function TournamentPaymentsPage({ params }: { params: { id: string } }) {
  const tournament = await Tournaments.byId(params.id);
  if (!tournament) notFound();

  const [viewer, rules, platform] = await Promise.all([
    getCurrentUser(),
    PaymentSettings.forTournament(tournament.id),
    PlatformFees.get(),
  ]);

  // The layout already scopes this route to people who may open the event;
  // editing money is a further permission, and the server refuses the save
  // regardless (see saveTournamentPaymentSettings).
  if (!can(viewer, "FINANCE")) {
    return (
      <div className="card p-6">
        <h1 className="text-lg font-extrabold text-inkDisplay mb-2">Payments</h1>
        <p className="text-sm text-ink2">
          Your account does not have financial access, so the payment rules for this tournament are not shown here. A
          super admin grants it from Accounts.
        </p>
      </div>
    );
  }

  const exampleFee = platformFeeCents(tournament.feeCents, platform);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-inkDisplay mb-1">Payments</h1>
        <p className="text-ink2 text-sm font-medium">
          How this tournament bills clubs: what is due when, which discounts apply, and how you take the money.
        </p>
      </div>

      <div className="card p-5 sm:p-6">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-2">Platform fee</h2>
        <p className="text-sm">
          <span className="text-inkDisplay font-semibold">{describePlatformFee(platform)}</span>
        </p>
        <p className="text-[11px] text-ink3 mt-1.5">
          {platform.passThrough
            ? `Passed through to the club at checkout — on a ${money(tournament.feeCents)} entry that adds ${money(exampleFee)}.`
            : `Absorbed by you, not added to the club's bill — on a ${money(tournament.feeCents)} entry that is ${money(exampleFee)} out of what you collect.`}{" "}
          Set platform-wide by the Jogo admin.
        </p>
      </div>

      <PaymentSettingsForm
        tournamentId={tournament.id}
        feeCents={tournament.feeCents}
        rules={rules}
        platform={platform}
        stripeConfigured={Boolean(process.env.STRIPE_SECRET_KEY)}
      />
    </div>
  );
}
