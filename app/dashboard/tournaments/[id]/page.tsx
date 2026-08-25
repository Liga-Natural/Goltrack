import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Tournaments, Teams, Matches } from "@/lib/models";
import { TournamentTabs } from "@/components/TournamentTabs";
import { generateSchedule, generateKnockout, setTournamentStatus } from "@/lib/actions";

export default async function TournamentOverviewPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const tournament = Tournaments.byId(params.id);
  if (!tournament || tournament.ownerId !== user.id) notFound();

  const teams = Teams.listByTournament(tournament.id);
  const matches = Matches.listByTournament(tournament.id);
  const publicUrl = `/t/${tournament.slug}`;

  const generateScheduleWithId = generateSchedule.bind(null, tournament.id);
  const generateKnockoutWithId = generateKnockout.bind(null, tournament.id);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <div>
          <h1 className="text-2xl font-semibold">{tournament.name}</h1>
          <p className="text-white/50 text-sm mt-1">
            {tournament.sport} · {tournament.format === "ROUND_ROBIN" ? "Round robin" : "Groups + knockout"} ·{" "}
            {new Date(tournament.startDate).toLocaleDateString()}
            {tournament.location ? ` · ${tournament.location}` : ""}
          </p>
        </div>
        <Link href={publicUrl} target="_blank" className="btn-secondary text-sm">
          View public page →
        </Link>
      </div>

      <TournamentTabs tournamentId={tournament.id} />

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-white/40 mb-1">Teams registered</p>
          <p className="text-3xl font-semibold">{teams.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-white/40 mb-1">Matches scheduled</p>
          <p className="text-3xl font-semibold">{matches.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-white/40 mb-1">Entry fee</p>
          <p className="text-3xl font-semibold">${(tournament.feeCents / 100).toFixed(0)}</p>
        </div>
      </div>

      <div className="card p-6 mb-6">
        <h2 className="font-semibold mb-1">Public registration link</h2>
        <p className="text-sm text-white/50 mb-3">Share this with team captains so they can register and pay.</p>
        <code className="block bg-navy-800 rounded-lg px-3 py-2 text-sm text-pitch-400 break-all">{publicUrl}/register</code>
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
        <p className="text-xs text-white/40 mt-3">
          Generate the schedule once teams are in. Once group games have results, generate the knockout bracket to
          seed it automatically from the standings.
        </p>
      </div>
    </div>
  );
}
