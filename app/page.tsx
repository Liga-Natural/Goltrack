import Link from "next/link";
import { Logo, LogoMark } from "@/components/Logo";
import { PitchPattern } from "@/components/PitchPattern";
import { LiveScoreCard } from "@/components/LiveScoreCard";
import { IconClipboard, IconCalendar, IconBracket, IconPulse, IconWhistle, IconQr } from "@/components/icons";

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
  { n: "01", title: "Set up your tournament", body: "Add fields, groups, and dates in a few minutes." },
  { n: "02", title: "Teams register & pay", body: "Share a link — rosters and fees roll in on their own." },
  { n: "03", title: "Run match day", body: "Score from the sideline while standings and brackets update live." },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-clip">
      <header className="border-b border-white/5 sticky top-0 z-20 bg-navy-900/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <Logo />
          <nav className="flex items-center gap-1 sm:gap-2">
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
        <div className="glow-blob -top-24 -left-32 h-80 w-80 bg-pitch-400/20 animate-drift" />
        <div className="glow-blob top-32 right-0 h-72 w-72 bg-volt-400/10 animate-drift-slow" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 grid lg:grid-cols-2 gap-12 items-center">
          <div className="max-w-2xl animate-fade-up">
            <span className="badge bg-pitch-400/10 text-pitch-400 border border-pitch-400/20 mb-5">
              Soccer & futsal tournament software
            </span>
            <h1 className="text-4xl sm:text-5xl font-semibold leading-tight tracking-tight text-white">
              Run your league. <span className="text-pitch-400">Own the match day.</span>
            </h1>
            <p className="mt-5 text-lg text-white/60">
              GolTrack is the all-in-one platform to organize, run, and grow soccer and futsal tournaments —
              registration, scheduling, brackets, live scores, and digital player passports in one place.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup" className="btn-primary text-base px-6 py-3">
                Create your first tournament
              </Link>
              <Link href="/tour" className="btn-secondary text-base px-6 py-3">
                Explore the management interface →
              </Link>
            </div>
            <p className="mt-4 text-sm text-white/40">
              No account needed —{" "}
              <Link href="/tour" className="text-pitch-400 hover:underline">
                click into the live console
              </Link>{" "}
              or see the{" "}
              <Link href="/t/coastal-cup" className="text-pitch-400 hover:underline">
                public tournament page
              </Link>
              .
            </p>
          </div>

          <div className="relative flex justify-center lg:justify-end">
            <PitchPattern className="absolute -z-10 h-[420px] w-[420px] text-white/[0.06] -right-6 -top-10" />
            <LiveScoreCard />
          </div>
        </div>
      </section>

      <section className="border-y border-white/5 bg-navy-800/40 relative overflow-hidden">
        <div className="grain-overlay" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-16">
          <h2 className="text-2xl font-semibold mb-2">Everything organizers need, connected end to end</h2>
          <p className="text-white/50 mb-10 max-w-2xl">
            Registration feeds scheduling, scheduling feeds live scores, and live scores populate every player&apos;s
            passport — one system instead of five spreadsheets and a group chat.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-pitch-400/30 hover:shadow-glow animate-fade-up"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <div className="h-9 w-9 rounded-lg bg-pitch-400/10 text-pitch-400 flex items-center justify-center mb-3">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-white mb-1.5">{f.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{f.body}</p>
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
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-navy-700 border border-pitch-400/30 text-pitch-400 font-display text-sm relative z-10">
                {s.n}
              </span>
              <h3 className="font-semibold text-white mt-4 mb-1.5">{s.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-4 sm:px-6 py-20 text-center overflow-hidden">
        <div className="glow-blob left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 bg-pitch-400/15 animate-drift" />
        <div className="relative">
          <div className="relative mx-auto mb-5 h-16 w-16">
            <span className="absolute inset-0 rounded-2xl bg-pitch-400/20 blur-lg" />
            <LogoMark className="relative h-16 w-16" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold mb-3">Ready to run your next event on GolTrack?</h2>
          <p className="text-white/50 mb-8 max-w-xl mx-auto">
            Set up a tournament, open registration, and have a full bracket ready before your first team even checks in.
          </p>
          <Link href="/signup" className="btn-primary text-base px-6 py-3">
            Get started free
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/5">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <Logo className="text-sm" markClassName="h-5 w-5" />
          <nav className="flex items-center gap-5 text-white/40">
            <Link href="/tour" className="hover:text-white/70">
              See how it works
            </Link>
            <Link href="/inquire" className="hover:text-white/70">
              Get in touch
            </Link>
          </nav>
          <p className="text-white/30">© {new Date().getFullYear()} GolTrack. Built for organizers, players, and families.</p>
        </div>
      </footer>
    </main>
  );
}
