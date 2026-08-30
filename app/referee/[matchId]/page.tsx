import { notFound } from "next/navigation";
import { Matches, Teams, Tournaments } from "@/lib/models";
import { RefereeScorepad } from "@/components/RefereeScorepad";
import { Logo } from "@/components/Logo";

// Deliberately outside the dashboard shell: a field marshal opens this on a
// phone at the touchline, so it gets no sidebar, no breadcrumb and no nav —
// one screen, thumb-sized targets, nothing else to tap by accident.
export const dynamic = "force-dynamic";

export default async function RefereeMatchPage({ params }: { params: { matchId: string } }) {
  const match = await Matches.byId(params.matchId);
  if (!match) notFound();

  const [tournament, home, away] = await Promise.all([
    Tournaments.byId(match.tournamentId),
    match.homeTeamId ? Teams.byId(match.homeTeamId) : Promise.resolve(undefined),
    match.awayTeamId ? Teams.byId(match.awayTeamId) : Promise.resolve(undefined),
  ]);

  const meta = [tournament?.name, match.round, match.field].filter(Boolean).join(" · ");

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="max-w-sm mx-auto mb-6 flex justify-center">
        <Logo wordmarkClassName="text-lg" />
      </div>
      <RefereeScorepad
        homeName={home?.name || match.homeLabel || "Home"}
        awayName={away?.name || match.awayLabel || "Away"}
        meta={meta}
      />
    </main>
  );
}
