import Link from "next/link";
import { Logo } from "@/components/Logo";
import { MarketingNav } from "@/components/MarketingNav";
import { InquiryForm } from "@/components/InquiryForm";
import { IconCalendar, IconBracket, IconGrid, IconWhistle } from "@/components/icons";

const NAV_LINKS = [{ href: "/tour", label: "See how it works" }];

const formats = [
  { title: "Round robin", icon: IconCalendar, body: "Every team plays every other, once." },
  { title: "Groups + knockout", icon: IconGrid, body: "Group play, then a seeded bracket." },
  { title: "Single elimination", icon: IconBracket, body: "Lose once and you're out." },
  { title: "Futsal / indoor", icon: IconWhistle, body: "Shorter rosters, tighter schedules." },
];

export default function InquirePage() {
  return (
    <main className="min-h-screen">
      <MarketingNav links={NAV_LINKS} />

      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-14 pb-8 text-center">
        <span className="badge bg-pitch-400/10 text-pitch-600 border border-pitch-400/20 mb-5">No account needed</span>
        <h1 className="text-display-sm">Not sure Jogo fits your event?</h1>
        <p className="text-black/60 mt-4 max-w-xl mx-auto">
          Browse the formats below, or just send us a note.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-16">
        <div className="grid sm:grid-cols-2 gap-x-10 mb-16">
          {formats.map((f, i) => (
            <div key={f.title} className="reveal group relative py-7 border-t border-black/10" data-reveal-delay={i * 80}>
              {/* Absolutely positioned + a padded content column, same as
                  the homepage feature list — a heading that wraps to two
                  lines can never run into the numeral, at any width. */}
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

        <div className="grid lg:grid-cols-2 gap-10 items-start max-w-4xl mx-auto">
          <div className="reveal">
            <h2 className="text-xl font-semibold mb-2">Ask us anything</h2>
            <p className="text-black/50 text-sm leading-relaxed mb-4">
              Team counts, field availability, anything else — send it over and we&apos;ll reply by email.
            </p>
            <Link href="/tour" className="text-pitch-600 font-semibold text-sm hover:underline">
              Explore the live interface preview →
            </Link>
          </div>
          <div className="reveal" data-reveal-delay={120}>
            <InquiryForm />
          </div>
        </div>
      </section>

      <footer className="border-t border-black/5">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-black/30">
          <Logo wordmarkClassName="text-sm" />
          <p>© {new Date().getFullYear()} Jogo. Built for organizers, players, and families.</p>
        </div>
      </footer>
    </main>
  );
}
