import { notFound } from "next/navigation";
import Link from "next/link";
import { Tournaments, Teams, MediaItems, Sponsors } from "@/lib/models";
import { moduleSettings } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";
import { MediaUploadForm } from "@/components/MediaUploadForm";
import { SponsorBanner } from "@/components/SponsorBanner";
import { Logo } from "@/components/Logo";
import { MediaGallery } from "@/components/MediaGallery";

export const dynamic = "force-dynamic";

export default async function MediaPage({
  params,
  searchParams,
}: {
  params: { eventId: string };
  searchParams: { team?: string };
}) {
  // Takes an id or a slug, the same as the spectator alias route: the link an
  // organizer shares is whichever they had to hand.
  const tournament = (await Tournaments.byId(params.eventId)) ?? (await Tournaments.bySlug(params.eventId));
  if (!tournament) notFound();

  const settings = await moduleSettings(tournament.id);
  if (!settings.mediaEnabled) notFound();

  const [teams, items, user] = await Promise.all([
    Teams.listByTournament(tournament.id),
    MediaItems.listByTournament(tournament.id, "APPROVED"),
    getCurrentUser(),
  ]);
  const sponsors = settings.sponsorsEnabled ? await Sponsors.listByTournament(tournament.id, true) : [];

  return (
    <main className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <Link href="/">
            <Logo />
          </Link>
          <Link href={`/t/${tournament.slug}`} className="text-sm text-ink2 hover:text-inkDisplay transition-colors inline-flex items-center min-h-12">
            {tournament.name} →
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-display-sm mb-1.5">Photos</h1>
          <p className="text-ink2">
            {items.length} approved photo{items.length === 1 ? "" : "s"} from {tournament.name}.
          </p>
        </div>

        <MediaGallery
          items={items.map((i) => ({
            id: i.id,
            caption: i.caption,
            credit: i.credit,
            teamId: i.teamId,
            division: i.division,
            featured: i.featured === 1,
          }))}
          teams={teams.map((t) => ({ id: t.id, name: t.name }))}
          initialTeam={searchParams.team ?? ""}
        />

        {user ? (
          <MediaUploadForm
            tournamentId={tournament.id}
            teams={teams.map((t) => ({ id: t.id, name: t.name }))}
            policy={settings.mediaUploadPolicy}
          />
        ) : (
          <div className="card p-5 sm:p-6 text-center">
            <p className="text-sm text-ink2">
              <Link href={`/login?next=/media/${tournament.id}`} className="text-accent font-semibold">
                Sign in
              </Link>{" "}
              to add a photo.{" "}
              {settings.mediaUploadPolicy === "STAFF"
                ? "This event accepts photos from its official media staff only."
                : "This event accepts photos from parents and spectators."}
            </p>
          </div>
        )}

        <SponsorBanner sponsors={sponsors} />
      </div>
    </main>
  );
}
