import { notFound } from "next/navigation";
import Link from "next/link";
import { Teams, Tournaments } from "@/lib/models";
import { Logo } from "@/components/Logo";
import { InviteClaimForm } from "@/components/InviteClaimForm";

export default async function InviteClaimPage({ params }: { params: { slug: string; token: string } }) {
  const tournament = await Tournaments.bySlug(params.slug);
  if (!tournament) notFound();

  const team = await Teams.byInviteToken(params.token);
  const alreadyClaimed = !team && !!params.token;

  return (
    <main className="min-h-screen">
      <header className="border-b border-black/5">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-4">
          <Link href="/">
            <Logo />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
        {!team ? (
          <div className="card p-8 text-center">
            <p className="font-semibold mb-1.5">
              {alreadyClaimed ? "This invite link has already been used." : "This invite link isn't valid."}
            </p>
            <p className="text-black/50 text-sm mb-4">
              Check with {tournament.name}&apos;s organizer for a new link, or register directly instead.
            </p>
            <Link href={`/t/${tournament.slug}/register`} className="btn-primary">
              Go to open registration
            </Link>
          </div>
        ) : (
          <>
            <span className="badge bg-pitch-400/10 text-pitch-600 border border-pitch-400/20 mb-4">
              You&apos;ve been invited to {tournament.name}
            </span>
            <h1 className="text-2xl font-semibold mb-1">Claim your team&apos;s spot</h1>
            <p className="text-black/50 mb-6 text-sm">
              This link is unique to your team and can only be used once. Add your roster now — each player gets a
              digital Jogo Passport with a QR code for fast check-in on match day.
            </p>
            <InviteClaimForm token={params.token} />
          </>
        )}
      </div>
    </main>
  );
}
