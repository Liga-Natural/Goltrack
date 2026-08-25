import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Tournaments, Teams, Players, CheckIns } from "@/lib/models";
import { TournamentTabs } from "@/components/TournamentTabs";
import { CheckInScanner } from "@/components/CheckInScanner";
import { setTeamCheckedIn } from "@/lib/actions";

export default async function CheckInPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const tournament = Tournaments.byId(params.id);
  if (!tournament || tournament.ownerId !== user.id) notFound();

  const teams = Teams.listByTournament(tournament.id);
  const checkIns = CheckIns.listByTournament(tournament.id);
  const checkedInPlayerIds = new Set(checkIns.map((c) => c.playerId));

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">{tournament.name}</h1>
      <TournamentTabs tournamentId={tournament.id} />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-semibold mb-1">Team roster check-in</h2>
          {teams.map((team) => {
            const players = Players.listByTeam(team.id);
            const checkedCount = players.filter((p) => checkedInPlayerIds.has(p.id)).length;
            const setChecked = setTeamCheckedIn.bind(null, tournament.id, team.id, !team.checkedIn);
            return (
              <div key={team.id} className="card p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{team.name}</p>
                  <p className="text-xs text-white/40">
                    {checkedCount}/{players.length} players passport-verified
                  </p>
                </div>
                <form action={setChecked}>
                  <button className={`badge ${team.checkedIn ? "bg-pitch-400/15 text-pitch-400" : "bg-white/10 text-white/50"}`}>
                    {team.checkedIn ? "Checked in ✓" : "Not checked in"}
                  </button>
                </form>
              </div>
            );
          })}
        </div>
        <div>
          <div className="sticky top-6">
            <CheckInScanner tournamentId={tournament.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
