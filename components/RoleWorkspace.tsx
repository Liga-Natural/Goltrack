"use client";

import { useState } from "react";

// PHASE 1 WIREFRAMES.
//
// Everything below this line renders from the constants in this file, not
// from the database. The schema has no tables for trialists, evaluations,
// training sessions, attendance, fitness metrics, guardian links or
// lineups, and this mandate explicitly scopes Phase 1 to the UI shell with
// database models off-limits — so these are the layouts and interactions,
// deliberately not a data layer pretending to be one.
//
// The interactions that *are* real are the front-end ones: switching roles,
// switching child, and marking attendance all update local state and
// re-render, so the flow can be walked through. Nothing persists across a
// reload, and it shouldn't be read as if it does.
const SAMPLE = {
  trialists: [
    { name: "Marco Silva", pos: "Winger", age: "U14", rating: 4, note: "Quick over 10m, needs weak foot work." },
    { name: "Ana Beltrán", pos: "Centre-back", age: "U14", rating: 5, note: "Reads the game early. Invite." },
    { name: "Tomas Reyes", pos: "Keeper", age: "U13", rating: 3, note: "Good hands, distribution inconsistent." },
  ],
  squad: [
    { name: "Alex Moreno", num: "10" },
    { name: "Jordan Pike", num: "7" },
    { name: "Sam Okafor", num: "4" },
    { name: "Riley Chen", num: "1" },
    { name: "Noa Fischer", num: "9" },
  ],
  metrics: [
    { label: "Vertical jump", value: "58", unit: "cm", delta: "+4", series: [38, 42, 45, 44, 50, 54, 58] },
    { label: "40m sprint", value: "5.12", unit: "s", delta: "−0.18", series: [62, 58, 57, 54, 50, 46, 42] },
    { label: "Stamina (yo-yo)", value: "17.4", unit: "lvl", delta: "+1.2", series: [30, 34, 33, 40, 46, 52, 57] },
  ],
  sessions: [
    { when: "Tue 18:00", what: "Technical — first touch", where: "Pitch 2" },
    { when: "Thu 18:00", what: "Pressing shape", where: "Pitch 1" },
    { when: "Sat 09:30", what: "Matchday warm-up", where: "Magic City" },
  ],
  children: [
    { name: "Alex Moreno", team: "Riverside Rovers U14", initials: "AM" },
    { name: "Mia Moreno", team: "Riverside Rovers U11", initials: "MM" },
  ],
};

const ROLES = ["Organizer", "Coach/Manager", "Player", "Parent", "Guest"] as const;
type Role = (typeof ROLES)[number];

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

