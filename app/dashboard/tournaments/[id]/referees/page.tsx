import { Tournaments, Teams, Matches, Referees } from "@/lib/models";
import { addReferee, assignReferee } from "@/lib/actions";

export default async function RefereesPage({ params }: { params: { id: string } }) {
  const tournament = (await Tournaments.byId(params.id))!;
  const teams = await Teams.listByTournament(tournament.id);
  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const matches = await Matches.listByTournament(tournament.id);
  const referees = await Referees.listByTournament(tournament.id);
  const addRefereeWithId = addReferee.bind(null, tournament.id);

  return (
    <div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-2">
          <h2 className="font-extrabold mb-2">Assign referees to matches</h2>
          {matches.length === 0 && <p className="text-black/50 text-sm">Generate a schedule first.</p>}
          {matches.map((m) => {
            const assign = assignReferee.bind(null, tournament.id, m.id);
            return (
              <div key={m.id} className="card p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-black/40">{m.round} · {m.field}</p>
                  <p className="text-sm font-medium">
                    {teamsById.get(m.homeTeamId || "")?.name || m.homeLabel || "TBD"} vs{" "}
                    {teamsById.get(m.awayTeamId || "")?.name || m.awayLabel || "TBD"}
                  </p>
                </div>
                {/* w-full on mobile: with no wrap this select's rendered
                    width shrank to whatever the flex row had left after a
                    long team-name line, clipping referee names. flex-wrap
                    on the row above lets it drop to its own full-width line
                    instead once the match text needs the space. */}
                <form
                  className="w-full sm:w-auto"
                  action={async (formData: FormData) => {
                    "use server";
                    await assign(String(formData.get("refereeId") || ""));
                  }}
                >
                  <select className="input w-full sm:w-auto" name="refereeId" defaultValue={m.refereeId || ""}>
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
          {/* Same fix as the teams page: only a side column at lg, so only
              sticky at lg — unconditional sticky pinned this mid-scroll on
              mobile, colliding with the page's own sticky header. */}
          <div className="card p-5 lg:sticky lg:top-6">
            <h3 className="font-semibold mb-3">Referees</h3>
            <div className="space-y-1.5 mb-4">
              {referees.map((r) => (
                <div key={r.id} className="text-sm text-black/60 border-b border-black/5 pb-1">
                  {r.name} {r.contact && <span className="text-black/30">· {r.contact}</span>}
                </div>
              ))}
              {referees.length === 0 && <p className="text-xs text-black/30">No referees added yet.</p>}
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
