import { notFound } from "next/navigation";
import Link from "next/link";
import { Tournaments, Teams } from "@/lib/models";
import { Logo } from "@/components/Logo";
import { TeamBadge } from "@/components/TeamBadge";
import { uploadTeamCrestPublic } from "@/lib/actions";

export default function TeamCrestPage({ params }: { params: { slug: string; token: string } }) {
  const tournament = Tournaments.bySlug(params.slug);
  if (!tournament) notFound();

  const team = Teams.byLogoToken(params.token);
  const valid = !!team && team.tournamentId === tournament.id && !!team.name;

  return (
    <main className="min-h-screen">
      <header className="border-b border-black/5">
        <div className="mx-auto max-w-lg px-4 sm:px-6 py-4">
          <Link href="/">
            <Logo />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 sm:px-6 py-10">
        {!valid || !team ? (
          <div className="card p-8 text-center">
            <p className="font-semibold mb-1.5">This crest upload link isn&apos;t valid.</p>
            <p className="text-black/50 text-sm mb-4">
              Double-check the link your organizer sent you, or ask {tournament.supervisorName || "the organizer"} for a fresh one.
            </p>
            <Link href={`/t/${tournament.slug}`} className="btn-primary">
              Go to {tournament.name}
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-6">
              <TeamBadge
                id={team.id}
                name={team.name}
                hasCrest={team.hasCrest}
                crestUpdatedAt={team.crestUpdatedAt}
                logoUrl={team.logoUrl}
                sport={tournament.sport}
                size="lg"
              />
              <div>
                <h1 className="text-xl font-semibold">{team.name}</h1>
                <p className="text-black/50 text-sm">{tournament.name}</p>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="font-semibold mb-1">{team.hasCrest ? "Replace your crest" : "Upload your crest"}</h2>
              <p className="text-xs text-black/40 mb-4">
                PNG, JPG, WEBP, or SVG — up to 5MB. No account needed, and you can come back to this same link to
                update it later.
              </p>
              <form action={uploadTeamCrestPublic.bind(null, params.token)} className="space-y-4">
                <input
                  className="input"
                  type="file"
                  name="crest"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  required
                />
                <button className="btn-primary w-full">{team.hasCrest ? "Replace crest" : "Upload crest"}</button>
              </form>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
