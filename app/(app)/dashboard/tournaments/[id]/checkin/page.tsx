import { Tournaments, Teams, Players, CheckIns } from "@/lib/models";
import { CheckInScanner } from "@/components/CheckInScanner";
import { setTeamCheckedIn } from "@/lib/actions";

export default async function CheckInPage({ params }: { params: { id: string } }) {
  const tournament = (await Tournaments.byId(params.id))!;
  const allTeams = await Teams.listByTournament(tournament.id);
  const teams = allTeams.filter((t) => t.name);
  const checkIns = await CheckIns.listByTournament(tournament.id);
  const checkedInPlayerIds = new Set(checkIns.map((c) => c.playerId));
  const teamsWithPlayers = await Promise.all(teams.map(async (team) => ({ team, players: await Players.listByTeam(team.id) })));

  return (
    <div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-extrabold mb-1">Team roster check-in</h2>
          {teamsWithPlayers.map(({ team, players }) => {
            const checkedCount = players.filter((p) => checkedInPlayerIds.has(p.id)).length;
            const setChecked = setTeamCheckedIn.bind(null, tournament.id, team.id, !team.checkedIn);
            return (
              <div key={team.id} className="card p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{team.name}</p>
                  <p className="text-xs text-ink3">
                    {checkedCount}/{players.length} players passport-verified
                  </p>
                </div>
                <form action={setChecked}>
                  {/* "Not checked in" is red-tinted, not neutral grey: on
                      match day this is an action-needed state (a team that
                      still has to be verified at the table), not a quiet
                      default, so it should read as outstanding work. */}
                  <button
                    className={`badge ${
                      team.checkedIn ? "bg-volt-400/15 text-volt-500" : "bg-pitch-400/10 text-pitch-700"
                    }`}
                  >
                    {team.checkedIn ? "Checked in ✓" : "Not checked in"}
                  </button>
                </form>
              </div>
            );
          })}
        </div>
        <div>
          {/* sticky only makes sense once lg:grid-cols-3 actually makes this
              a side column that scrolls alongside the team list — on mobile
              the grid collapses to one column and this sits below the list
              in normal flow, so an unconditional `sticky top-6` was instead
              pinning it near the top of the viewport mid-scroll, colliding
              with the page's own sticky header above it. */}
          <div className="lg:sticky lg:top-6">
            <CheckInScanner tournamentId={tournament.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
