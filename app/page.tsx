import Link from "next/link";
import { Logo } from "@/components/Logo";
import { MarketingNav } from "@/components/MarketingNav";
import { PitchPattern } from "@/components/PitchPattern";
import { HeroPhoneMockup } from "@/components/HeroPhoneMockup";
import { RoleTabs } from "@/components/RoleTabs";
import { SPORTS, SPORT_NAMES } from "@/lib/sportTheme";

const NAV_LINKS = [
  { href: "/tournaments", label: "Tournaments" },
  { href: "/tour", label: "See how it works" },
  { href: "/inquire", label: "Get in touch" },
];

const steps = [
  { n: "01", title: "Set up your tournament", body: "Sport, format, fields, and fees — a few minutes." },
  { n: "02", title: "Teams register & pay", body: "Send invite links or open registration." },
  { n: "03", title: "Run match day", body: "Score live from the sideline." },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-clip">
      <MarketingNav links={NAV_LINKS} />

      <section className="relative">
        <PitchPattern className="pointer-events-none absolute -z-10 h-[560px] w-[560px] text-black/[0.04] -right-40 -top-24" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-14 pb-20 sm:pt-20 sm:pb-28 grid lg:grid-cols-[1.15fr_1fr] gap-12 items-center">
          <div className="max-w-2xl animate-fade-up">
            {/* Four different saturated sport colors right above the fold —
                before the headline even loads in the eye — is the first
                thing a first-time visitor's attention has to sort through.
                Those colors earn their keep on a tournament/dashboard page,
                where they help someone scan live data at a glance; here
                they're just "what sports we support" marketing copy, so one
                calm, uniform style says the same thing without the noise. */}
            <div className="flex flex-wrap items-center gap-1.5 mb-6">
              {SPORT_NAMES.map((s) => (
                <span key={s} className="badge bg-black/5 text-black/60 text-[11px]">
                  {SPORTS[s].emoji} {SPORTS[s].label}
                </span>
              ))}
            </div>
            <h1 className="font-display text-display-sm sm:text-display-md lg:text-display-lg text-black">
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
              One app connecting tournament organizers, team captains, and players — from registration and live
              match scoring to digital player passports.
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

          <div className="relative flex justify-center lg:justify-end lg:pr-6 py-4">
            <div>
              <HeroPhoneMockup />
              {/* This mockup is a stylized composite, not a literal
                  screenshot (unlike the /t/[slug] ticket-card it's inspired
                  by, it has no exact match anywhere in the real product) —
                  so the caption underneath makes a claim it can back up
                  instead of "real screen, real tournament" like before. */}
              <p className="text-center text-[11px] uppercase tracking-[0.2em] text-black/40 pt-6">
                Live scores &amp; schedules, from any phone
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="roles" className="border-y-2 border-black bg-surface2 relative overflow-hidden">
        <div className="grain-overlay" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
          <div className="reveal flex items-end justify-between gap-6 mb-8 flex-wrap">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-pitch-600">One system, every role</span>
              <h2 className="text-display-sm mt-2 max-w-lg leading-[0.95]">
                Built for whoever's looking
              </h2>
            </div>
            <p className="text-black/50 max-w-sm text-sm">
              Same live data, a different view for directors, coaches, and families.
            </p>
          </div>

          <div className="divider-pitch mb-8" style={{ ["--divider-bg" as any]: "rgb(var(--ink) / 0.03)" }} />

          <RoleTabs />
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
          locked ink/paper/red palette: black bg, white text, one red button.
          surface-light pins --ink/--paper to fixed light values so bg-black/
          text-white below always render as literal black/white regardless of
          the site's theme toggle — same fix and reasoning as
          HeroPhoneMockup's always-dark phone screen; left unpinned, dark mode
          flips the tokens and this band inverts to a light band instead. */}
      <section className="reveal relative surface-light bg-black text-white py-24 text-center overflow-hidden">
        <PitchPattern className="pointer-events-none absolute -z-0 h-[480px] w-[480px] text-white/[0.04] -left-32 -bottom-32" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <Logo className="justify-center mb-7" wordmarkClassName="text-4xl sm:text-5xl" />
          <h2 className="text-display-sm mb-4">Ready to run your next event on Jogo?</h2>
          <p className="text-white/50 mb-9 max-w-xl mx-auto text-base">
            Open registration and have a full bracket ready before kickoff.
          </p>
          <Link href="/signup" className="btn-primary text-base px-6 py-3">
            Get started free
          </Link>
        </div>
      </section>

      <footer className="border-t border-black/5">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <Logo wordmarkClassName="text-sm" />
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
