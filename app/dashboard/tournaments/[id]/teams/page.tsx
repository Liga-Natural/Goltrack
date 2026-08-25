import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Tournaments, Teams, Players } from "@/lib/models";
import { TournamentTabs } from "@/components/TournamentTabs";
import { addTeam, addPlayer, removeTeam, setTeamPaid } from "@/lib/actions";

export default async function TeamsPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const tournament = Tournaments.byId(params.id);
  if (!tournament || tournament.ownerId !== user.id) notFound();

  const teams = Teams.listByTournament(tournament.id);
  const addTeamWithId = addTeam.bind(null, tournament.id);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">{tournament.name}</h1>
      <TournamentTabs tournamentId={tournament.id} />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {teams.length === 0 && <p className="text-white/50">No teams yet — add one, or share the registration link.</p>}
          {teams.map((team) => {
            const players = Players.listByTeam(team.id);
            const addPlayerWithIds = addPlayer.bind(null, tournament.id, team.id);
            const removeTeamWithIds = removeTeam.bind(null, tournament.id, team.id);
            const setPaidTrue = setTeamPaid.bind(null, tournament.id, team.id, true);
            const setPaidFalse = setTeamPaid.bind(null, tournament.id, team.id, false);
            return (
              <div key={team.id} className="card p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-semibold">
                      {team.name} {team.groupName && <span className="text-white/40 font-normal text-sm">· Group {team.groupName}</span>}
                    </h3>
                    <p className="text-sm text-white/40">{team.contactName} · {team.contactEmail}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <form action={team.paid ? setPaidFalse : setPaidTrue}>
                      <button className={`badge ${team.paid ? "bg-pitch-400/15 text-pitch-400" : "bg-white/10 text-white/50"}`}>
                        {team.paid ? "Paid ✓" : "Unpaid"}
                      </button>
                    </form>
                    <form action={removeTeamWithIds}>
                      <button className="text-xs text-white/30 hover:text-red-400">Remove</button>
                    </form>
                  </div>
                </div>

                <div className="space-y-1.5 mb-3">
                  {players.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm text-white/60 border-b border-white/5 pb-1">
                      <span>
                        {p.jerseyNumber && <span className="text-white/30 mr-2">#{p.jerseyNumber}</span>}
                        {p.name}
                      </span>
                      <a
                        href={`/passport/${p.id}`}
                        target="_blank"
                        className="text-white/30 hover:text-pitch-400 text-xs underline decoration-dotted"
                      >
                        passport →
                      </a>
                    </div>
                  ))}
                  {players.length === 0 && <p className="text-xs text-white/30">No players added yet.</p>}
                </div>

                <form action={addPlayerWithIds} className="flex gap-2">
                  <input className="input flex-1" name="name" placeholder="Player name" required />
                  <input className="input w-20" name="jerseyNumber" placeholder="#" />
                  <button className="btn-secondary text-sm px-3">Add</button>
                </form>
              </div>
            );
          })}
        </div>

        <div>
          <div className="card p-5 sticky top-6">
            <h3 className="font-semibold mb-3">Add a team manually</h3>
            <form action={addTeamWithId} className="space-y-3">
              <div>
                <label className="label">Team name</label>
                <input className="input" name="name" required />
              </div>
              <div>
                <label className="label">Contact name</label>
                <input className="input" name="contactName" required />
              </div>
              <div>
                <label className="label">Contact email</label>
                <input className="input" type="email" name="contactEmail" required />
              </div>
              <button className="btn-primary w-full">Add team</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
