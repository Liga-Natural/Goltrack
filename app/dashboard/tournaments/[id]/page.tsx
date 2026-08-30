import Link from "next/link";
import { Tournaments, Teams, Matches } from "@/lib/models";
import { generateSchedule, generateKnockout } from "@/lib/actions";
import { computeStandings, groupNames } from "@/lib/standings";
import { StandingsTable } from "@/components/StandingsTable";
import { FixtureList } from "@/components/FixtureList";
import { TabPanel } from "@/components/TabPanel";
import { TeamBadge } from "@/components/TeamBadge";
import { CopyLinkButton } from "@/components/CopyLinkButton";

// A compact figure + label. Deliberately not the old .card-elevated tiles:
// three big panels for three small numbers was most of the vertical space
// on this page, which is what made the overview feel empty — the page had
// nothing on it but its own summary.
function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-1">{label}</p>
      <p className="font-score text-2xl text-inkDisplay leading-none">{value}</p>
      {sub && <p className="text-[11px] text-ink3 mt-1 truncate">{sub}</p>}
    </div>
  );
}

export default async function TournamentOverviewPage({ params }: { params: { id: string } }) {
  const tournament = (await Tournaments.byId(params.id))!;
  const allTeams = await Teams.listByTournament(tournament.id);
  const teams = allTeams.filter((t) => t.name);
  const pendingInvites = allTeams.length - teams.length;
  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const matches = await Matches.listByTournament(tournament.id);
  const publicUrl = `/t/${tournament.slug}`;

  const groups = groupNames(teams);
  const played = matches.filter((m) => m.status === "FINAL").length;
  const live = matches.filter((m) => m.status === "LIVE");
  const upcoming = matches.filter((m) => m.status === "SCHEDULED");
  const results = matches.filter((m) => m.status === "FINAL");
  const paidCount = teams.filter((t) => t.paid).length;
  const checkedIn = teams.filter((t) => t.checkedIn).length;
  const pct = matches.length ? Math.round((played / matches.length) * 100) : 0;

  const generateScheduleWithId = generateSchedule.bind(null, tournament.id);
  const generateKnockoutWithId = generateKnockout.bind(null, tournament.id);

  // "Now" is whatever a director would look up first: live matches if any
  // are running, otherwise the next few kickoffs. An overview that shows
  // registration links during a match day is answering yesterday's question.
  const nowMatches = live.length > 0 ? live : upcoming.slice(0, 3);

  const tabs = [
    {
      key: "standings",
      label: "Standings",
      panel:
        groups.length > 0 ? (
          <div className="grid xl:grid-cols-2 gap-8">
            {groups.map((g) => (
              <StandingsTable key={g} rows={computeStandings(teams, matches, g)} title={`Group ${g}`} sport={tournament.sport} />
            ))}
          </div>
        ) : teams.length > 0 ? (
          <StandingsTable rows={computeStandings(teams, matches)} sport={tournament.sport} />
        ) : (
          <p className="text-sm text-ink2 py-6 text-center">Add teams to see standings.</p>
        ),
    },
    {
      key: "schedule",
      label: "Schedule",
      count: upcoming.length,
      panel: (
        <FixtureList
          matches={upcoming}
          teamsById={teamsById}
          sport={tournament.sport}
          emptyLabel="No upcoming fixtures — generate the schedule below."
        />
      ),
    },
    {
      key: "results",
      label: "Results",
      count: results.length,
      panel: (
        <FixtureList matches={results} teamsById={teamsById} sport={tournament.sport} emptyLabel="No results yet." />
      ),
    },
    {
      key: "teams",
      label: "Teams",
      count: teams.length,
      panel:
        teams.length > 0 ? (
          <div className="divide-y divide-lineSoft">
            {teams.map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-3">
                <TeamBadge
                  id={t.id}
                  name={t.name}
                  hasCrest={t.hasCrest}
                  crestUpdatedAt={t.crestUpdatedAt}
                  logoUrl={t.logoUrl}
                  sport={tournament.sport}
                  size="sm"
                />
                <span className="text-sm font-semibold truncate min-w-0">{t.name}</span>
                {t.groupName && <span className="text-[11px] text-ink3 shrink-0">Group {t.groupName}</span>}
                <span className="ml-auto flex items-center gap-1.5 shrink-0">
                  {t.paid && <span className="badge text-[10px]">Paid</span>}
                  {t.checkedIn && <span className="badge badge-live text-[10px]">In</span>}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink2 py-6 text-center">No teams registered yet.</p>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Progress strip: the whole state of the event on one line. The bar
          is the only thing here that answers "how far through are we?", and
          it needs no chart library to do it. */}
      <div className="card p-5 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mb-5">
          <Stat
            label="Teams"
            value={teams.length}
            sub={pendingInvites > 0 ? `${pendingInvites} invite${pendingInvites === 1 ? "" : "s"} pending` : `${paidCount} paid`}
          />
          <Stat label="Matches" value={`${played}/${matches.length}`} sub={live.length > 0 ? `${live.length} live now` : "played"} />
          <Stat label="Checked in" value={teams.length ? `${checkedIn}/${teams.length}` : "—"} sub="teams" />
          <Stat label="Entry fee" value={`$${(tournament.feeCents / 100).toFixed(0)}`} sub="per team" />
        </div>
        <div className="h-1.5 rounded-full bg-black/10 overflow-hidden">
          <div className="h-full rounded-full bg-black/50 transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[11px] text-ink3 mt-2">{pct}% of fixtures complete</p>
      </div>

      {nowMatches.length > 0 && (
        <div className="card p-5 sm:p-6">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-3">
            {live.length > 0 ? "Live now" : "Up next"}
          </h2>
          <FixtureList matches={nowMatches} teamsById={teamsById} sport={tournament.sport} />
        </div>
      )}

      <div className="card p-5 sm:p-6">
        <TabPanel tabs={tabs} />
      </div>

      {/* Setup, demoted. These were the two largest panels on the old page
          despite being things you touch once, before the event starts. */}
      <div className="card p-5 sm:p-6">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-4">Setup</h2>
        <div className="grid sm:grid-cols-2 gap-6 mb-6">
          <div className="min-w-0">
            <p className="text-sm font-semibold mb-1.5">Registration link</p>
            <div className="flex items-center gap-2">
              <code className="block flex-1 min-w-0 truncate bg-black/[0.05] rounded-lg px-3 py-2 text-xs text-ink2">
                {publicUrl}/register
              </code>
              <CopyLinkButton path={`${publicUrl}/register`} />
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold mb-1.5">Director</p>
            <p className="text-sm text-ink2 truncate">{tournament.supervisorName}</p>
            <p className="text-xs text-ink3 truncate">{tournament.supervisorEmail}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <form action={generateScheduleWithId}>
            <button className="btn-secondary text-sm" formAction={generateScheduleWithId}>
              {matches.some((m) => m.stage === "GROUP") ? "Regenerate group schedule" : "Generate schedule"}
            </button>
          </form>
          <form action={generateKnockoutWithId}>
            <button className="btn-ghost text-sm" formAction={generateKnockoutWithId}>
              Generate knockout bracket
            </button>
          </form>
          <Link href={publicUrl} className="btn-ghost text-sm ml-auto">
            View public page →
          </Link>
        </div>
      </div>
    </div>
  );
}
