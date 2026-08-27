import Link from "next/link";
import { Logo } from "./Logo";
import { MarketingNav } from "./MarketingNav";
import { StandingsTable } from "./StandingsTable";
import { MatchStatusBadge } from "./MatchStatusBadge";
import { IconGrid, IconUsers, IconCalendar, IconPulse, IconWhistle, IconQr } from "./icons";
import type { Tournament, Team, Match, Referee, Player } from "@/lib/models";
import type { StandingRow } from "@/lib/standings";

const NAV_LINKS = [
  { href: "/tournaments", label: "Tournaments" },
  { href: "/inquire", label: "Get in touch" },
];

export function ProductShowcase({
  tournament,
  teams,
  matches,
  referees,
  playersByTeam,
  groups,
  standingsByGroup,
}: {
  tournament: Tournament;
  teams: Team[];
  matches: Match[];
  referees: Referee[];
  playersByTeam: Record<string, Player[]>;
  groups: string[];
  standingsByGroup: Record<string, StandingRow[]>;
}) {
  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const groupMatches = matches.filter((m) => m.stage === "GROUP").slice(0, 4);
  const sampleTeams = teams.slice(0, 3);

  const sections = [
    {
      icon: IconGrid,
      title: "Overview, at a glance",
      body: "Teams, matches, and fees — the moment you open a tournament.",
      preview: (
        <div className="grid grid-cols-3 gap-2.5">
          {[
            ["Teams registered", teams.length],
            ["Matches scheduled", matches.length],
            ["Entry fee", `$${(tournament.feeCents / 100).toFixed(0)}`],
          ].map(([label, value]) => (
            <div key={label as string} className="card p-3.5">
              <p className="text-[10px] uppercase tracking-wide text-black/40 mb-1">{label}</p>
              <p className="text-xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      icon: IconUsers,
      title: "Teams & rosters, organized",
      body: "Contact info, payment status, and rosters — all in one place.",
      preview: (
        <div className="space-y-2">
          {sampleTeams.map((t) => (
            <div key={t.id} className="card p-3.5 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{t.name}</p>
                <p className="text-xs text-black/40">{(playersByTeam[t.id] || []).length} players</p>
              </div>
              <span className={`badge ${t.paid ? "bg-pitch-400/15 text-pitch-600" : "bg-black/10 text-black/50"}`}>
                {t.paid ? "Paid ✓" : "Unpaid"}
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      icon: IconCalendar,
      title: "Schedules & standings that build themselves",
      body: "A full schedule in seconds. Standings update as results come in.",
      preview: groups[0] ? <StandingsTable rows={standingsByGroup[groups[0]].slice(0, 4)} title={`Group ${groups[0]}`} sport={tournament.sport} /> : null,
    },
    {
      icon: IconPulse,
      title: "Live scoring from the sideline",
      body: "Enter results on your phone. Everyone watching sees it instantly.",
      preview: (
        <div className="space-y-2">
          {groupMatches.slice(0, 3).map((m) => (
            <div key={m.id} className="card p-3 flex items-center justify-between gap-2 text-sm">
              <span className="truncate min-w-0">
                {teamsById.get(m.homeTeamId || "")?.name} <span className="text-black/30">vs</span>{" "}
                {teamsById.get(m.awayTeamId || "")?.name}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-score text-sm">
                  {m.homeScore ?? "-"}:{m.awayScore ?? "-"}
                </span>
                <MatchStatusBadge status={m.status} />
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      icon: IconWhistle,
      title: "Referee assignments",
      body: "Assign officials to matches. Contact info stays attached to every game.",
      preview: (
        <div className="space-y-2">
          {referees.slice(0, 3).map((r) => (
            <div key={r.id} className="card p-3 text-sm">
              <span className="font-medium">{r.name}</span>
              {r.contact && <span className="text-black/40"> · {r.contact}</span>}
            </div>
          ))}
        </div>
      ),
    },
    {
      icon: IconQr,
      title: "Check-in, verified by QR",
      body: "Scan each passport on match day. No clipboard, no Sharpie.",
      preview: (
        <div className="card p-4 text-center">
          <p className="text-sm text-black/50">Passport scanned</p>
          <p className="font-semibold text-pitch-600 mt-1">✓ Checked in</p>
        </div>
      ),
    },
  ];

  return (
    <main className="min-h-screen">
      <MarketingNav links={NAV_LINKS} maxWidthClass="max-w-5xl" />

      <section className="mx-auto max-w-5xl px-4 sm:px-6 pt-16 pb-8 text-center">
        <span className="badge bg-pitch-400/10 text-pitch-600 border border-pitch-400/20 mb-5">
          A look inside the console
        </span>
        <h1 className="text-display-sm mb-4">
          What you get when you run a tournament on Jogo
        </h1>
        <p className="text-black/60 max-w-xl mx-auto">
          Real screens from a real tournament — not a mockup.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-4 sm:px-6 pb-16 space-y-16">
        {sections.map((s, i) => (
          <div key={s.title} className={`grid lg:grid-cols-2 gap-10 items-center ${i % 2 === 1 ? "lg:[direction:rtl]" : ""}`}>
            <div className="lg:[direction:ltr]">
              <div className="h-10 w-10 rounded-lg bg-pitch-400/10 text-pitch-600 flex items-center justify-center mb-4">
                <s.icon className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-semibold mb-2">{s.title}</h2>
              <p className="text-black/55 leading-relaxed">{s.body}</p>
            </div>
            <div className="lg:[direction:ltr]">{s.preview}</div>
          </div>
        ))}
      </section>

      <section className="border-t border-black/5">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 text-center">
          <h2 className="text-display-sm mb-4">Ready to run your own tournament?</h2>
          <p className="text-black/50 mb-8">
            A paid tool for organizers done juggling spreadsheets and group chats.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup" className="btn-primary text-base px-6 py-3">
              Get started
            </Link>
            <Link href="/inquire" className="btn-secondary text-base px-6 py-3">
              Talk to us first
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-black/5">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-black/30">
          <Logo markClassName="h-5 w-5" wordmarkClassName="h-4" />
          <p>© {new Date().getFullYear()} Jogo. Built for organizers, players, and families.</p>
        </div>
      </footer>
    </main>
  );
}
