import Link from "next/link";
import { Teams, Tournaments } from "@/lib/models";
import { Logo } from "@/components/Logo";
import { PlayerRegisterWizard } from "@/components/PlayerRegisterWizard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create a player account · Jogo",
  description: "Register as a player, verify your photo and prove your age.",
};

export default async function PlayerRegisterPage() {
  // Every club currently in the system, with the event it plays in, so the
  // selector shows "Riverside Rovers · Coastal Cup" rather than a bare name
  // a player cannot tell apart from another club of the same name.
  const [teams, tournaments] = await Promise.all([Teams.listAll(), Tournaments.listAll()]);
  const tournamentName = new Map(tournaments.map((t) => [t.id, t.name]));
  const clubs = teams
    .filter((t) => t.name)
    .map((t) => ({ id: t.id, name: t.name, tournamentName: tournamentName.get(t.tournamentId) ?? null }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <Link href="/">
            <Logo />
          </Link>
          <Link href="/login" className="text-sm text-ink2 hover:text-inkDisplay transition-colors inline-flex items-center min-h-12">
            Already have an account?
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 space-y-6">
        <div>
          <h1 className="text-display-sm mb-2">Create a player account</h1>
          <p className="text-ink2 max-w-xl">
            Four steps: your details, a headshot we check for a face, an official document that proves your age, and
            the club you play for. A parent or guardian can do this on a young player’s behalf.
          </p>
        </div>
        <PlayerRegisterWizard clubs={clubs} />
      </div>
    </main>
  );
}
