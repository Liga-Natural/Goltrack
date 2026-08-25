"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "./Logo";
import { StandingsTable } from "./StandingsTable";
import { BracketView } from "./BracketView";
import { MatchStatusBadge } from "./MatchStatusBadge";
import { IconGrid, IconUsers, IconCalendar, IconPulse, IconWhistle, IconQr } from "./icons";
import type { Tournament, Team, Match, Referee, Player } from "@/lib/models";
import type { StandingRow } from "@/lib/standings";

const tabs = [
  { id: "overview", label: "Overview", icon: IconGrid },
  { id: "teams", label: "Teams", icon: IconUsers },
  { id: "schedule", label: "Schedule & bracket", icon: IconCalendar },
  { id: "scores", label: "Live scores", icon: IconPulse },
  { id: "referees", label: "Referees", icon: IconWhistle },
  { id: "checkin", label: "Check-in", icon: IconQr },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function ProductTour({
  tournament,
  teams,
  matches,
  referees,
  checkedInPlayerIds,
  playersByTeam,
  groups,
  standingsByGroup,
}: {
  tournament: Tournament;
  teams: Team[];
  matches: Match[];
  referees: Referee[];
  checkedInPlayerIds: string[];
  playersByTeam: Record<string, Player[]>;
  groups: string[];
  standingsByGroup: Record<string, StandingRow[]>;
}) {
  const [tab, setTab] = useState<TabId>("overview");
  // Local-only state so the preview feels alive without touching the shared demo data.
  const [localMatches, setLocalMatches] = useState(matches);
  const [localTeams, setLocalTeams] = useState(teams);
  const [localCheckedIn, setLocalCheckedIn] = useState(new Set(checkedInPlayerIds));

  const teamsById = new Map(localTeams.map((t) => [t.id, t]));
  const groupMatches = localMatches.filter((m) => m.stage === "GROUP");
  const knockoutMatches = localMatches.filter((m) => m.stage === "KNOCKOUT");

  function updateScore(matchId: string, patch: Partial<Match>) {
    setLocalMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, ...patch } : m)));
  }

  function togglePaid(teamId: string) {
    setLocalTeams((prev) => prev.map((t) => (t.id === teamId ? { ...t, paid: t.paid ? 0 : 1 } : t)));
  }

  function toggleCheckedIn(playerId: string) {
    setLocalCheckedIn((prev) => {
      const next = new Set(prev);
      next.has(playerId) ? next.delete(playerId) : next.add(playerId);
      return next;
    });
  }

  return (
    <div className="min-h-screen">
      <div className="bg-pitch-400 text-white text-sm font-medium">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2">
          <span>👀 Live interface preview, using real demo data — click around freely, nothing here is saved.</span>
          <Link href="/signup" className="underline decoration-2 underline-offset-2 hover:opacity-80 whitespace-nowrap">
            Create your free account →
          </Link>
        </div>
      </div>

      <div className="flex">
        <aside className="w-60 shrink-0 border-r border-white/5 bg-navy-800/30 flex flex-col sticky top-0 h-[calc(100vh-38px)]">
          <div className="px-4 py-5 border-b border-white/5 flex items-center justify-between">
            <Link href="/">
              <Logo markClassName="h-7 w-7" />
            </Link>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-white/30">Managing (preview)</p>
            {tabs.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`group relative w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all text-left ${
                    active ? "bg-pitch-400/10 text-pitch-400" : "text-white/55 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span
                    className={`absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-full bg-pitch-400 transition-transform origin-center ${
                      active ? "scale-y-100" : "scale-y-0 group-hover:scale-y-50"
                    }`}
                  />
                  <t.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{t.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="px-4 py-4 border-t border-white/5">
            <Link href="/signup" className="btn-primary w-full text-sm">
              Get started free
            </Link>
          </div>
        </aside>

        <main className="flex-1 min-w-0 px-6 sm:px-10 py-8 max-w-5xl">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-6 pb-6 border-b border-white/5">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <h1 className="text-2xl font-semibold">{tournament.name}</h1>
                <span className="badge bg-volt-400/20 text-volt-400">LIVE</span>
              </div>
              <p className="text-white/50 text-sm">
                {tournament.sport} · Groups + knockout · {new Date(tournament.startDate).toLocaleDateString()} ·{" "}
                {tournament.location}
              </p>
            </div>
          </div>

          {tab === "overview" && (
            <div>
              <div className="grid sm:grid-cols-3 gap-4 mb-8">
                <div className="card p-5">
                  <p className="text-xs uppercase tracking-wide text-white/40 mb-1">Teams registered</p>
                  <p className="text-3xl font-semibold">{localTeams.length}</p>
                </div>
                <div className="card p-5">
                  <p className="text-xs uppercase tracking-wide text-white/40 mb-1">Matches scheduled</p>
                  <p className="text-3xl font-semibold">{localMatches.length}</p>
                </div>
                <div className="card p-5">
                  <p className="text-xs uppercase tracking-wide text-white/40 mb-1">Entry fee</p>
                  <p className="text-3xl font-semibold">${(tournament.feeCents / 100).toFixed(0)}</p>
                </div>
              </div>
              <div className="card p-6 mb-6">
                <h2 className="font-semibold mb-1">Public registration link</h2>
                <p className="text-sm text-white/50 mb-3">Share this with team captains so they can register and pay.</p>
                <code className="block bg-navy-800 rounded-lg px-3 py-2 text-sm text-pitch-400 break-all">
                  goltrack.app/t/{tournament.slug}/register
                </code>
              </div>
              <div className="card p-6">
                <h2 className="font-semibold mb-2">Try the other tabs</h2>
                <p className="text-sm text-white/50">
                  Head to <button className="text-pitch-400 underline" onClick={() => setTab("scores")}>Live scores</button> and
                  bump a result, or check a player in from{" "}
                  <button className="text-pitch-400 underline" onClick={() => setTab("checkin")}>Check-in</button> — it's all wired
                  up, just scoped to this preview.
                </p>
              </div>
            </div>
          )}

          {tab === "teams" && (
            <div className="space-y-4">
              {localTeams.map((team) => {
                const players = playersByTeam[team.id] || [];
                return (
                  <div key={team.id} className="card p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-semibold">
                          {team.name}{" "}
                          {team.groupName && <span className="text-white/40 font-normal text-sm">· Group {team.groupName}</span>}
                        </h3>
                        <p className="text-sm text-white/40">
                          {team.contactName} · {team.contactEmail}
                        </p>
                      </div>
                      <button
                        onClick={() => togglePaid(team.id)}
                        className={`badge ${team.paid ? "bg-pitch-400/15 text-pitch-400" : "bg-white/10 text-white/50"}`}
                      >
                        {team.paid ? "Paid ✓" : "Unpaid"}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {players.map((p) => (
                        <span key={p.id} className="text-sm text-white/60">
                          {p.jerseyNumber && <span className="text-white/30 mr-1">#{p.jerseyNumber}</span>}
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "schedule" && (
            <div>
              {groups.length > 0 && (
                <div className="card p-6 mb-6">
                  <h2 className="font-semibold mb-4">Group standings</h2>
                  <div className="grid sm:grid-cols-2 gap-8">
                    {groups.map((g) => (
                      <StandingsTable key={g} rows={standingsByGroup[g]} title={`Group ${g}`} />
                    ))}
                  </div>
                </div>
              )}
              {groupMatches.length > 0 && (
                <div className="card p-6 mb-6">
                  <h2 className="font-semibold mb-4">Group stage fixtures</h2>
                  <div className="space-y-2">
                    {groupMatches.map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-sm border-b border-white/5 pb-2">
                        <div className="flex-1">
                          <span className="text-white/40 text-xs mr-2">{m.round}</span>
                          {teamsById.get(m.homeTeamId || "")?.name || "TBD"} vs {teamsById.get(m.awayTeamId || "")?.name || "TBD"}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono">
                            {m.homeScore ?? "-"} : {m.awayScore ?? "-"}
                          </span>
                          <MatchStatusBadge status={m.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="card p-6">
                <h2 className="font-semibold mb-4">Knockout bracket</h2>
                <BracketView matches={knockoutMatches} teams={localTeams} />
              </div>
            </div>
          )}

          {tab === "scores" && (
            <div className="space-y-2">
              {localMatches.map((m) => (
                <div key={m.id} className="card p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-white/40 mb-0.5">{m.round} · {m.field}</p>
                    <p className="font-medium">
                      {teamsById.get(m.homeTeamId || "")?.name || "TBD"}
                      <span className="text-white/30 mx-2">vs</span>
                      {teamsById.get(m.awayTeamId || "")?.name || "TBD"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <MatchStatusBadge status={m.status} />
                    <input
                      type="number"
                      min={0}
                      className="input w-14 text-center"
                      value={m.homeScore ?? 0}
                      onChange={(e) => updateScore(m.id, { homeScore: Number(e.target.value) })}
                    />
                    <span className="text-white/30">-</span>
                    <input
                      type="number"
                      min={0}
                      className="input w-14 text-center"
                      value={m.awayScore ?? 0}
                      onChange={(e) => updateScore(m.id, { awayScore: Number(e.target.value) })}
                    />
                    <button
                      className="btn-secondary text-xs px-2 py-1.5"
                      onClick={() => updateScore(m.id, { status: "LIVE" })}
                    >
                      Live
                    </button>
                    <button
                      className="btn-primary text-xs px-2 py-1.5"
                      onClick={() => updateScore(m.id, { status: "FINAL" })}
                    >
                      Final
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "referees" && (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-2">
                <h2 className="font-semibold mb-2">Assign referees to matches</h2>
                {localMatches.map((m) => (
                  <div key={m.id} className="card p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-white/40">{m.round} · {m.field}</p>
                      <p className="text-sm font-medium">
                        {teamsById.get(m.homeTeamId || "")?.name || "TBD"} vs {teamsById.get(m.awayTeamId || "")?.name || "TBD"}
                      </p>
                    </div>
                    <select className="input" defaultValue={m.refereeId || ""}>
                      <option value="">Unassigned</option>
                      {referees.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <div>
                <div className="card p-5 sticky top-6">
                  <h3 className="font-semibold mb-3">Referees</h3>
                  <div className="space-y-1.5">
                    {referees.map((r) => (
                      <div key={r.id} className="text-sm text-white/60 border-b border-white/5 pb-1">
                        {r.name} {r.contact && <span className="text-white/30">· {r.contact}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "checkin" && (
            <div className="space-y-3">
              <h2 className="font-semibold mb-1">Team roster check-in</h2>
              {localTeams.map((team) => {
                const players = playersByTeam[team.id] || [];
                const checkedCount = players.filter((p) => localCheckedIn.has(p.id)).length;
                return (
                  <div key={team.id} className="card p-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="font-medium">{team.name}</p>
                      <p className="text-xs text-white/40">
                        {checkedCount}/{players.length} players checked in
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {players.map((p) => {
                        const checked = localCheckedIn.has(p.id);
                        return (
                          <button
                            key={p.id}
                            onClick={() => toggleCheckedIn(p.id)}
                            className={`badge ${checked ? "bg-pitch-400/15 text-pitch-400" : "bg-white/10 text-white/40"}`}
                          >
                            {p.jerseyNumber ? `#${p.jerseyNumber} ` : ""}
                            {p.name.split(" ")[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
