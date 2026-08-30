"use client";

import { useState } from "react";

export interface TabDef {
  key: string;
  label: string;
  /** Optional count shown beside the label (teams, fixtures, etc). */
  count?: number;
  /** Rendered on the server and handed down as a prop — a client component
      can render server-rendered JSX it receives, so the panels stay server
      components and no data fetching moves to the browser. */
  panel: React.ReactNode;
}

// Underlined tab bar with inline panels. The point is that the data lives on
// the page you're already on rather than behind a navigation: an organizer
// mid-event wants standings, then the schedule, then results, in the space
// of a few seconds, and a route change per look is three page loads too
// many.
//
// State is deliberately local and uncontrolled — no query param. Putting the
// active tab in the URL would make every one of these pages dynamic (the
// dashboard overview is already dynamic, but the public tournament page is
// statically rendered with revalidate:5, and useSearchParams would force it
// into a Suspense boundary and a client bailout). The tradeoff is that the
// tab resets on reload, which for a glanceable panel is the right side of
// the trade.
export function TabPanel({ tabs, className = "" }: { tabs: TabDef[]; className?: string }) {
  const [active, setActive] = useState(tabs[0]?.key);
  const current = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div className={className}>
      {/* overflow-x-auto + shrink-0: with four or five tabs this overflows a
          390px phone, and the alternative (wrapping to two rows) turns a
          navigation strip into a block of text. Scrolling is what every
          native app does here. */}
      <div
        role="tablist"
        className="flex items-center gap-6 overflow-x-auto border-b border-line -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((t) => {
          const on = t.key === current?.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(t.key)}
              // -mb-px pulls each tab's own bottom border down onto the
              // strip's border-b so the active underline replaces that line
              // rather than stacking a second rule under it.
              className={`shrink-0 -mb-px border-b-2 pb-2.5 pt-1 text-sm font-semibold transition-colors ${
                on ? "border-black text-black" : "border-transparent text-ink2 hover:text-black"
              }`}
            >
              {t.label}
              {typeof t.count === "number" && (
                <span className={`ml-1.5 text-xs font-medium ${on ? "text-ink2" : "text-ink3"}`}>{t.count}</span>
              )}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="pt-5">
        {current?.panel}
      </div>
    </div>
  );
}
