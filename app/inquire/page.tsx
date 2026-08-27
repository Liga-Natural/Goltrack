import Link from "next/link";
import { Logo } from "@/components/Logo";
import { InquiryForm } from "@/components/InquiryForm";
import { IconCalendar, IconBracket, IconGrid, IconWhistle } from "@/components/icons";

const formats = [
  {
    title: "Round robin",
    icon: IconCalendar,
    body: "Every team plays every other team once. Simple, fair, and great for smaller fields or regular-season play.",
  },
  {
    title: "Groups + knockout",
    icon: IconGrid,
    body: "Teams split into groups for round-robin play, then top finishers advance into a seeded single-elimination bracket.",
  },
  {
    title: "Single elimination",
    icon: IconBracket,
    body: "Straight knockout from the first whistle — lose once and you're out. Fastest way to crown a champion.",
  },
  {
    title: "Futsal / indoor",
    icon: IconWhistle,
    body: "Shorter rosters, tighter schedules, indoor courts — Jogo's scheduling adapts field counts and slot lengths to fit.",
  },
];

export default function InquirePage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-black/5 sticky top-0 z-20 bg-white/85 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/tour" className="btn-ghost">
              See how it works
            </Link>
            <Link href="/signup" className="btn-primary">
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-14 pb-8 text-center">
        <span className="badge bg-pitch-400/10 text-pitch-600 border border-pitch-400/20 mb-5">No account needed</span>
        <h1 className="text-display-sm">Not sure Jogo fits your event?</h1>
        <p className="text-black/60 mt-4 max-w-xl mx-auto">
          Browse the formats we support below, or just send us a note about what you&apos;re planning — no sign-up required
          either way.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-16">
        <div className="grid sm:grid-cols-2 gap-x-10 mb-16">
          {formats.map((f, i) => (
            <div key={f.title} className="group relative flex items-start gap-1 py-7 border-t border-black/10 overflow-hidden">
              <span className="font-display text-5xl text-black/[0.06] leading-none shrink-0 -ml-1 select-none" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex-1 -ml-3">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <f.icon className="h-4 w-4 text-pitch-600 shrink-0" />
                  <h3 className="font-semibold text-black">{f.title}</h3>
                </div>
                <p className="text-sm text-black/50 leading-relaxed">{f.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-10 items-start max-w-4xl mx-auto">
          <div>
            <h2 className="text-xl font-semibold mb-2">Ask us anything</h2>
            <p className="text-black/50 text-sm leading-relaxed mb-4">
              Team counts, field availability, a format that doesn&apos;t quite match the list above — send it over and we&apos;ll
              reply by email. Want to poke at the product first instead?
            </p>
            <Link href="/tour" className="text-pitch-600 font-semibold text-sm hover:underline">
              Explore the live interface preview →
            </Link>
          </div>
          <InquiryForm />
        </div>
      </section>

      <footer className="border-t border-black/5">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-black/30">
          <Logo className="text-sm" markClassName="h-5 w-5" />
          <p>© {new Date().getFullYear()} Jogo. Built for organizers, players, and families.</p>
        </div>
      </footer>
    </main>
  );
}
