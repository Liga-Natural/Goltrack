import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { organizerTournaments, selectedTournament } from "@/lib/organizerScope";
import { moduleSettings } from "@/lib/actions";
import { TournamentPicker } from "@/components/TournamentPicker";
import { VenuePinEditor } from "@/components/VenuePinEditor";
import { Matches } from "@/lib/models";

export const dynamic = "force-dynamic";

export default async function MatchCenterSettingsPage({ searchParams }: { searchParams: { t?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/organizer/settings/match-center");
  const tournaments = await organizerTournaments(user);
  const tournament = selectedTournament(tournaments, searchParams.t);

  if (!tournament) {
    return (
      <div className="card p-8 text-center">
        <h1 className="text-xl font-extrabold text-inkDisplay mb-2">No events yet</h1>
        <p className="text-sm text-ink2">These settings belong to a tournament. Create one first.</p>
        <Link href="/dashboard/tournaments/new" className="btn-secondary text-sm inline-block mt-5">
          New tournament
        </Link>
      </div>
    );
  }

  const settings = await moduleSettings(tournament.id);
  const matches = await Matches.listByTournament(tournament.id);
  const fields = [...new Set(matches.map((m) => m.field).filter(Boolean) as string[])].sort();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-sm mb-1.5">Live match centre</h1>
        <p className="text-ink2">
          A public page per match with the running score, the goals and the cards, and a map of the complex. Off by
          default — turning it on publishes every match of this event to anyone with the link.
        </p>
      </div>

      <TournamentPicker tournaments={tournaments} selectedId={tournament.id} basePath="/organizer/settings/match-center" />

      <VenuePinEditor
        tournamentId={tournament.id}
        enabled={settings.matchCenterEnabled}
        pins={settings.venuePins}
        address={settings.venueAddress ?? tournament.location ?? ""}
        fields={fields}
      />
    </div>
  );
}
