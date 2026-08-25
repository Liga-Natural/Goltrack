import Link from "next/link";
import { Tournaments, Teams } from "@/lib/models";
import { Logo } from "@/components/Logo";
import { getSportTheme } from "@/lib/sportTheme";

export const revalidate = 30;

const statusColors: Record<string, string> = {
  DRAFT: "bg-white/10 text-white/60",
  REGISTRATION_OPEN: "bg-pitch-400/15 text-pitch-400",
  SCHEDULED: "bg-blue-400/15 text-blue-300",
  LIVE: "bg-volt-400/20 text-volt-400",
  COMPLETED: "bg-white/10 text-white/40",
};

export default function TournamentsHubPage() {
  const tournaments = Tournaments.listPublic();

  return (
    <main className="min-h-screen">
      <header className="border-b border-white/5">
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
        <p className="text-white/50">Live standings, schedules, rosters, and results — updated as matches happen.</p>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-20">
        {tournaments.length === 0 ? (
          <div className="card p-10 text-center text-white/50">No public tournaments yet — check back soon.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {tournaments.map((t) => {
              const theme = getSportTheme(t.sport);
              const teamCount = Teams.listByTournament(t.id).filter((tm) => tm.name).length;
              return (
                <Link
                  key={t.id}
                  href={`/t/${t.slug}`}
                  className="card p-5 hover:border-pitch-400/30 hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="badge bg-white/10 text-white/70">
                      {theme.emoji} {theme.label}
                    </span>
                    <span className={`badge ${statusColors[t.status]}`}>{t.status.replace("_", " ")}</span>
                  </div>
                  <h3 className="font-semibold text-white mb-1.5">{t.name}</h3>
                  <p className="text-sm text-white/50 mb-3">
                    {new Date(t.startDate).toLocaleDateString()}
                    {t.location ? ` · ${t.location}` : ""}
                  </p>
                  <p className="text-xs text-white/40">{teamCount} team{teamCount === 1 ? "" : "s"} registered</p>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <footer className="border-t border-white/5">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/30">
          <Logo className="text-sm" markClassName="h-5 w-5" />
          <p>© {new Date().getFullYear()} GolTrack. Built for organizers, players, and families.</p>
        </div>
      </footer>
    </main>
  );
}
