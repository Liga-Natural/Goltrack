"use client";

import { useState } from "react";
import Link from "next/link";
import { getSportTheme, SPORT_NAMES } from "@/lib/sportTheme";
import type { Tournament } from "@/lib/models";
import { tournamentStatusClass } from "@/lib/statusStyles";


export function TournamentsGrid({ tournaments, teamCounts }: { tournaments: Tournament[]; teamCounts: Record<string, number> }) {
  const [filter, setFilter] = useState<string | null>(null);
  const sportsPresent = SPORT_NAMES.filter((s) => tournaments.some((t) => t.sport === s));
  const visible = filter ? tournaments.filter((t) => t.sport === filter) : tournaments;

  return (
    <div>
      {sportsPresent.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <button
            onClick={() => setFilter(null)}
            className={`badge px-3 py-1.5 transition-colors ${
              filter === null ? "bg-black text-white" : "bg-black/5 text-ink2 hover:bg-black/10"
            }`}
          >
            All sports
          </button>
          {sportsPresent.map((s) => {
            const theme = getSportTheme(s);
            const active = filter === s;
            return (
              <button
                key={s}
                onClick={() => setFilter(active ? null : s)}
                className={`badge px-3 py-1.5 transition-colors ${active ? theme.badge : `${theme.soft} hover:opacity-80`}`}
              >
                {theme.emoji} {theme.label}
              </button>
            );
          })}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="card p-10 text-center text-ink2">No tournaments in this sport yet.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {visible.map((t, i) => {
            const theme = getSportTheme(t.sport);
            const teamCount = teamCounts[t.id] || 0;
            return (
              <Link
                key={t.id}
                href={`/t/${t.slug}`}
                className="reveal card-interactive relative overflow-hidden p-5"
                data-reveal-delay={Math.min(i % 6, 5) * 70}
              >
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${theme.dot}`} />
                <div className="flex items-center justify-between mb-3 mt-1">
                  <span className={`badge ${theme.soft}`}>
                    {theme.emoji} {theme.label}
                  </span>
                  <span className={`badge ${tournamentStatusClass(t.status)}`}>{t.status.replace("_", " ")}</span>
                </div>
                <h3 className="font-semibold text-black mb-1.5">{t.name}</h3>
                <p className="text-sm text-ink2 mb-3">
                  {new Date(t.startDate).toLocaleDateString()}
                  {t.location ? ` · ${t.location}` : ""}
                </p>
                <p className="text-xs text-ink3">
                  {teamCount} team{teamCount === 1 ? "" : "s"} registered
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
