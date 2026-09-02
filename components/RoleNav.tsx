"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const ROLE_KEYS = ["organizers", "teams", "players"] as const;
export const ROLE_HANDOFF_KEY = "jogo-role-handoff";

const ROLES: { key: (typeof ROLE_KEYS)[number]; label: string }[] = [
  { key: "organizers", label: "Organizers" },
  { key: "teams", label: "Teams" },
  { key: "players", label: "Players" },
];

// Floating pill switcher in the main marketing header — a persistent,
// site-wide counterpart to the homepage's own RoleTabs, which only lives
// inside the "Built for whoever's looking" section. Every pill sends the
// visitor to that section (scrolling there via the #roles anchor) and hands
// off which role it should open on, via RoleTabs.tsx's sessionStorage read.
// Only ever styled active in this component's own local state — this header
// instance doesn't track which tab is actually open on the homepage (that
// would need URL or storage round-tripping in both directions), so it
// resets to "Organizers" highlighted on every page load, matching how it's
// shown as a static default anywhere but the homepage itself.
export function RoleNav() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  function handleClick(key: string) {
    try {
      sessionStorage.setItem(ROLE_HANDOFF_KEY, key);
    } catch {
      // sessionStorage can throw in a locked-down/private-browsing context;
      // the link below still navigates and scrolls, it just won't
      // pre-select a specific tab once it gets there.
    }
  }

  return (
    <div className="hidden xl:inline-flex items-center gap-1 p-1 rounded-full border border-hairline bg-surface">
      {ROLES.map((r, i) => (
        <Link
          key={r.key}
          href={isHome ? "#roles" : `/#roles`}
          onClick={() => handleClick(r.key)}
          className={`text-xs font-semibold px-3.5 min-h-[48px] inline-flex items-center rounded-full transition-colors ${
            // pitch-700 with a literal white, matching .btn-primary. On
            // pitch-400 with `text-white` this pill was 2.9:1 — the accent's
            // bright stop is a fill for tints, never a ground for text, and
            // Tailwind's `white` key is remapped onto --paper here so it was
            // cream rather than white on top of that.
            i === 0 ? "bg-pitch-700 text-[#ffffff]" : "text-ink2 hover:text-black"
          }`}
        >
          {r.label}
        </Link>
      ))}
    </div>
  );
}
