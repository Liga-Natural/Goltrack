import { Tournaments, Teams, Matches, Referees, Players } from "@/lib/models";
import { computeStandings, groupNames } from "@/lib/standings";
import { ProductShowcase } from "@/components/ProductShowcase";

export const revalidate = 30;

// Public, no-login "here's what you get" page. Jogo is a paid product,
// so this shows real screens built from the seeded demo tournament instead
// of handing out a free-to-use sandbox of the actual console.
export default async function TourPage() {
  const tournament = await Tournaments.bySlug("coastal-cup");
  if (!tournament) {
    return (
      <main className="min-h-screen flex items-center justify-center text-black/50">
        Demo tournament not seeded yet — refresh in a moment.
      </main>
    );
  }

  const allTeams = await Teams.listByTournament(tournament.id);
  const teams = allTeams.filter((t) => t.name);
  const matches = await Matches.listByTournament(tournament.id);
  const referees = await Referees.listByTournament(tournament.id);
  const playersByTeam: Record<string, Awaited<ReturnType<typeof Players.listByTeam>>> = {};
  for (const t of teams) playersByTeam[t.id] = await Players.listByTeam(t.id);
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
