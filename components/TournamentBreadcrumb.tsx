"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { tournamentNav } from "@/lib/dashboardNav";

// Three levels deep (Dashboard > Tournament > Section) is exactly the
// threshold where a breadcrumb starts pulling its weight — especially on
// mobile, where the sidebar (which also shows the current section) is
// hidden behind the hamburger by default.
export function TournamentBreadcrumb({ tournamentId, tournamentName }: { tournamentId: string; tournamentName: string }) {
  const pathname = usePathname();
  const base = `/dashboard/tournaments/${tournamentId}`;
  const suffix = pathname.startsWith(base) ? pathname.slice(base.length) : "";
  const current = tournamentNav.find((item) => item.href === suffix);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-ink3 mb-3">
      <Link href="/dashboard" className="hover:text-inkDisplay min-h-[48px] inline-flex items-center transition-colors">
        Dashboard
      </Link>
      <span aria-hidden="true">/</span>
      {current ? (
        <>
          <Link href={base} className="hover:text-inkDisplay truncate max-w-[10rem] min-h-[48px] inline-flex items-center transition-colors">
            {tournamentName}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-ink2 font-medium">{current.label}</span>
        </>
      ) : (
        <span className="text-ink2 font-medium truncate max-w-[14rem]">{tournamentName}</span>
      )}
    </nav>
  );
}
