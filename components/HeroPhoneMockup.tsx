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
    <div className="[perspective:1400px]">
      <div
        className="relative w-[280px] sm:w-[300px] transition-transform duration-500 lg:[transform:rotateY(-8deg)_rotateX(3deg)] lg:hover:[transform:rotateY(-3deg)_rotateX(1deg)]"
        style={{ filter: "drop-shadow(0 30px 35px rgba(0,0,0,0.8)) drop-shadow(0 10px 12px rgba(0,0,0,0.5))" }}
      >
        {/* The bezel is one step lighter than navy-900 (#1F1F1F vs #111111)
            on purpose — now that the page itself defaults to dark, a bezel
            in the exact same tone as the page background would merge into
            it and the device would lose its "floating object" definition
            that the drop-shadow above is trying to sell. */}
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
              <div className="rounded-xl bg-pitch-400/10 border border-pitch-400/30 p-3 mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pitch-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-pitch-400" />
                  </span>
                  <span className="text-[10px] font-bold text-pitch-400 tracking-wide">LIVE · 62&apos;</span>
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
