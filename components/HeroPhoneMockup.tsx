import Link from "next/link";
import { IconMenu, IconBell } from "./icons";

const matches = [
  { home: "Coastal FC", away: "Riverside SC", time: "18:00", field: "Field 2", homeInit: "CF", awayInit: "RS" },
  { home: "Sunset FC", away: "Ironclad", time: "19:15", field: "Field 1", homeInit: "SF", awayInit: "IC" },
];

// A phone-frame mockup, not a screenshot — built in CSS so it stays crisp at
// any size and rides the site's real ink/paper/red variables (a static image
// would freeze in whatever theme was live when it was made, and would fake
// data that a real screen elsewhere on the site actually renders live).
// Content is stylized/representative like the ticket cards elsewhere on the
// site, not a pixel copy of any real page's layout.
export function HeroPhoneMockup() {
  return (
    // surface-light pins --ink/--paper to fixed light values regardless of
    // the site's theme. Necessary here, not just cosmetic: text-white,
    // bg-black, and border-white/X below are meant as literal phone-screen
    // colors, but Tailwind's black/white keys are redefined sitewide to
    // read --ink/--paper (see tailwind.config.ts) so the theme toggle can
    // recolor bg-white/text-black everywhere. Left unpinned, dark mode
    // flips --paper to a dark value and --ink to a light one, so
    // "text-white" silently turns dark-on-dark and "bg-black" turns
    // light-on-dark inside this component's own always-dark UI — nearly
    // invisible. Same fix as the passport page's .surface-light, applied
    // for the opposite reason (a self-contained dark screenshot rather
    // than print legibility).
    <div className="hero-phone-container surface-light">
      <div className="hero-phone-card relative w-[280px] sm:w-[300px]">
        {/* The bezel is one step lighter than navy-900 (#1F1F1F vs #111111)
            so the device's own edge stays visible against its dark screen —
            a real phone's bezel is never the exact same black as its
            display. The mockup's screen is deliberately always dark
            (surface-light above pins it that way regardless of the site's
            own light/dark toggle) — a dark device photographed against the
            site's white page is the same "hero product shot" language
            Apple/Nike-style pages use, not a mismatch to fix. */}
        <div className="relative rounded-[2.75rem] bg-[#1F1F1F] p-2.5 border border-white/10">
          <div className="relative overflow-hidden rounded-[2.1rem] bg-navy-900 pb-5">
            {/* Status bar + notch */}
            <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[10px] font-medium text-white/70">
              <span>9:41</span>
              <div className="absolute left-1/2 top-2 -translate-x-1/2 h-5 w-24 rounded-full bg-black" />
              <span>100%</span>
            </div>

            {/* App header */}
            <div className="flex items-center justify-between px-5 pt-3 pb-4">
              <IconMenu className="h-4 w-4 text-white/50" />
              <span className="font-logo text-lg font-bold text-white">
                Jogo<span className="text-pitch-400">.</span>
              </span>
              <span className="relative">
                <IconBell className="h-4 w-4 text-white/50" />
                <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-pitch-400" />
              </span>
            </div>

            <div className="px-5">
              <p className="text-[10px] uppercase tracking-[0.15em] text-white/35 mb-0.5">Coastal Cup</p>
              <h3 className="font-display text-xl text-white leading-tight mb-3">Schedule &amp; scores</h3>

              {/* Filter tabs */}
              <div className="flex items-center gap-1 bg-white/[0.06] rounded-full p-1 mb-4 text-[11px] font-semibold">
                <span className="flex-1 text-center rounded-full bg-pitch-400 text-white py-1.5">All</span>
                <span className="flex-1 text-center text-white/40 py-1.5">Upcoming</span>
                <span className="flex-1 text-center text-white/40 py-1.5">Live</span>
              </div>

              {/* Upcoming match card — stacked rows, same pattern as the
                  live card below, not a 3-part "home vs away" row. That
                  squeezed team names into mid-word wraps ("Coastal" / "FC")
                  at this card's fixed width. */}
              <div className="rounded-xl bg-[#1A1A1A] border border-white/10 p-3 mb-3 text-xs">
                <p className="text-[10px] text-white/35 mb-2">{matches[0].time} · {matches[0].field}</p>
                <div className="flex items-center gap-1.5 text-white/85 mb-1.5">
                  <span className="h-5 w-5 shrink-0 rounded-full bg-pitch-400/20 text-pitch-400 text-[9px] font-bold flex items-center justify-center">
                    {matches[0].homeInit}
                  </span>
                  {matches[0].home}
                </div>
                <div className="flex items-center gap-1.5 text-white/85 mb-3">
                  <span className="h-5 w-5 shrink-0 rounded-full bg-white/10 text-white/60 text-[9px] font-bold flex items-center justify-center">
                    {matches[0].awayInit}
                  </span>
                  {matches[0].away}
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-center rounded-full bg-pitch-400 text-white text-[10px] font-bold py-1.5">
                    View Details
                  </span>
                  <span className="flex-1 text-center rounded-full border border-white/25 text-white/80 text-[10px] font-bold py-1.5">
                    Match Center
                  </span>
                </div>
              </div>

              {/* Live section */}
              <p className="text-[10px] uppercase tracking-[0.15em] text-white/35 mb-2 mt-4">Live now</p>
              <div className="rounded-xl bg-volt-400/10 border border-volt-400/30 p-3 mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-volt-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-volt-400" />
                  </span>
                  <span className="text-[10px] font-bold text-volt-500 tracking-wide">LIVE · 62&apos;</span>
                </div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-white">
                    <span className="h-5 w-5 shrink-0 rounded-full bg-white/10 text-white/70 text-[9px] font-bold flex items-center justify-center">
                      MU
                    </span>
                    Miami United
                  </span>
                  <span className="font-score text-base text-white">2 - 1</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm font-medium text-white mb-3">
                  <span className="h-5 w-5 shrink-0 rounded-full bg-white/10 text-white/70 text-[9px] font-bold flex items-center justify-center">
                    BS
                  </span>
                  Broward SC
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-center rounded-full bg-pitch-400 text-white text-[10px] font-bold py-1.5">
                    View Details
                  </span>
                  <span className="flex-1 text-center rounded-full border border-white/25 text-white/80 text-[10px] font-bold py-1.5">
                    Match Center
                  </span>
                </div>
              </div>

              <Link
                href="/signup"
                className="block w-full text-center rounded-full bg-pitch-400 text-white text-xs font-bold uppercase tracking-wide py-3"
              >
                Create new tournament
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
