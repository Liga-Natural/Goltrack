"use client";

import { useEffect, useState } from "react";
import { IconClipboard, IconCalendar, IconBracket, IconWhistle, IconUsers, IconQr, IconCheckShield, IconPulse, IconGrid } from "./icons";
import { ROLE_KEYS, ROLE_HANDOFF_KEY } from "./RoleNav";

const ROLES = [
  {
    label: "For Tournament Directors",
    features: [
      { title: "Registration & payments", body: "Teams sign up and pay online.", icon: IconClipboard },
      { title: "Auto-balanced scheduling", body: "Fixtures generated in seconds.", icon: IconCalendar },
      { title: "Brackets that build themselves", body: "Seeded automatically from standings.", icon: IconBracket },
      { title: "Referee management", body: "Assign officials, track contacts.", icon: IconWhistle },
    ],
  },
  {
    label: "For Team Managers & Coaches",
    features: [
      { title: "Rosters, one screen", body: "Every player and team, always current.", icon: IconUsers },
      { title: "Schedule & live scores", body: "Know the next match, see the last one.", icon: IconCalendar },
      { title: "Digital player passports", body: "QR-verified ID for every player.", icon: IconQr },
      { title: "Match-day check-in", body: "Scan passports — no clipboard.", icon: IconCheckShield },
    ],
  },
  {
    label: "For Players & Families",
    features: [
      { title: "Live scores, any phone", body: "Follow every match in real time.", icon: IconPulse },
      { title: "Digital passport", body: "Your player ID, always with you.", icon: IconQr },
      { title: "Full schedule", body: "Know when and where to be.", icon: IconCalendar },
      { title: "Team & standings", body: "See how your team's doing.", icon: IconGrid },
    ],
  },
];

// Playmetrics-style role switcher: the same underlying system reads
// differently depending on who's looking at it, so instead of one flat
// feature list trying to speak to organizers, coaches, and parents at
// once, each audience gets the four things that actually matter to them.
export function RoleTabs() {
  const [active, setActive] = useState(0);
  const role = ROLES[active];

  // RoleNav (the header's Organizers/Teams/Players pill switcher, visible
  // on every marketing page) hands off which role the visitor picked via
  // sessionStorage rather than a URL query param — reading it in a plain
  // useEffect keeps this entirely client-side, so it never forces this
  // otherwise-static homepage into dynamic rendering the way useSearchParams
  // would (that hook requires a Suspense boundary to avoid a full-page SSR
  // bailout). Cleared immediately after reading so it's a one-shot handoff,
  // not a sticky preference that would surprise a later, unrelated visit.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(ROLE_HANDOFF_KEY);
      if (saved) sessionStorage.removeItem(ROLE_HANDOFF_KEY);
    } catch {
      return;
    }
    const idx = ROLE_KEYS.indexOf(saved as (typeof ROLE_KEYS)[number]);
    if (idx !== -1) setActive(idx);
  }, []);

  return (
    <div>
      <div className="reveal inline-flex flex-wrap items-center gap-1 bg-black/5 rounded-full p-1 mb-10 text-xs sm:text-sm font-semibold">
        {ROLES.map((r, i) => (
          <button
            key={r.label}
            type="button"
            onClick={() => setActive(i)}
            aria-pressed={active === i}
            className={`rounded-full px-3.5 sm:px-4 py-2 transition-colors ${
              active === i ? "bg-pitch-400 text-white" : "text-black/50 hover:text-black"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/*
        No .reveal here (unlike the flat section this replaced): those
        classes only fade in via ScrollReveal's IntersectionObserver, which
        rescans the DOM on route change but not on a same-page state update
        like a tab click. This grid remounts fresh elements on every click
        while already in view, so they'd never get observed and would sit
        permanently at opacity:0 (data-reveal-armed hides .reveal by
        default). Renders at full opacity immediately instead — correct
        anyway, since the section is already on-screen when a tab is
        clicked.
      */}
      <div className="grid sm:grid-cols-2 gap-x-10">
        {role.features.map((f, i) => (
          <div key={f.title} className="group relative py-7 border-t border-black/10">
            {/* Ghost numeral out of the text flow — see the equivalent note
                on the earlier flat-list version this replaced: as an inline
                sibling it collides with any heading that wraps to two lines. */}
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
  );
}
