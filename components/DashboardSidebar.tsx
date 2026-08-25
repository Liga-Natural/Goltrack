"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { LogoutButton } from "./LogoutButton";
import { IconGrid, IconUsers, IconCalendar, IconPulse, IconWhistle, IconQr, IconPlus, IconArrowLeft } from "./icons";

const tournamentNav = [
  { href: "", label: "Overview", icon: IconGrid },
  { href: "/teams", label: "Teams", icon: IconUsers },
  { href: "/schedule", label: "Schedule & bracket", icon: IconCalendar },
  { href: "/scores", label: "Live scores", icon: IconPulse },
  { href: "/referees", label: "Referees", icon: IconWhistle },
  { href: "/checkin", label: "Check-in", icon: IconQr },
];

function NavItem({ href, label, icon: Icon, active }: { href: string; label: string; icon: any; active: boolean }) {
  return (
    <Link
      href={href}
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

export function DashboardSidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const match = pathname.match(/^\/dashboard\/tournaments\/([^/]+)/);
  const tournamentId = match && match[1] !== "new" ? match[1] : null;
  const base = tournamentId ? `/dashboard/tournaments/${tournamentId}` : "";

  return (
    <aside className="w-60 shrink-0 border-r border-white/5 bg-navy-800/30 flex flex-col sticky top-0 h-screen">
      <div className="px-4 py-5 border-b border-white/5">
        <Link href="/dashboard">
          <Logo markClassName="h-7 w-7" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {!tournamentId && (
          <>
            <NavItem href="/dashboard" label="Tournaments" icon={IconGrid} active={pathname === "/dashboard"} />
            <NavItem
              href="/dashboard/tournaments/new"
              label="New tournament"
              icon={IconPlus}
              active={pathname === "/dashboard/tournaments/new"}
            />
          </>
        )}

        {tournamentId && (
          <>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white/35 hover:text-white/60 transition-colors mb-1"
            >
              <IconArrowLeft className="h-3.5 w-3.5" />
              All tournaments
            </Link>
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-white/30">Managing</p>
            {tournamentNav.map((item) => {
              const href = `${base}${item.href}`;
              return <NavItem key={item.href} href={href} label={item.label} icon={item.icon} active={pathname === href} />;
            })}
          </>
        )}
      </nav>

      <div className="px-4 py-4 border-t border-white/5 flex items-center justify-between gap-2">
        <span className="text-sm text-white/50 truncate">{userName}</span>
        <LogoutButton />
      </div>
    </aside>
  );
}
