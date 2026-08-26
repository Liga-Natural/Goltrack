import Link from "next/link";
import { Logo, LogoMark } from "@/components/Logo";
import { PitchPattern } from "@/components/PitchPattern";
import { LiveScoreCard } from "@/components/LiveScoreCard";
import { IconClipboard, IconCalendar, IconBracket, IconPulse, IconWhistle, IconQr } from "@/components/icons";
import { SPORTS, SPORT_NAMES } from "@/lib/sportTheme";

const features = [
  {
    title: "Registration & payments",
    body: "Teams sign up online, submit rosters, and pay fees before they ever set foot on your field.",
    icon: IconClipboard,
  },
  {
    title: "Auto-balanced scheduling",
    body: "Generate group-stage fixtures across every field and time slot in seconds — no spreadsheets.",
    icon: IconCalendar,
  },
  {
    title: "Brackets that build themselves",
    body: "Knockout brackets seed automatically from live standings once group play wraps.",
    icon: IconBracket,
  },
  {
    title: "Live scoring, public standings",
    body: "Enter results from the sideline; parents and coaches watch tables update in real time.",
    icon: IconPulse,
  },
  {
    title: "Referee management",
    body: "Assign officials to matches and keep contact info and match reports in one place.",
    icon: IconWhistle,
  },
  {
    title: "Digital player passports",
    body: "Every player gets a QR-verified digital ID with a career timeline across every tournament.",
    icon: IconQr,
  },
];

const steps = [
  { n: "01", title: "Set up your tournament", body: "Sport, format, fields, fees, and your director's contact — a few minutes." },
  { n: "02", title: "Teams register & pay", body: "Send unique invite links or open registration — rosters and fees roll in." },
  { n: "03", title: "Run match day", body: "Score from the sideline while standings and brackets update live." },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-clip">
      <header className="border-b border-black/10 sticky top-0 z-20 bg-white/85 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <Logo />
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link href="/tournaments" className="btn-ghost hidden sm:inline-flex">
              Tournaments
            </Link>
            <Link href="/tour" className="btn-ghost hidden sm:inline-flex">
              See how it works
            </Link>
            <Link href="/inquire" className="btn-ghost hidden sm:inline-flex">
              Get in touch
            </Link>
            <Link href="/login" className="btn-ghost">
              Log in
            </Link>
            <Link href="/signup" className="btn-primary">
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative">
        <PitchPattern className="pointer-events-none absolute -z-10 h-[560px] w-[560px] text-black/[0.04] -right-40 -top-24" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-14 pb-20 sm:pt-20 sm:pb-28 grid lg:grid-cols-[1.15fr_1fr] gap-12 items-center">
          <div className="max-w-2xl animate-fade-up">
            <div className="flex flex-wrap items-center gap-1.5 mb-6">
              {SPORT_NAMES.map((s) => (
                <span key={s} className={`badge ${SPORTS[s].soft} text-[11px]`}>
                  {SPORTS[s].emoji} {SPORTS[s].label}
                </span>
              ))}
            </div>
            <h1 className="font-display text-[2.75rem] leading-[0.98] sm:text-6xl lg:text-[4.5rem] tracking-tight text-black">
              RUN YOUR
              <br />
              LEAGUE.
              <br />
              <span className="relative inline-block text-pitch-600">
                OWN MATCH DAY.
                <svg
                  className="absolute left-0 -bottom-2 w-full h-3 text-pitch-600/50"
                  viewBox="0 0 300 12"
                  preserveAspectRatio="none"
                  fill="none"
                >
                  <path d="M2 8 Q75 2 150 6 T298 4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="mt-7 text-lg text-black/60 max-w-lg">
              Jogo is the all-in-one platform to organize, run, and grow tournaments — registration, scheduling,
              brackets, live scores, and digital player passports in one place.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/signup" className="btn-primary text-base px-6 py-3">
                Create your first tournament
              </Link>
              <Link href="/tour" className="btn-secondary text-base px-6 py-3">
                See what you get →
              </Link>
            </div>
            <p className="mt-5 text-sm text-black/40">
              No account needed —{" "}
              <Link href="/tour" className="text-pitch-600 hover:underline">
                browse the console
              </Link>{" "}
              or check out a{" "}
              <Link href="/t/coastal-cup" className="text-pitch-600 hover:underline">
                live tournament page
              </Link>
              .
            </p>
          </div>

          <div className="relative flex justify-center lg:justify-end lg:pr-6">
            <div className="w-full max-w-sm">
              <LiveScoreCard />
              <div className="ticket-perforation mx-2" style={{ ["--ticket-punch-bg" as any]: "#ffffff" }} />
              <p className="text-center text-[11px] uppercase tracking-[0.2em] text-black/25 pt-3">
                Real screen, real tournament — coastalcup/live
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y-2 border-black bg-gray-50 relative overflow-hidden">
        <div className="grain-overlay" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
          <div className="flex items-end justify-between gap-6 mb-12 flex-wrap">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-pitch-600">The system</span>
              <h2 className="text-2xl sm:text-3xl font-semibold mt-2 max-w-lg">
                Everything organizers need, connected end to end
              </h2>
            </div>
            <p className="text-black/50 max-w-sm text-sm">
              Registration feeds scheduling, scheduling feeds live scores, and live scores populate every player&apos;s
              passport — one system instead of five spreadsheets and a group chat.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-x-10">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="group flex items-start gap-5 py-6 border-t border-black/10 animate-fade-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="font-mono text-sm text-black/25 pt-0.5 shrink-0 w-6">{String(i + 1).padStart(2, "0")}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <f.icon className="h-4 w-4 text-pitch-600 shrink-0" />
                    <h3 className="font-semibold text-black">{f.title}</h3>
                  </div>
                  <p className="text-sm text-black/50 leading-relaxed">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
        <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-14">From kickoff to trophy in three steps</h2>
        <div className="grid sm:grid-cols-3 gap-8 relative">
          <div className="hidden sm:block absolute top-6 left-[16.5%] right-[16.5%] h-px bg-gradient-to-r from-transparent via-pitch-400/30 to-transparent" />
          {steps.map((s) => (
            <div key={s.n} className="relative text-center sm:text-left">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-black text-white font-display text-sm relative z-10">
                {s.n}
              </span>
              <h3 className="font-semibold text-black mt-4 mb-1.5">{s.title}</h3>
              <p className="text-sm text-black/50 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-4 sm:px-6 py-20 text-center overflow-hidden">
        <div className="relative">
          <div className="relative mx-auto mb-5 h-16 w-16">
            <span className="absolute inset-0 rounded-2xl bg-pitch-400/20 blur-lg" />
            <LogoMark className="relative h-16 w-16" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold mb-3">Ready to run your next event on Jogo?</h2>
          <p className="text-black/50 mb-8 max-w-xl mx-auto">
            Set up a tournament, open registration, and have a full bracket ready before your first team even checks in.
          </p>
          <Link href="/signup" className="btn-primary text-base px-6 py-3">
            Get started free
          </Link>
        </div>
      </section>

      <footer className="border-t border-black/5">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <Logo className="text-sm" markClassName="h-5 w-5" />
          <nav className="flex items-center gap-5 text-black/40">
            <Link href="/tournaments" className="hover:text-black/70">
              Tournaments
            </Link>
            <Link href="/tour" className="hover:text-black/70">
              See how it works
            </Link>
            <Link href="/inquire" className="hover:text-black/70">
              Get in touch
            </Link>
          </nav>
          <p className="text-black/30">© {new Date().getFullYear()} Jogo. Built for organizers, players, and families.</p>
        </div>
      </footer>
    </main>
  );
}
