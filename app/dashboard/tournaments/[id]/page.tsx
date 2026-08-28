import { Tournaments, Teams, Matches } from "@/lib/models";
import { generateSchedule, generateKnockout } from "@/lib/actions";

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card-elevated p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 h-[2px] w-8 bg-pitch-400" />
      <p className="text-xs uppercase tracking-wide text-black/40 mb-1.5">{label}</p>
      <p className="font-score text-3xl">{value}</p>
      {sub && <p className="text-xs text-black/30 mt-1">{sub}</p>}
    </div>
  );
}

export default async function TournamentOverviewPage({ params }: { params: { id: string } }) {
  const tournament = (await Tournaments.byId(params.id))!;
  const allTeams = await Teams.listByTournament(tournament.id);
  const teams = allTeams.filter((t) => t.name);
  const pendingInvites = allTeams.length - teams.length;
  const matches = await Matches.listByTournament(tournament.id);
  const publicUrl = `/t/${tournament.slug}`;

  const generateScheduleWithId = generateSchedule.bind(null, tournament.id);
  const generateKnockoutWithId = generateKnockout.bind(null, tournament.id);

  return (
    <div>
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Teams registered"
          value={teams.length}
          sub={pendingInvites > 0 ? `${pendingInvites} invite${pendingInvites === 1 ? "" : "s"} pending` : undefined}
        />
        <StatCard label="Matches scheduled" value={matches.length} />
        <StatCard label="Entry fee" value={`$${(tournament.feeCents / 100).toFixed(0)}`} />
      </div>

      <div className="grid sm:grid-cols-2 gap-6 mb-6">
        <div className="card p-6">
          <h2 className="font-semibold mb-1">Public registration link</h2>
          <p className="text-sm text-black/50 mb-3">Share this with team captains so they can register and pay.</p>
          <code className="block bg-black/[0.05] rounded-lg px-3 py-2 text-sm text-pitch-500 break-all">{publicUrl}/register</code>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold mb-1">Tournament director</h2>
          <p className="text-sm text-black/50 mb-3">On file as the point of contact for this event.</p>
          <p className="text-sm font-medium">{tournament.supervisorName}</p>
          <p className="text-sm text-black/50">{tournament.supervisorEmail}</p>
          {tournament.supervisorPhone && <p className="text-sm text-black/50">{tournament.supervisorPhone}</p>}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold mb-4">Schedule actions</h2>
        <div className="flex flex-wrap gap-3">
          <form action={generateScheduleWithId}>
            <button className="btn-primary" formAction={generateScheduleWithId}>
              {matches.some((m) => m.stage === "GROUP") ? "Regenerate group schedule" : "Generate schedule"}
            </button>
          </form>
          <form action={generateKnockoutWithId}>
            <button className="btn-secondary" formAction={generateKnockoutWithId}>
              Generate knockout bracket from standings
            </button>
          </form>
        </div>
        <p className="text-xs text-black/40 mt-3">
          Generate the schedule once teams are in. Once group games have results, generate the knockout bracket to
          seed it automatically from the standings.
        </p>
      </div>
    </div>
  );
}