// A sparkline drawn as an inline SVG polyline. No chart library: seven
// points on a 100x32 viewBox is a handful of arithmetic, and pulling in a
// charting dependency for it would cost more than the feature.
function Spark({ series }: { series: number[] }) {
  const max = Math.max(...series);
  const min = Math.min(...series);
  const span = max - min || 1;
  const pts = series
    .map((v, i) => `${(i / (series.length - 1)) * 100},${32 - ((v - min) / span) * 28 - 2}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="w-full h-8 mt-3" aria-hidden="true">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function CoachView() {
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const cycle = (name: string) => {
    const order = ["", "in", "late", "out"];
    setAttendance((a) => ({ ...a, [name]: order[(order.indexOf(a[name] || "") + 1) % order.length] }));
  };
  const label: Record<string, string> = { "": "—", in: "Attending", late: "Late", out: "Absent" };

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-3 gap-4">
        {SAMPLE.metrics.map((m) => (
          <div key={m.label} className="card p-5">
            <p className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-1">{m.label}</p>
            <div className="flex items-baseline gap-2">
              <p className="font-score text-3xl text-inkDisplay leading-none">{m.value}</p>
              <span className="text-xs text-ink3">{m.unit}</span>
              <span className="text-xs font-semibold text-volt-500 ml-auto">{m.delta}</span>
            </div>
            <div className="text-ink3">
              <Spark series={m.series} />
            </div>
          </div>
        ))}
      </div>

      <Panel title="Training attendance" action={<span className="text-xs text-ink3">Tue 18:00 · Pitch 2</span>}>
        <div className="divide-y divide-lineSoft">
          {SAMPLE.squad.map((p) => {
            const st = attendance[p.name] || "";
            return (
              <div key={p.name} className="flex items-center gap-3 py-3">
                <span className="font-score text-sm text-ink3 w-8 shrink-0">#{p.num}</span>
                <span className="text-sm font-semibold truncate min-w-0 flex-1">{p.name}</span>
                <button
                  type="button"
                  onClick={() => cycle(p.name)}
                  aria-label={`Cycle attendance for ${p.name}`}
                  className={`badge text-[10px] shrink-0 transition-colors ${
                    st === "in" ? "badge-live" : st === "late" ? "text-warning-500 border-warning-500/40" : ""
                  }`}
                >
                  {label[st]}
                </button>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="Trials &amp; scouting">
        <div className="divide-y divide-lineSoft">
          {SAMPLE.trialists.map((t) => (
            <div key={t.name} className="py-3">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{t.name}</p>
                  <p className="text-xs text-ink3 truncate">{t.pos} · {t.age} · {t.note}</p>
                </div>
                <span className="text-xs text-ink2 shrink-0" aria-label={`${t.rating} out of 5`}>
                  {"★".repeat(t.rating)}<span className="text-ink3">{"★".repeat(5 - t.rating)}</span>
                </span>
                <button type="button" className="btn-ghost text-xs shrink-0">Invite</button>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Matchday lineup" action={<span className="text-xs text-ink3">4-3-3</span>}>
        {/* The pitch is drawn with layout, not an image: rows of positions on
            a bordered surface, so it reflows on a phone instead of being a
            fixed-ratio graphic that shrinks to unreadable. */}
        <div className="rounded-2xl border border-line p-4 sm:p-6 space-y-6">
          {[["LW", "ST", "RW"], ["LM", "CM", "RM"], ["LB", "CB", "CB", "RB"], ["GK"]].map((row, i) => (
            <div key={i} className="flex justify-center gap-2 sm:gap-3">
              {row.map((pos, j) => (
                <div
                  key={`${pos}-${j}`}
                  className="h-14 w-14 sm:h-16 sm:w-16 rounded-full border border-line bg-black/[0.04] flex items-center justify-center text-[11px] font-extrabold text-ink2"
                >
                  {pos}
                </div>
              ))}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function PlayerView() {
  const [rsvp, setRsvp] = useState<Record<number, string>>({});
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center gap-4 mb-5">
          <div className="h-14 w-14 rounded-full bg-black/[0.06] border border-line flex items-center justify-center font-score text-lg">
            10
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold text-inkDisplay truncate">Alex Moreno</h2>
            <p className="text-xs text-ink3">Riverside Rovers U14 · Winger</p>
          </div>
          <div className="ml-auto text-right shrink-0">
            <p className="text-[11px] uppercase tracking-wide text-ink2 font-semibold">Readiness</p>
            <p className="font-score text-2xl text-volt-500 leading-none">86</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 pt-5 border-t border-lineSoft">
          {SAMPLE.metrics.map((m) => (
            <div key={m.label} className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-1 truncate">{m.label}</p>
              <p className="font-score text-xl text-inkDisplay leading-none">
                {m.value}
                <span className="text-xs text-ink3 ml-1">{m.unit}</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      <Panel title="Training RSVP">
        <div className="divide-y divide-lineSoft">
          {SAMPLE.sessions.map((s, i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{s.what}</p>
                <p className="text-xs text-ink3 truncate">{s.when} · {s.where}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setRsvp((r) => ({ ...r, [i]: "in" }))}
                  className={`text-xs ${rsvp[i] === "in" ? "btn-secondary" : "btn-ghost"}`}
                >
                  I&apos;m in
                </button>
                <button
                  type="button"
                  onClick={() => setRsvp((r) => ({ ...r, [i]: "out" }))}
                  className={`text-xs ${rsvp[i] === "out" ? "btn-secondary" : "btn-ghost"}`}
                >
                  Can&apos;t
                </button>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Digital passport">
        <div className="flex items-center gap-5">
          <div className="rounded-xl bg-white p-2 shrink-0">
            <div className="h-24 w-24 grid grid-cols-6 gap-px" aria-label="Digital passport QR code">
              {Array.from({ length: 36 }).map((_, i) => (
                <span key={i} className={(i * 7) % 3 === 0 ? "bg-black" : "bg-white"} />
              ))}
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold mb-1">Scan at check-in</p>
            <p className="text-xs text-ink2">
              Show this at the desk on match day. The real passport lives at <code className="text-ink3">/passport</code> and
              carries the verified QR.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function ParentView() {
  const [child, setChild] = useState(0);
  const kid = SAMPLE.children[child];
  return (
    <div className="space-y-6">
      <div className="card p-5 sm:p-6">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-3">Viewing</p>
        <div className="flex flex-wrap gap-2">
          {SAMPLE.children.map((c, i) => (
            <button
              key={c.name}
              type="button"
              onClick={() => setChild(i)}
              aria-pressed={i === child}
              className={`flex items-center gap-2.5 rounded-full border px-3 py-2 transition-colors ${
                i === child ? "border-black/30 bg-black/[0.06]" : "border-line hover:bg-black/[0.03]"
              }`}
            >
              <span className="h-7 w-7 rounded-full bg-black/[0.08] flex items-center justify-center text-[10px] font-extrabold shrink-0">
                {c.initials}
              </span>
              <span className="text-left min-w-0">
                <span className="block text-sm font-semibold truncate">{c.name}</span>
                <span className="block text-[11px] text-ink3 truncate">{c.team}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <Panel title="Check-in alerts">
        <div className="flex items-center gap-3 rounded-xl border border-line p-4">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-volt-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-volt-400" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{kid.name} checked in</p>
            <p className="text-xs text-ink3 truncate">Magic City Fields · Pitch 2 · 9:12 AM</p>
          </div>
        </div>
      </Panel>

      <Panel title="Family calendar" action={<span className="text-xs text-ink3">{kid.team}</span>}>
        <div className="divide-y divide-lineSoft">
          {SAMPLE.sessions.map((s, i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <span className="text-xs font-score text-ink3 w-16 shrink-0">{s.when}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{s.what}</p>
                <p className="text-xs text-ink3 truncate">{s.where} · {kid.name}</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function RoleWorkspace({ organizer }: { organizer: React.ReactNode }) {
  const [role, setRole] = useState<Role>("Organizer");

  return (
    <div className="space-y-6">
      <div className="card p-2 flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink3 px-2.5 shrink-0">View as</span>
        {ROLES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            aria-pressed={role === r}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              role === r ? "bg-black/10 text-black border border-black/20" : "border border-transparent text-ink2 hover:text-black hover:bg-black/5"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {role !== "Organizer" && (
        <p className="text-xs text-ink3 px-1">
          Wireframe — {role} views render from sample data. Switching, RSVPs and attendance work; nothing saves yet.
        </p>
      )}

      {role === "Organizer" && organizer}
      {role === "Coach/Manager" && <CoachView />}
      {role === "Player" && <PlayerView />}
      {role === "Parent" && <ParentView />}
      {role === "Guest" && (
        <div className="card p-8 text-center">
          <h2 className="text-xl font-extrabold text-inkDisplay mb-2">Spectator view needs no account</h2>
          <p className="text-sm text-ink2 max-w-md mx-auto mb-5">
            Brackets, live scores, standings and schedules are already public. Signing out isn&apos;t required to
            check — open a tournament page in a private window.
          </p>
          <a href="/tournaments" className="btn-primary text-sm">Browse public tournaments</a>
        </div>
      )}
    </div>
  );
}
