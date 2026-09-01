"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { LogoutButton } from "./LogoutButton";
import {
  IconGrid,
  IconUsers,
  IconCalendar,
  IconPulse,
  IconWhistle,
  IconQr,
  IconPlus,
  IconArrowLeft,
  IconMenu,
  IconX,
  IconPalette,
  IconClipboard,
  IconMail,
} from "./icons";
import { tournamentNav as tournamentNavBase } from "@/lib/dashboardNav";

// Keyed by href, not by array position. The previous version zipped
// tournamentNavBase against a parallel icon array by index, so inserting a
// nav item silently shifted every icon onto the wrong label and left the
// last entry with `icon: undefined` — which renders as <undefined /> and
// throws. Keying means a new page just needs its own entry here.
const navIcons: Record<string, any> = {
  "": IconGrid,
  "/applications": IconClipboard,
  "/teams": IconUsers,
  "/schedule": IconCalendar,
  "/scores": IconPulse,
  "/finance": IconMail,
  "/referees": IconWhistle,
  "/gamecards": IconClipboard,
  "/checkin": IconQr,
};
const tournamentNav = tournamentNavBase.map((item) => ({ ...item, icon: navIcons[item.href] ?? IconGrid }));

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: any;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      // Active state is carried by surface brightness, not hue — the red is
      // reserved for the wordmark, so an active item is simply the one lit
      // panel in the rail rather than the one coloured one.
      className={`group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-300 ${
        active ? "bg-black/10 text-black font-semibold" : "text-ink2 hover:text-black hover:bg-black/5"
      }`}
    >
      <span
        className={`absolute left-0 top-1/2 -translate-y-1/2 h-full w-1 rounded-r bg-black/60 transition-transform origin-center ${
          active ? "scale-y-100" : "scale-y-0 group-hover:scale-y-50"
        }`}
      />
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function DashboardSidebar({
  userName,
  children,
  topBar,
}: {
  userName: string;
  children: React.ReactNode;
  topBar?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const match = pathname.match(/^\/dashboard\/tournaments\/([^/]+)/);
  const tournamentId = match && match[1] !== "new" ? match[1] : null;
  const base = tournamentId ? `/dashboard/tournaments/${tournamentId}` : "";

  // Close the mobile drawer whenever the route actually changes.
  useEffect(() => setOpen(false), [pathname]);

  const nav = (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
      {!tournamentId && (
        <>
          <NavItem href="/dashboard" label="Tournaments" icon={IconGrid} active={pathname === "/dashboard"} onNavigate={() => setOpen(false)} />
          <NavItem
            href="/dashboard/tournaments/new"
            label="New tournament"
            icon={IconPlus}
            active={pathname === "/dashboard/tournaments/new"}
            onNavigate={() => setOpen(false)}
          />
          <NavItem
            href="/dashboard/settings"
            label="Branding"
            icon={IconPalette}
            active={pathname === "/dashboard/settings"}
            onNavigate={() => setOpen(false)}
          />
        </>
      )}

      {tournamentId && (
        <>
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink3 hover:text-black transition-colors mb-1"
          >
            <IconArrowLeft className="h-3.5 w-3.5" />
            All tournaments
          </Link>
          <p className="px-3 pb-2 text-[11px] font-extrabold uppercase tracking-widest text-ink3">Managing</p>
          {tournamentNav.map((item) => {
            const href = `${base}${item.href}`;
            return (
              <NavItem
                key={item.href}
                href={href}
                label={item.label}
                icon={item.icon}
                active={pathname === href}
                onNavigate={() => setOpen(false)}
              />
            );
          })}
        </>
      )}
    </nav>
  );

  return (
    <div className="lg:flex min-h-screen">
      {/* Mobile header: glass over the abyss rather than a near-solid rail
          colour. bg-white/40 is the spec's "bg-black/40" — Tailwind's `white`
          key is remapped onto --paper (the canvas) and `black` onto --ink, so
          writing bg-black/40 literally would render 40% *white* in dark mode,
          the exact inverse of the intended glass. */}
      <div className="lg:hidden print:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3.5 border-b border-line bg-white/40 backdrop-blur-xl">
        <Link href="/dashboard">
          <Logo wordmarkClassName="text-lg" />
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="h-9 w-9 flex items-center justify-center rounded-lg border border-line text-ink2 hover:text-black hover:bg-black/5"
        >
          <IconMenu className="h-5 w-5" />
        </button>
      </div>

      {/* Literal rgba, not bg-black/60: Tailwind's `black` key is remapped onto
          --ink here, which is *white* in dark mode — so this scrim was painting
          a white flash over the page instead of dimming it. A scrim has to
          darken in both themes, which no theme-following token can do. */}
      {open && <div className="fixed inset-0 z-40 bg-[rgba(0,0,0,0.6)] lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-line bg-sidebar flex flex-col transition-transform duration-200 lg:static lg:z-auto lg:w-60 lg:shrink-0 lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-4 py-5 border-b border-line flex items-center justify-between">
          <Link href="/dashboard" onClick={() => setOpen(false)}>
            <Logo wordmarkClassName="text-xl" />
          </Link>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="lg:hidden h-8 w-8 flex items-center justify-center rounded-lg text-black/50 hover:text-black"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>

        {nav}

        <div className="px-4 py-4 border-t border-line flex items-center justify-between gap-2">
          <span className="text-sm text-ink2 truncate">{userName}</span>
          <LogoutButton />
        </div>
      </aside>

      {/* The bar sits inside the content column, not above the whole shell,
          so it scrolls with the page it belongs to and the sidebar keeps its
          own full height. print:hidden for the same reason as the rest of
          the chrome. */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="hidden lg:block print:hidden">{topBar}</div>
        <main className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-5xl w-full">{children}</main>
      </div>
    </div>
  );
}
