"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "", label: "Overview" },
  { href: "/teams", label: "Teams" },
  { href: "/schedule", label: "Schedule & bracket" },
  { href: "/scores", label: "Live scores" },
  { href: "/referees", label: "Referees" },
  { href: "/checkin", label: "Check-in" },
];

export function TournamentTabs({ tournamentId }: { tournamentId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/tournaments/${tournamentId}`;

  return (
    <div className="flex flex-wrap gap-1 border-b border-white/5 mb-6 -mx-1">
      {tabs.map((tab) => {
        const href = `${base}${tab.href}`;
        const active = pathname === href;
        return (
          <Link
            key={tab.href}
            href={href}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg mx-1 ${
              active ? "text-pitch-400 border-b-2 border-pitch-400" : "text-white/50 hover:text-white/80"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
