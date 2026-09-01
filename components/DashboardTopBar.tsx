"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Logo } from "./Logo";
import { IconBell, IconPlus, IconMail, IconPalette } from "./icons";

export interface QuickJumpItem {
  id: string;
  name: string;
  sport: string;
  status: string;
}

// Header bar for the organizer shell.
//
// Search and the bell are wired to real data rather than rendered as
// furniture. The search filters the organizer's own tournaments, which are
// already loaded server-side and passed down — no endpoint, no debounce, no
// spinner, and it works offline. The bell counts applications genuinely
// awaiting review; with none, it shows no badge instead of a decorative dot.
export function DashboardTopBar({
  userName,
  role,
  tournaments,
  pendingCount,
}: {
  userName: string;
  role: string;
  tournaments: QuickJumpItem[];
  pendingCount: number;
}) {
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);

  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return tournaments.filter((t) => t.name.toLowerCase().includes(needle)).slice(0, 6);
  }, [q, tournaments]);

  const initials = userName
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/40 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3">
        <Link href="/dashboard" className="shrink-0">
          <Logo wordmarkClassName="text-lg" />
        </Link>

        {/* Quick jump. Kept to md+ because on a phone the header already
            carries the drawer toggle and the brand; a search field there
            would push both off the line. */}
        <div className="relative hidden md:block flex-1 max-w-md mx-auto">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setFocused(true)}
            // Blur is delayed so a click on a result registers before the
            // list unmounts — otherwise the link never fires.
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="Search your tournaments…"
            aria-label="Search tournaments"
            className="w-full rounded-full bg-black/[0.05] border border-line px-4 py-1.5 text-sm placeholder:text-ink3 focus:outline-none focus:border-black/25 transition-colors"
          />
          {focused && hits.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 modal-panel rounded-xl p-1.5 z-50">
              {hits.map((t) => (
                <Link
                  key={t.id}
                  href={`/dashboard/tournaments/${t.id}`}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-black/[0.06] transition-colors"
                >
                  <span className="text-sm font-semibold truncate min-w-0 flex-1">{t.name}</span>
                  <span className="badge text-[10px] shrink-0">{t.sport}</span>
                </Link>
              ))}
            </div>
          )}
          {focused && q.trim() && hits.length === 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 modal-panel rounded-xl px-3 py-2.5 z-50">
              <p className="text-xs text-ink3">No tournament matches “{q.trim()}”.</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          <Link
            href="/dashboard"
            aria-label={pendingCount > 0 ? `${pendingCount} applications awaiting review` : "Notifications"}
            className="relative h-9 w-9 flex items-center justify-center rounded-full border border-line text-ink2 hover:text-black hover:bg-black/[0.04] transition-colors"
          >
            <IconBell className="h-4 w-4" />
            {pendingCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[1.05rem] h-[1.05rem] px-1 rounded-full bg-pitch-400 text-white text-[10px] font-bold flex items-center justify-center">
                {pendingCount > 9 ? "9+" : pendingCount}
              </span>
            )}
          </Link>

          <Link
            href="/dashboard/tournaments/new"
            className="btn-secondary text-xs hidden sm:inline-flex shrink-0"
          >
            <IconPlus className="h-3.5 w-3.5" />
            New event
          </Link>
          <Link
            href="/dashboard/settings"
            aria-label="Branding settings"
            className="h-9 w-9 flex items-center justify-center rounded-full border border-line text-ink2 hover:text-black hover:bg-black/[0.04] transition-colors"
          >
            <IconPalette className="h-4 w-4" />
          </Link>

          <div className="flex items-center gap-2 rounded-full border border-line pl-1 pr-3 py-1 ml-1">
            <span className="relative h-7 w-7 rounded-full bg-black/[0.08] flex items-center justify-center text-[10px] font-extrabold shrink-0">
              {initials}
              {/* Green dot means signed in, which is the only status this app
                  actually knows about a user. */}
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-volt-400 border-2 border-sidebar" />
            </span>
            <span className="min-w-0 hidden lg:block">
              <span className="block text-xs font-semibold truncate max-w-[9rem]">{userName}</span>
              <span className="block text-[10px] text-ink3 truncate">{role.replace("_", " ").toLowerCase()}</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
