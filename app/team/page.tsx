import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Teams, Players, Matches, Tournaments } from "@/lib/models";
import { TeamBadge } from "@/components/TeamBadge";
import { MatchStatusBadge } from "@/components/MatchStatusBadge";

export default async function TeamDashboardPage() {
  const user = await getCurrentUser();
  const team = user ? Teams.byUserId(user.id) : undefined;

  if (!team) {
    return (
      <div className="card p-10 text-center text-black/50">
        Your account isn&apos;t linked to a team yet. Register or claim a team from a tournament&apos;s public page to
        see it here.
      </div>
    );
  }

  const tournament = Tournaments.byId(team.tournamentId);
  const players = Players.listByTeam(team.id);
  const matches = tournament
    ? Matches.listByTournament(tournament.id).filter((m) => m.homeTeamId === team.id || m.awayTeamId === team.id)
    : [];

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <TeamBadge id={team.id} name={team.name} hasCrest={team.hasCrest} crestUpdatedAt={team.crestUpdatedAt} logoUrl={team.logoUrl} sport={tournament?.sport || "Soccer"} size="lg" />
        <div>
          <h1 className="text-2xl font-semibold">{team.name}</h1>
          {tournament && (
            <Link href={`/t/${tournament.slug}`} className="text-sm text-pitch-600 hover:underline">
              {tournament.name}
            </Link>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 my-6">
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-black/40 mb-1">Registration</p>
          <span className={`badge ${team.paid ? "bg-pitch-400/15 text-pitch-600" : "bg-black/10 text-black/50"}`}>
            {team.paid ? "Paid ✓" : "Unpaid"}
          </span>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-black/40 mb-1">Roster size</p>
          <p className="font-score text-xl">{players.length}</p>
        </div>
        {team.logoToken && (
          <Link href={`/t/${tournament?.slug}/crest/${team.logoToken}`} className="card p-4 hover:bg-black/[0.02] transition-colors">
            <p className="text-xs uppercase tracking-wide text-black/40 mb-1">Team crest</p>
            <p className="text-sm text-pitch-600 font-medium">{team.hasCrest ? "Change crest →" : "Upload a crest →"}</p>
          </Link>
        )}
      </div>

      <h2 className="font-semibold mb-3">Roster</h2>
      <div className="card divide-y divide-black/5 mb-8">
        {players.length === 0 ? (
          <p className="p-6 text-sm text-black/40 text-center">No players added yet.</p>
        ) : (
          players.map((p) => (
            <Link key={p.id} href={`/passport/${p.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-black/[0.02] transition-colors">
              <span className="text-sm font-medium">{p.name}</span>
              <span className="text-xs text-black/40">{p.jerseyNumber ? `#${p.jerseyNumber}` : "Passport →"}</span>
            </Link>
          ))
        )}
      </div>

      <h2 className="font-semibold mb-3">Schedule</h2>
      <div className="card divide-y divide-black/5">
        {matches.length === 0 ? (
          <p className="p-6 text-sm text-black/40 text-center">No matches scheduled yet.</p>
        ) : (
          matches.map((m) => {
            const opponentId = m.homeTeamId === team.id ? m.awayTeamId : m.homeTeamId;
            const opponent = opponentId ? Teams.byId(opponentId) : null;
            return (
              <div key={m.id} className="flex items-center justify-between px-5 py-3 text-sm gap-2">
                <div className="min-w-0">
                  <p className="truncate">vs {opponent?.name || "TBD"}</p>
                  <p className="text-xs text-black/40">{m.round}{m.field ? ` · ${m.field}` : ""}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-score">{m.homeScore ?? "-"} : {m.awayScore ?? "-"}</span>
                  <MatchStatusBadge status={m.status} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
