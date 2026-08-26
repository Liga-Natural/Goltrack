import { Tournaments, Teams, Matches, Referees, Players } from "@/lib/models";
import { computeStandings, groupNames } from "@/lib/standings";
import { ProductShowcase } from "@/components/ProductShowcase";

export const revalidate = 30;

// Public, no-login "here's what you get" page. Jogo is a paid product,
// so this shows real screens built from the seeded demo tournament instead
// of handing out a free-to-use sandbox of the actual console.
export default function TourPage() {
  const tournament = Tournaments.bySlug("coastal-cup");
  if (!tournament) {
    return (
      <main className="min-h-screen flex items-center justify-center text-black/50">
        Demo tournament not seeded yet — refresh in a moment.
      </main>
    );
  }

  const teams = Teams.listByTournament(tournament.id).filter((t) => t.name);
  const matches = Matches.listByTournament(tournament.id);
  const referees = Referees.listByTournament(tournament.id);
  const playersByTeam: Record<string, ReturnType<typeof Players.listByTeam>> = {};
  for (const t of teams) playersByTeam[t.id] = Players.listByTeam(t.id);
  const groups = groupNames(teams);
  const standingsByGroup: Record<string, ReturnType<typeof computeStandings>> = {};
  for (const g of groups) standingsByGroup[g] = computeStandings(teams, matches, g);

  return (
    <ProductShowcase
      tournament={tournament}
      teams={teams}
      matches={matches}
      referees={referees}
      playersByTeam={playersByTeam}
      groups={groups}
      standingsByGroup={standingsByGroup}
    />
  );
}
