import { Tournaments, Teams, Matches, Applications } from "@/lib/models";
import { StandingsTable } from "@/components/StandingsTable";
import { BracketView } from "@/components/BracketView";
import { MatchStatusBadge } from "@/components/MatchStatusBadge";
import { TeamInline } from "@/components/TeamInline";
import { computeStandings, groupNames } from "@/lib/standings";
import { findConflicts } from "@/lib/conflicts";
import { VenueStatusBar } from "@/components/VenueStatusBar";
import { ScheduleMatrix } from "@/components/ScheduleMatrix";
import { Referees } from "@/lib/models";

export default async function SchedulePage({ params }: { params: { id: string } }) {
  const tournament = (await Tournaments.byId(params.id))!;
  const teams = await Teams.listByTournament(tournament.id);
  const matches = await Matches.listByTournament(tournament.id);
  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const groupMatches = matches.filter((m) => m.stage === "GROUP");
  const knockoutMatches = matches.filter((m) => m.stage === "KNOCKOUT");
  const groups = groupNames(teams);
  const conflicts = findConflicts(matches, teams);
  const referees = await Referees.listByTournament(tournament.id);

  // Division per entrant, taken from the application the organizer accepted.
  // It is the only place a division is recorded, so the age-group tabs show
  // exactly the divisions this event actually has — and none where the
  // organizer never set one.
  const applications = await Applications.listByTournament(tournament.id);
  const divisionByTeamId: Record<string, string> = {};
  for (const a of applications) {
    if (a.teamId && a.division) divisionByTeamId[a.teamId] = a.division;
  }

  return (
    <div>
      <VenueStatusBar conflicts={conflicts} />

      {matches.length > 0 && (
        <div className="card p-5 sm:p-6 mb-6">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-4">Master grid</h2>
          <ScheduleMatrix
            matches={matches}
            teams={teams}
            referees={referees}
            conflicts={conflicts}
            divisionByTeamId={divisionByTeamId}
          />
        </div>
      )}

      {matches.length === 0 && (
        <div className="card p-8 text-center text-black/50">
          No schedule yet — go to Overview and click &quot;Generate schedule&quot;.
        </div>
      )}

      {groups.length > 0 && groupMatches.length > 0 && (
        <div className="card p-6 mb-6">
          <h2 className="font-extrabold mb-4">Group standings</h2>
          {/* lg (not sm) — same fix as the public tournament page: two
              groups sharing a row at tablet widths squeezed each 9-column
              table into half the card, well before there's actually room. */}
          <div className="grid lg:grid-cols-2 gap-8">
            {groups.map((g) => (
              <StandingsTable key={g} rows={computeStandings(teams, matches, g)} title={`Group ${g}`} sport={tournament.sport} />
            ))}
          </div>
        </div>
      )}

      {groupMatches.length > 0 && (
        <div className="card p-6 mb-6">
          <h2 className="font-extrabold mb-4">Group stage fixtures</h2>
          <div className="space-y-2">
            {groupMatches.map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm border-b border-black/5 pb-2">
                <div className="flex-1 min-w-0">
                  <span className="text-black/40 text-xs mr-2">{m.round}</span>
                  <TeamInline team={teamsById.get(m.homeTeamId || "")} sport={tournament.sport} />
                  <span className="mx-2 text-black/30">vs</span>
                  <TeamInline team={teamsById.get(m.awayTeamId || "")} sport={tournament.sport} />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-black/40 text-xs">{m.field}</span>
                  <span className="font-score text-sm">{m.homeScore ?? "-"} : {m.awayScore ?? "-"}</span>
                  <MatchStatusBadge status={m.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {knockoutMatches.length > 0 && (
        <div className="card p-6">
          <h2 className="font-extrabold mb-4">Knockout bracket</h2>
          <BracketView matches={knockoutMatches} teams={teams} sport={tournament.sport} />
        </div>
      )}
    </div>
  );
}
