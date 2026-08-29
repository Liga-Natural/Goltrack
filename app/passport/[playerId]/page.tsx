import { notFound } from "next/navigation";
import Link from "next/link";
import { Players, Teams, Tournaments, Matches, CheckIns } from "@/lib/models";
import { qrDataUrl } from "@/lib/qr";
import { Logo } from "@/components/Logo";
import { TeamBadge } from "@/components/TeamBadge";
import { ClaimPassportForm } from "@/components/ClaimPassportForm";
import { getCurrentUser } from "@/lib/auth";

export const revalidate = 5;

export default async function PassportPage({ params }: { params: { playerId: string } }) {
  const player = await Players.byId(params.playerId);
  if (!player) notFound();
  const team = await Teams.byId(player.teamId);
  if (!team) notFound();
  const tournament = await Tournaments.byId(team.tournamentId);
  if (!tournament) notFound();

  const allTournamentMatches = await Matches.listByTournament(tournament.id);
  const matches = allTournamentMatches.filter((m) => m.homeTeamId === team.id || m.awayTeamId === team.id);
  const played = matches.filter((m) => m.status === "FINAL");
  const wins = played.filter(
    (m) => (m.homeTeamId === team.id && (m.homeScore ?? 0) > (m.awayScore ?? 0)) || (m.awayTeamId === team.id && (m.awayScore ?? 0) > (m.homeScore ?? 0))
  ).length;

  const checkIns = await CheckIns.listByPlayer(player.id);
  const isCheckedIn = checkIns.some((c) => c.tournamentId === tournament.id);
  const currentUser = await getCurrentUser();
  const isOwnPassport = currentUser?.role === "PLAYER" && player.userId === currentUser.id;

  const passportUrl = `/passport/${player.id}`;
  const qr = await qrDataUrl(passportUrl);

  return (
    <main className="min-h-screen surface-light bg-white text-navy-900">
      <header className="border-b border-black/5">
        <div className="mx-auto max-w-md px-4 py-4">
          <Link href="/">
            <Logo />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-8">
        {/* Trading-card treatment: crest + jersey number up front, the tear
            line separating "the card" from "the stats on the back," QR kept
            exactly as large/high-contrast as before since this is scanned
            on match day — only its surroundings changed. */}
        <div className="ticket-card rounded-2xl border border-black/10 shadow-elevated" style={{ ["--ticket-cut" as any]: "108px" }}>
          <div className="relative overflow-hidden rounded-t-2xl bg-navy-900 text-white p-5">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-pitch-400" />
            <span
              className="absolute -right-3 -top-3 font-display text-8xl text-white/[0.06] leading-none select-none"
              aria-hidden="true"
            >
              {player.jerseyNumber || "•"}
            </span>
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-white/40">Jogo Passport</p>
                <div className="flex items-center gap-2.5 mt-2 mb-1">
                  <TeamBadge
                    id={team.id}
                    name={team.name}
                    hasCrest={team.hasCrest}
                    crestUpdatedAt={team.crestUpdatedAt}
                    logoUrl={team.logoUrl}
                    sport={tournament.sport}
                    size="sm"
                  />
                  {/* No truncate — a longer name has room to wrap to a
                      second line instead of ending in "…", since this
                      header's height isn't fixed. */}
                  <h1 className="text-xl font-semibold leading-tight">{player.name}</h1>
                </div>
                <p className="text-sm text-white/50 truncate">
                  {team.name} {player.jerseyNumber && `· #${player.jerseyNumber}`}
                </p>
              </div>
              <div className="bg-white rounded-lg p-1.5 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt="Passport QR code" className="h-20 w-20" />
              </div>
            </div>
          </div>

          <div className="ticket-card__tear mx-2" style={{ ["--ticket-punch-bg" as any]: "rgb(var(--paper))" }} />

          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-black/40">Passport ID</span>
              <code className="font-score text-xs text-navy-700">{player.passportId}</code>
            </div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-black/40">Status</span>
              <span className={`badge ${isCheckedIn ? "bg-volt-400/10 text-volt-500" : "bg-black/5 text-black/50"}`}>
                {isCheckedIn ? "Checked in ✓" : "Not checked in"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 my-5 text-center">
              <div>
                <p className="font-score text-2xl">{played.length}</p>
                <p className="text-xs text-black/40">Matches</p>
              </div>
              <div>
                <p className="font-score text-2xl">{wins}</p>
                <p className="text-xs text-black/40">Wins</p>
              </div>
              <div>
                <p className="font-score text-2xl">1</p>
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

            {isOwnPassport ? (
              <Link href="/me" className="btn-ghost w-full text-sm mt-4 justify-center">
                Go to my dashboard
              </Link>
            ) : (
              !player.userId && <ClaimPassportForm playerId={player.id} defaultName={player.name} />
            )}
          </div>
        </div>

        <p className="text-xs text-black/30 text-center mt-4">
          Show this QR code at the check-in table on match day.
        </p>
      </div>
    </main>
  );
}
