import { Tournaments, Teams, Matches, Referees, CheckIns, Players } from "@/lib/models";
import { computeStandings, groupNames } from "@/lib/standings";
import { ProductTour } from "@/components/ProductTour";

export const revalidate = 30;

// Public, no-login preview of the management console. Reuses the real seeded
// "Coastal Cup" demo tournament (the same data /t/coastal-cup shows) so what
// visitors see here is honest, not a mockup — but everything rendered by
// ProductTour is read/local-state only, so nobody can mutate the shared demo
// without an account.
export default function TourPage() {
  const tournament = Tournaments.bySlug("coastal-cup");
  if (!tournament) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white/50">
        Demo tournament not seeded yet — refresh in a moment.
      </main>
    );
  }

  const teams = Teams.listByTournament(tournament.id);
  const matches = Matches.listByTournament(tournament.id);
  const referees = Referees.listByTournament(tournament.id);
  const checkIns = CheckIns.listByTournament(tournament.id);
  const playersByTeam: Record<string, ReturnType<typeof Players.listByTeam>> = {};
  for (const t of teams) playersByTeam[t.id] = Players.listByTeam(t.id);
  const groups = groupNames(teams);
  const standingsByGroup: Record<string, ReturnType<typeof computeStandings>> = {};
  for (const g of groups) standingsByGroup[g] = computeStandings(teams, matches, g);

  return (
    <ProductTour
      tournament={tournament}
      teams={teams}
      matches={matches}
      referees={referees}
      checkedInPlayerIds={checkIns.map((c) => c.playerId)}
      playersByTeam={playersByTeam}
      groups={groups}
      standingsByGroup={standingsByGroup}
    />
  );
}
