import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { organizerTournaments, selectedTournament } from "@/lib/organizerScope";
import { moduleSettings, saveModuleSettings } from "@/lib/actions";
import { TournamentPicker } from "@/components/TournamentPicker";
import { Teams, Matches, MatchEvents } from "@/lib/models";
import { fairPlayTable } from "@/lib/modules";

export const dynamic = "force-dynamic";

export default async function FairPlaySettingsPage({ searchParams }: { searchParams: { t?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/organizer/settings/fair-play");
  const tournaments = await organizerTournaments(user);
  const tournament = selectedTournament(tournaments, searchParams.t);
  if (!tournament) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-ink2">These settings belong to a tournament. Create one first.</p>
        <Link href="/dashboard/tournaments/new" className="btn-secondary text-sm inline-block mt-5">
          New tournament
        </Link>
      </div>
    );
  }

  const [settings, teams, matches, events] = await Promise.all([
    moduleSettings(tournament.id),
    Teams.listByTournament(tournament.id),
    Matches.listByTournament(tournament.id),
    MatchEvents.listByTournament(tournament.id),
  ]);
  // The same table the analytics page shows, so an organizer can see what
  // their weighting actually does before publishing it.
  const preview = fairPlayTable(teams, matches, events, settings).slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-sm mb-1.5">Fair play</h1>
        <p className="text-ink2">
          What a card costs, when to flag a club, and whether spectators see the table at all.
        </p>
      </div>

      <TournamentPicker tournaments={tournaments} selectedId={tournament.id} basePath="/organizer/settings/fair-play" />

      <form action={saveModuleSettings.bind(null, tournament.id)} className="card p-5 sm:p-6 space-y-5">
        <input type="hidden" name="fairPlayPublic__present" value="1" />
        <div className="grid sm:grid-cols-3 gap-4">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">
              Yellow card points
            </span>
            <input
              name="fairPlayYellowPoints"
              type="number"
              min={0}
              max={20}
              defaultValue={settings.fairPlayYellowPoints}
              className="input w-full"
            />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">
              Red card points
            </span>
            <input
              name="fairPlayRedPoints"
              type="number"
              min={0}
              max={50}
              defaultValue={settings.fairPlayRedPoints}
              className="input w-full"
            />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">
              Flag a club at
            </span>
            <input
              name="fairPlayAlertThreshold"
              type="number"
              min={1}
              max={200}
              defaultValue={settings.fairPlayAlertThreshold}
              className="input w-full"
            />
          </label>
        </div>

        <label className="flex items-start gap-3 cursor-pointer rounded-2xl bg-surface2 p-4">
          <input
            type="checkbox"
            name="fairPlayPublic"
            defaultChecked={settings.fairPlayPublic}
            className="mt-0.5 h-4 w-4 accent-pitch-400"
          />
          <span>
            <span className="block text-sm font-semibold text-inkDisplay">Show the ranking on the public page</span>
            <span className="block text-[11px] text-ink3 mt-0.5">
              Off by default. A published table naming the worst-behaved youth club is a decision to make on purpose,
              not one to discover.
            </span>
          </span>
        </label>

        <div className="rounded-2xl bg-surface2 p-4">
          <p className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-2">
            With the current weighting
          </p>
          {preview.length === 0 ? (
            <p className="text-sm text-ink2">No teams yet.</p>
          ) : (
            <ul className="space-y-1">
              {preview.map((row) => (
                <li key={row.team.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-inkDisplay">{row.team.name}</span>
                  <span className="font-score text-ink2 shrink-0">
                    {row.points} pts · {row.perMatch}/match
                    {row.flagged ? " · flagged" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-ink3 mt-2">
            Counted from cards a referee actually recorded. There is no conduct survey in Jogo, so this is discipline
            data, not a sportsmanship rating out of ten.
          </p>
        </div>

        <button type="submit" className="btn-primary text-sm">
          Save fair-play rules
        </button>
      </form>
    </div>
  );
}
