import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Players, Teams, Tournaments, Matches } from "@/lib/models";
import { TeamBadge } from "@/components/TeamBadge";

export default async function PlayerDashboardPage() {
  const user = await getCurrentUser();
  const player = user ? await Players.byUserId(user.id) : undefined;

  if (!player) {
    return (
      <div className="card p-10 text-center text-ink2">
        Your account isn&apos;t linked to a passport yet. Claim your passport from your team&apos;s roster page to see
        it here.
      </div>
    );
  }

  // A self-registered player has no club until a coach adds them.
  const team = player.teamId ? await Teams.byId(player.teamId) : undefined;
  const tournament = team ? await Tournaments.byId(team.tournamentId) : undefined;
  const allTournamentMatches = tournament ? await Matches.listByTournament(tournament.id) : [];
  const matches = allTournamentMatches.filter((m) => m.homeTeamId === team?.id || m.awayTeamId === team?.id);
  const played = matches.filter((m) => m.status === "FINAL");
  const wins = team
    ? played.filter(
        (m) => (m.homeTeamId === team.id && (m.homeScore ?? 0) > (m.awayScore ?? 0)) || (m.awayTeamId === team.id && (m.awayScore ?? 0) > (m.homeScore ?? 0))
      ).length
    : 0;

  return (
    <div>
      <h1 className="text-3xl font-extrabold text-inkDisplay mb-1">Hey, {player.name.split(" ")[0]}</h1>
      <p className="text-ink2 text-sm mb-6">Your passport and this season&apos;s stats.</p>

      {team && (
        <div className="card p-5 flex items-center gap-3 mb-6">
          <TeamBadge id={team.id} name={team.name} hasCrest={team.hasCrest} crestUpdatedAt={team.crestUpdatedAt} logoUrl={team.logoUrl} sport={tournament?.sport || "Soccer"} size="lg" />
          <div className="min-w-0">
            <p className="font-medium truncate">{team.name}</p>
            {tournament && <p className="text-sm text-ink3 truncate">{tournament.name}</p>}
            {player.jerseyNumber && <p className="text-xs text-ink3">#{player.jerseyNumber}</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card p-4 text-center">
          <p className="font-score text-2xl">{played.length}</p>
          <p className="text-xs text-ink3">Matches played</p>
        </div>
        <div className="card p-4 text-center">
          <p className="font-score text-2xl">{wins}</p>
          <p className="text-xs text-ink3">Wins</p>
        </div>
      </div>

      <Link href={`/passport/${player.id}`} className="btn-primary w-full justify-center">
        View my QR passport
      </Link>
    </div>
  );
}
