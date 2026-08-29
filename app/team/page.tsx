import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Teams, Players, Matches, Tournaments } from "@/lib/models";
import { TeamBadge } from "@/components/TeamBadge";
import { MatchStatusBadge } from "@/components/MatchStatusBadge";

export default async function TeamDashboardPage() {
  const user = await getCurrentUser();
  const team = user ? await Teams.byUserId(user.id) : undefined;

  if (!team) {
    return (
      <div className="card p-10 text-center text-black/50">
        Your account isn&apos;t linked to a team yet. Register or claim a team from a tournament&apos;s public page to
        see it here.
      </div>
    );
  }

  const tournament = await Tournaments.byId(team.tournamentId);
  const players = await Players.listByTeam(team.id);
  const allTournamentMatches = tournament ? await Matches.listByTournament(tournament.id) : [];
  const matches = allTournamentMatches.filter((m) => m.homeTeamId === team.id || m.awayTeamId === team.id);
  const opponentIds = Array.from(
    new Set(matches.map((m) => (m.homeTeamId === team.id ? m.awayTeamId : m.homeTeamId)).filter((id): id is string => !!id))
  );
  const opponents = await Promise.all(opponentIds.map((id) => Teams.byId(id)));
  const opponentById = new Map(opponentIds.map((id, i) => [id, opponents[i]]));

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <TeamBadge id={team.id} name={team.name} hasCrest={team.hasCrest} crestUpdatedAt={team.crestUpdatedAt} logoUrl={team.logoUrl} sport={tournament?.sport || "Soccer"} size="lg" />
        <div>
          <h1 className="text-3xl font-extrabold text-inkDisplay">{team.name}</h1>
          {tournament && (
            <Link href={`/t/${tournament.slug}`} className="text-sm text-pitch-600 hover:underline">
              {tournament.name}
            </Link>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 my-6">
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-ink2 font-semibold mb-1">Registration</p>
          <span className={`badge ${team.paid ? "bg-volt-400/15 text-volt-500" : "bg-neutralBadge text-ink2 border border-line"}`}>
            {team.paid ? "Paid ✓" : "Unpaid"}
          </span>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-ink2 font-semibold mb-1">Roster size</p>
          <p className="font-score text-xl">{players.length}</p>
        </div>
        {team.logoToken && (
          <Link href={`/t/${tournament?.slug}/crest/${team.logoToken}`} className="card p-4 hover:bg-black/[0.02] transition-colors">
            <p className="text-xs uppercase tracking-wide text-ink2 font-semibold mb-1">Team crest</p>
            <p className="text-sm text-pitch-600 font-medium">{team.hasCrest ? "Change crest →" : "Upload a crest →"}</p>
          </Link>
        )}
      </div>

      <h2 className="font-extrabold mb-3">Roster</h2>
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

      <h2 className="font-extrabold mb-3">Schedule</h2>
      <div className="card divide-y divide-black/5">
        {matches.length === 0 ? (
          <p className="p-6 text-sm text-black/40 text-center">No matches scheduled yet.</p>
        ) : (
          matches.map((m) => {
            const opponentId = m.homeTeamId === team.id ? m.awayTeamId : m.homeTeamId;
            const opponent = opponentId ? opponentById.get(opponentId) : null;
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
