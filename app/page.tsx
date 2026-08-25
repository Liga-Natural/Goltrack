import Link from "next/link";
import { Logo, LogoMark } from "@/components/Logo";

const features = [
  {
    title: "Registration & payments",
    body: "Teams sign up online, submit rosters, and pay fees before they ever set foot on your field.",
  },
  {
    title: "Auto-balanced scheduling",
    body: "Generate group-stage fixtures across every field and time slot in seconds — no spreadsheets.",
  },
  {
    title: "Brackets that build themselves",
    body: "Knockout brackets seed automatically from live standings once group play wraps.",
  },
  {
    title: "Live scoring, public standings",
    body: "Enter results from the sideline; parents and coaches watch tables update in real time.",
  },
  {
    title: "Referee management",
    body: "Assign officials to matches and keep contact info and match reports in one place.",
  },
  {
    title: "Digital player passports",
    body: "Every player gets a QR-verified digital ID with a career timeline across every tournament.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-white/5">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <Logo />
          <nav className="flex items-center gap-2">
            <Link href="/login" className="btn-ghost">
              Log in
            </Link>
            <Link href="/signup" className="btn-primary">
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="max-w-2xl">
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
            <Link href="/t/coastal-cup" className="btn-secondary text-base px-6 py-3">
              View a live demo tournament →
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-white/5 bg-navy-800/40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
          <h2 className="text-2xl font-semibold mb-2">Everything organizers need, connected end to end</h2>
          <p className="text-white/50 mb-10 max-w-2xl">
            Registration feeds scheduling, scheduling feeds live scores, and live scores populate every player&apos;s
            passport — one system instead of five spreadsheets and a group chat.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.title} className="card p-5">
                <h3 className="font-semibold text-white mb-1.5">{f.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20 text-center">
        <LogoMark className="h-10 w-10 mx-auto mb-5" />
        <h2 className="text-2xl sm:text-3xl font-semibold mb-3">Ready to run your next event on GolTrack?</h2>
        <p className="text-white/50 mb-8 max-w-xl mx-auto">
          Set up a tournament, open registration, and have a full bracket ready before your first team even checks in.
        </p>
        <Link href="/signup" className="btn-primary text-base px-6 py-3">
          Get started free
        </Link>
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
