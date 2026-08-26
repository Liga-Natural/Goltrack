import Link from "next/link";
import { Tournaments, Teams } from "@/lib/models";
import { Logo } from "@/components/Logo";
import { TournamentsGrid } from "@/components/TournamentsGrid";

export const revalidate = 30;

export default function TournamentsHubPage() {
  const tournaments = Tournaments.listPublic();
  const teamCounts: Record<string, number> = {};
  for (const t of tournaments) teamCounts[t.id] = Teams.listByTournament(t.id).filter((tm) => tm.name).length;

  return (
    <main className="min-h-screen">
      <header className="border-b border-black/5">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <Link href="/inquire" className="btn-ghost text-sm">
            Get in touch
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-14 pb-8">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2">Tournaments</h1>
        <p className="text-black/50">Live standings, schedules, rosters, and results — updated as matches happen.</p>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-20">
        {tournaments.length === 0 ? (
          <div className="card p-10 text-center text-black/50">No public tournaments yet — check back soon.</div>
        ) : (
          <TournamentsGrid tournaments={tournaments} teamCounts={teamCounts} />
        )}
      </section>

      <footer className="border-t border-black/5">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-black/30">
          <Logo className="text-sm" markClassName="h-5 w-5" />
          <p>© {new Date().getFullYear()} GolTrack. Built for organizers, players, and families.</p>
        </div>
      </footer>
    </main>
  );
}
