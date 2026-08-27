import Link from "next/link";
import { Logo } from "@/components/Logo";
import { MarketingNav } from "@/components/MarketingNav";
import { PitchPattern } from "@/components/PitchPattern";
import { LiveScoreCard } from "@/components/LiveScoreCard";
import { IconClipboard, IconCalendar, IconBracket, IconPulse, IconWhistle, IconQr } from "@/components/icons";
import { SPORTS, SPORT_NAMES } from "@/lib/sportTheme";

const NAV_LINKS = [
  { href: "/tournaments", label: "Tournaments" },
  { href: "/tour", label: "See how it works" },
  { href: "/inquire", label: "Get in touch" },
];

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
      <MarketingNav links={NAV_LINKS} />

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
            <h1 className="font-display text-display-sm sm:text-display-md lg:text-display-lg tracking-tight text-black">
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
              <p className="text-center text-[11px] uppercase tracking-[0.2em] text-black/25 pt-4">
                Real screen, real tournament — coastalcup/live
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y-2 border-black bg-black/[0.02] relative overflow-hidden">
        <div className="grain-overlay" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
          <div className="reveal flex items-end justify-between gap-6 mb-8 flex-wrap">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-pitch-600">The system</span>
              <h2 className="text-display-sm mt-2 max-w-lg leading-[0.95]">
                Everything organizers need, connected end to end
              </h2>
            </div>
            <p className="text-black/50 max-w-sm text-sm">
              Registration feeds scheduling, scheduling feeds live scores, and live scores populate every player&apos;s
              passport — one system instead of five spreadsheets and a group chat.
            </p>
          </div>

          <div className="divider-pitch mb-2" style={{ ["--divider-bg" as any]: "rgb(var(--ink) / 0.03)" }} />

          <div className="grid sm:grid-cols-2 gap-x-10">
            {features.map((f, i) => (
              <div key={f.title} className="reveal group relative py-7 border-t border-black/10" data-reveal-delay={i * 80}>
                {/* Ghost numeral is absolutely positioned and out of the text
                    flow on purpose — as an inline flex sibling it used to
                    collide with any heading that wrapped to two lines
                    (headings this short wrap on ~half of phone widths).
                    Positioning it behind a fixed-width padded column means
                    the heading/body can never run into it, at any width. */}
                <span
                  className="font-display text-6xl text-black/[0.06] leading-none select-none absolute -top-1 left-0 z-0"
                  aria-hidden="true"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="relative z-10 pl-12 sm:pl-16">
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
        <h2 className="reveal text-display-sm text-center mb-16">From kickoff to trophy in three steps</h2>
        <div className="grid sm:grid-cols-3 gap-10 relative">
          <div className="hidden sm:block absolute top-8 left-[16.5%] right-[16.5%] h-px bg-gradient-to-r from-transparent via-pitch-400/30 to-transparent" />
          {steps.map((s, i) => (
            <div key={s.n} className="reveal relative text-center sm:text-left" data-reveal-delay={i * 100}>
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-black text-white font-display text-base relative z-10 shadow-ticket">
                {s.n}
              </span>
              <h3 className="font-semibold text-black mt-5 mb-1.5 text-lg">{s.title}</h3>
              <p className="text-sm text-black/50 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* The one deliberate dark moment on the page — everything else here is
          white/gray, so this band is the closing punctuation mark rather than
          another identical section in the same rhythm. Stays inside the
          locked ink/paper/red palette: black bg, white text, one red button. */}
      <section className="reveal relative bg-black text-white py-24 text-center overflow-hidden">
        <PitchPattern className="pointer-events-none absolute -z-0 h-[480px] w-[480px] text-white/[0.04] -left-32 -bottom-32" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <Logo showMark={false} className="justify-center text-3xl sm:text-4xl mb-7 text-white" />
          <h2 className="text-display-sm mb-4">Ready to run your next event on Jogo?</h2>
          <p className="text-white/50 mb-9 max-w-xl mx-auto text-base">
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
