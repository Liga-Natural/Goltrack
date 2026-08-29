import Link from "next/link";
import { Tournaments, Teams } from "@/lib/models";
import { Logo } from "@/components/Logo";
import { TournamentsGrid } from "@/components/TournamentsGrid";

export const revalidate = 30;

export default async function TournamentsHubPage() {
  const tournaments = await Tournaments.listPublic();
  const teamCounts: Record<string, number> = {};
  for (const t of tournaments) {
    const teams = await Teams.listByTournament(t.id);
    teamCounts[t.id] = teams.filter((tm) => tm.name).length;
  }

  return (
    <main className="min-h-screen stadium-glow">
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

      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-14 pb-10">
        <h1 className="text-display-sm mb-3">Tournaments</h1>
        <p className="text-black/50 max-w-md">Live standings, schedules, rosters, and results — updated as matches happen.</p>
        <div className="divider-pitch mt-8" style={{ ["--divider-bg" as any]: "rgb(var(--paper))" }} />
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
          <Logo markClassName="h-5 w-5" wordmarkClassName="h-4" />
          <p>© {new Date().getFullYear()} Jogo. Built for organizers, players, and families.</p>
        </div>
      </footer>
    </main>
  );
}
