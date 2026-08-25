import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Tournaments, Teams, Matches, Referees } from "@/lib/models";
import { TournamentTabs } from "@/components/TournamentTabs";
import { addReferee, assignReferee } from "@/lib/actions";

export default async function RefereesPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const tournament = Tournaments.byId(params.id);
  if (!tournament || tournament.ownerId !== user.id) notFound();

  const teams = Teams.listByTournament(tournament.id);
  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const matches = Matches.listByTournament(tournament.id);
  const referees = Referees.listByTournament(tournament.id);
  const addRefereeWithId = addReferee.bind(null, tournament.id);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">{tournament.name}</h1>
      <TournamentTabs tournamentId={tournament.id} />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-2">
          <h2 className="font-semibold mb-2">Assign referees to matches</h2>
          {matches.length === 0 && <p className="text-white/50 text-sm">Generate a schedule first.</p>}
          {matches.map((m) => {
            const assign = assignReferee.bind(null, tournament.id, m.id);
            return (
              <div key={m.id} className="card p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-white/40">{m.round} · {m.field}</p>
                  <p className="text-sm font-medium">
                    {teamsById.get(m.homeTeamId || "")?.name || m.homeLabel || "TBD"} vs{" "}
                    {teamsById.get(m.awayTeamId || "")?.name || m.awayLabel || "TBD"}
                  </p>
                </div>
                <form
                  action={async (formData: FormData) => {
                    "use server";
                    await assign(String(formData.get("refereeId") || ""));
                  }}
                >
                  <select className="input" name="refereeId" defaultValue={m.refereeId || ""}>
                    <option value="">Unassigned</option>
                    {referees.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </form>
              </div>
            );
          })}
        </div>

        <div>
          <div className="card p-5 sticky top-6">
            <h3 className="font-semibold mb-3">Referees</h3>
            <div className="space-y-1.5 mb-4">
              {referees.map((r) => (
                <div key={r.id} className="text-sm text-white/60 border-b border-white/5 pb-1">
                  {r.name} {r.contact && <span className="text-white/30">· {r.contact}</span>}
                </div>
              ))}
              {referees.length === 0 && <p className="text-xs text-white/30">No referees added yet.</p>}
            </div>
            <form action={addRefereeWithId} className="space-y-3">
              <div>
                <label className="label">Name</label>
                <input className="input" name="name" required />
              </div>
              <div>
                <label className="label">Contact</label>
                <input className="input" name="contact" placeholder="email or phone" />
              </div>
              <button className="btn-primary w-full">Add referee</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
