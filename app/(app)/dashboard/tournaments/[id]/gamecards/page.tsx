import { Tournaments, Teams, Matches, Players, Referees } from "@/lib/models";
import { PrintButton } from "@/components/PrintButton";

function kickoff(iso: string | null): string {
  if (!iso) return "TBC";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "TBC"
    : d.toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" });
}

// Roster block with numbered signature rules. Deliberately generous line
// height and real ruled lines: this is filled in with a biro on a clipboard
// in the wind, not read on a screen.
function Roster({ label, teamName, players }: { label: string; teamName: string; players: { id: string; name: string; jerseyNumber: string | null }[] }) {
  const rows = Math.max(players.length, 12);
  return (
    <div className="flex-1 min-w-0">
      <p className="text-[9px] uppercase tracking-wide text-black/40 font-semibold">{label}</p>
      <p className="text-sm font-bold mb-2 truncate">{teamName}</p>
      <table className="w-full text-[11px]">
        <tbody>
          {Array.from({ length: rows }).map((_, i) => {
            const p = players[i];
            return (
              <tr key={p?.id ?? `blank-${i}`} className="border-b border-black/20">
                <td className="w-7 py-[3px] text-black/40">{p?.jerseyNumber || ""}</td>
                <td className="py-[3px] truncate">{p?.name || ""}</td>
                {/* Goals / cards columns are left blank on purpose — the
                    referee writes them, and pre-filling anything here would
                    be guessing at the result. */}
                <td className="w-6 border-l border-black/20" />
                <td className="w-6 border-l border-black/20" />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function GameCardsPage({ params }: { params: { id: string } }) {
  const tournament = (await Tournaments.byId(params.id))!;
  const [teams, matches, referees] = await Promise.all([
    Teams.listByTournament(params.id),
    Matches.listByTournament(params.id),
    Referees.listByTournament(params.id),
  ]);
  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const refsById = new Map(referees.map((r) => [r.id, r]));

  // Only fixtures that have not been played: printing cards for finished
  // matches wastes paper on a match-day desk.
  const upcoming = matches.filter((m) => m.status !== "FINAL" && m.homeTeamId && m.awayTeamId);

  const rosterByTeam = new Map<string, { id: string; name: string; jerseyNumber: string | null }[]>();
  await Promise.all(
    Array.from(new Set(upcoming.flatMap((m) => [m.homeTeamId, m.awayTeamId]).filter(Boolean) as string[])).map(
      async (id) => rosterByTeam.set(id, await Players.listByTeam(id))
    )
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
        <div>
          <h1 className="text-3xl font-extrabold text-inkDisplay mb-1">Game cards</h1>
          <p className="text-ink2 text-sm font-medium">
            {upcoming.length} card{upcoming.length === 1 ? "" : "s"} — one per unplayed fixture, with rosters and
            signature lines.
          </p>
        </div>
        <PrintButton />
      </div>

      {upcoming.length === 0 ? (
        <div className="card p-10 text-center text-ink2 print:hidden">
          Nothing left to play — every fixture has a final score.
        </div>
      ) : (
        <div className="space-y-6 print:space-y-0">
          {upcoming.map((m) => {
            const home = teamsById.get(m.homeTeamId as string);
            const away = teamsById.get(m.awayTeamId as string);
            const ref = m.refereeId ? refsById.get(m.refereeId) : null;
            return (
              // bg-white + text-black literally, not via tokens: this sheet
              // is printed, and on the dark theme the token values would put
              // white ink on white paper. break-inside-avoid keeps one card
              // off two pages.
              <div
                key={m.id}
                className="bg-white text-black rounded-xl border border-black/15 p-5 print:rounded-none print:border-black/40 print:break-inside-avoid print:mb-4"
              >
                <div className="flex items-start justify-between gap-4 border-b border-black/20 pb-2 mb-3">
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold truncate">{tournament.name}</p>
                    <p className="text-[11px] text-black/50 truncate">
                      {[m.round, m.field, kickoff(m.scheduledAt)].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[9px] uppercase tracking-wide text-black/40 font-semibold">Referee</p>
                    <p className="text-[11px]">{ref?.name || "________________"}</p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <Roster label="Home" teamName={home?.name || "TBD"} players={rosterByTeam.get(m.homeTeamId as string) || []} />
                  <Roster label="Away" teamName={away?.name || "TBD"} players={rosterByTeam.get(m.awayTeamId as string) || []} />
                </div>

                <div className="grid grid-cols-3 gap-6 mt-5 pt-3 border-t border-black/20">
                  {["Home coach", "Away coach", "Referee"].map((role) => (
                    <div key={role}>
                      <div className="border-b border-black/40 h-7" />
                      <p className="text-[9px] uppercase tracking-wide text-black/40 font-semibold mt-1">{role}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-3 text-[9px] text-black/40">
                  <span>Final score: ______ – ______</span>
                  <span>Jogo.</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Suspension flags are named here rather than faked on the roster.
          There is no discipline table — cards issued in a match are not
          recorded anywhere — so a "SUSPENDED" tag would never be true. */}
      <div className="card p-5 mt-6 print:hidden">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-2">Suspensions</h2>
        <p className="text-sm text-ink2">
          Not built. Flagging an ineligible player needs cards to be recorded per match, which the referee scorepad
          collects but does not yet persist — so no roster line can honestly carry a suspension tag.
        </p>
      </div>
    </div>
  );
}
