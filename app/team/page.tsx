import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Teams, Players, Matches, Tournaments } from "@/lib/models";
import { TeamBadge } from "@/components/TeamBadge";
import { MatchStatusBadge } from "@/components/MatchStatusBadge";
import { addOwnPlayer } from "@/lib/actions";

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

      {/* The roster module is only reachable because a team row exists, and a
          team row is only created when an organizer accepts the application —
          so "roster unlocks on acceptance" is enforced by the data, not by
          hiding a form. */}
      <div className="flex items-center gap-2.5 mb-3">
        <h2 className="font-extrabold">Roster</h2>
        <span className="badge badge-live text-[10px]">
          {team.groupName ? `Accepted · Group ${team.groupName}` : "Accepted · Roster open"}
        </span>
      </div>
      <div className="card p-5 sm:p-6 mb-8">
        <div className="divide-y divide-lineSoft mb-5">
          {players.length === 0 ? (
            <p className="py-6 text-sm text-ink2 text-center">
              No players yet — add your squad below. Each one gets a digital passport QR for match-day check-in.
            </p>
          ) : (
            players.map((p) => (
              <Link key={p.id} href={`/passport/${p.id}`} className="flex items-center gap-3 py-3 hover:bg-black/[0.03] transition-colors -mx-2 px-2 rounded-lg">
                <span className="font-score text-sm text-ink3 w-8 shrink-0">{p.jerseyNumber ? `#${p.jerseyNumber}` : "—"}</span>
                <span className="text-sm font-semibold truncate min-w-0 flex-1">{p.name}</span>
                <span className="text-xs text-ink3 shrink-0">Passport →</span>
              </Link>
            ))
          )}
        </div>
        <form action={addOwnPlayer} className="border-t border-lineSoft pt-5">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-3">Add a player</p>
          <div className="grid sm:grid-cols-[1fr_6rem_9rem_auto] gap-3 items-end">
            <div className="min-w-0">
              <label className="label" htmlFor="pname">Full name</label>
              <input id="pname" className="input" name="name" required placeholder="Alex Moreno" />
            </div>
            <div className="min-w-0">
              <label className="label" htmlFor="pnum">Jersey</label>
              <input id="pnum" className="input" name="jerseyNumber" placeholder="10" />
            </div>
            <div className="min-w-0">
              <label className="label" htmlFor="pdob">Date of birth</label>
              <input id="pdob" className="input" type="date" name="birthdate" />
            </div>
            <button className="btn-primary text-sm">Add</button>
          </div>
        </form>
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
