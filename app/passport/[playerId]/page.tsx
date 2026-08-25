import { notFound } from "next/navigation";
import Link from "next/link";
import { Players, Teams, Tournaments, Matches, CheckIns } from "@/lib/models";
import { qrDataUrl } from "@/lib/qr";
import { Logo } from "@/components/Logo";

export const revalidate = 5;

export default async function PassportPage({ params }: { params: { playerId: string } }) {
  const player = Players.byId(params.playerId);
  if (!player) notFound();
  const team = Teams.byId(player.teamId);
  if (!team) notFound();
  const tournament = Tournaments.byId(team.tournamentId);
  if (!tournament) notFound();

  const matches = Matches.listByTournament(tournament.id).filter(
    (m) => m.homeTeamId === team.id || m.awayTeamId === team.id
  );
  const played = matches.filter((m) => m.status === "FINAL");
  const wins = played.filter(
    (m) => (m.homeTeamId === team.id && (m.homeScore ?? 0) > (m.awayScore ?? 0)) || (m.awayTeamId === team.id && (m.awayScore ?? 0) > (m.homeScore ?? 0))
  ).length;

  const checkIns = CheckIns.listByPlayer(player.id);
  const isCheckedIn = checkIns.some((c) => c.tournamentId === tournament.id);

  const passportUrl = `/passport/${player.id}`;
  const qr = await qrDataUrl(passportUrl);

  return (
    <main className="min-h-screen surface-light bg-white text-navy-900">
      <header className="border-b border-black/5">
        <div className="mx-auto max-w-md px-4 py-4">
          <Link href="/">
            <Logo className="text-navy-900" />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-8">
        <div className="rounded-2xl border border-black/10 shadow-card overflow-hidden">
          <div className="bg-navy-900 text-white p-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/40">GolTrack Passport</p>
              <h1 className="text-xl font-semibold mt-0.5">{player.name}</h1>
              <p className="text-sm text-white/50">
                {team.name} {player.jerseyNumber && `· #${player.jerseyNumber}`}
              </p>
            </div>
            <div className="bg-white rounded-lg p-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="Passport QR code" className="h-20 w-20" />
            </div>
          </div>

          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-black/40">Passport ID</span>
              <code className="text-xs text-navy-700">{player.passportId}</code>
            </div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-black/40">Status</span>
              <span className={`badge ${isCheckedIn ? "bg-pitch-500/10 text-pitch-600" : "bg-black/5 text-black/50"}`}>
                {isCheckedIn ? "Checked in ✓" : "Not checked in"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 my-5 text-center">
              <div>
                <p className="text-2xl font-semibold">{played.length}</p>
                <p className="text-xs text-black/40">Matches</p>
              </div>
              <div>
                <p className="text-2xl font-semibold">{wins}</p>
                <p className="text-xs text-black/40">Wins</p>
              </div>
              <div>
                <p className="text-2xl font-semibold">1</p>
                <p className="text-xs text-black/40">Tournaments</p>
              </div>
            </div>

            <h2 className="text-sm font-semibold mb-2 text-black/70">Career timeline</h2>
            <div className="rounded-xl border border-black/10 p-3">
              <p className="text-sm font-medium">{tournament.name}</p>
              <p className="text-xs text-black/40">
                {new Date(tournament.startDate).toLocaleDateString()} · {team.name} ·{" "}
                {played.length} match{played.length === 1 ? "" : "es"} played
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-black/30 text-center mt-4">
          Show this QR code at the check-in table on match day.
        </p>
      </div>
    </main>
  );
}
