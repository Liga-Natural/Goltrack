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
} from "./icons";

const tournamentNav = [
  { href: "", label: "Overview", icon: IconGrid },
  { href: "/teams", label: "Teams", icon: IconUsers },
  { href: "/schedule", label: "Schedule & bracket", icon: IconCalendar },
  { href: "/scores", label: "Live scores", icon: IconPulse },
  { href: "/referees", label: "Referees", icon: IconWhistle },
  { href: "/checkin", label: "Check-in", icon: IconQr },
];

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
      className={`group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
        active ? "bg-pitch-400/10 text-pitch-400" : "text-white/55 hover:text-white hover:bg-white/5"
      }`}
    >
      <span
        className={`absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-full bg-pitch-400 transition-transform origin-center ${
          active ? "scale-y-100" : "scale-y-0 group-hover:scale-y-50"
        }`}
      />
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function DashboardSidebar({ userName, children }: { userName: string; children: React.ReactNode }) {
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
        </>
      )}

      {tournamentId && (
        <>
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white/35 hover:text-white/60 transition-colors mb-1"
          >
            <IconArrowLeft className="h-3.5 w-3.5" />
            All tournaments
          </Link>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-white/30">Managing</p>
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
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3.5 border-b border-white/5 bg-navy-900/90 backdrop-blur">
        <Link href="/dashboard">
          <Logo markClassName="h-6 w-6" />
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="h-9 w-9 flex items-center justify-center rounded-lg border border-white/10 text-white/70 hover:text-white hover:bg-white/5"
        >
          <IconMenu className="h-5 w-5" />
        </button>
      </div>

      {open && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-white/5 bg-navy-800 flex flex-col transition-transform duration-200 lg:static lg:z-auto lg:w-60 lg:shrink-0 lg:bg-navy-800/30 lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-4 py-5 border-b border-white/5 flex items-center justify-between">
          <Link href="/dashboard" onClick={() => setOpen(false)}>
            <Logo markClassName="h-7 w-7" />
          </Link>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="lg:hidden h-8 w-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>

        {nav}

        <div className="px-4 py-4 border-t border-white/5 flex items-center justify-between gap-2">
          <span className="text-sm text-white/50 truncate">{userName}</span>
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-5xl">{children}</main>
    </div>
  );
}
