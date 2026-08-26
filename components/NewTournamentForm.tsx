"use client";

import { useState } from "react";
import { createTournament } from "@/lib/actions";
import { SPORTS, SPORT_NAMES } from "@/lib/sportTheme";

function Section({ n, title, hint, children }: { n: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-black/5 pt-6 first:border-t-0 first:pt-0">
      <div className="flex items-baseline gap-2.5 mb-4">
        <span className="font-mono text-xs text-pitch-600/70">{n}</span>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-black/70">{title}</h2>
      </div>
      {hint && <p className="text-xs text-black/40 -mt-2.5 mb-4">{hint}</p>}
      {children}
    </div>
  );
}

export function NewTournamentForm() {
  const [sport, setSport] = useState("Soccer");
  const formats = SPORTS[sport]?.formats || [];

  return (
    <form action={createTournament} className="card p-6 sm:p-8 space-y-6">
      <Section n="01" title="Tournament details">
        <div className="space-y-4">
          <div>
            <label className="label">Tournament name</label>
            <input className="input" name="name" required placeholder="Coastal Cup Youth Invitational" />
          </div>
          <div>
            <label className="label">Location</label>
            <input className="input" name="location" placeholder="Magic City Fields, Miami FL" />
          </div>
        </div>
      </Section>

      <Section n="02" title="Sport & format" hint="The roster size, court/field graphics, and color tag adapt to what you pick here.">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Sport</label>
            <select className="input" name="sport" value={sport} onChange={(e) => setSport(e.target.value)}>
              {SPORT_NAMES.map((s) => (
                <option key={s} value={s}>
                  {SPORTS[s].emoji} {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Team format</label>
            <select className="input" name="teamFormat">
              {formats.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className={`badge ${SPORTS[sport]?.soft}`}>
            {SPORTS[sport]?.emoji} This tournament will be tagged {SPORTS[sport]?.label.toLowerCase()}
          </span>
        </div>
        <div className="mt-4">
          <label className="label">Bracket structure</label>
          <select className="input" name="format" defaultValue="GROUPS_KNOCKOUT">
            <option value="GROUPS_KNOCKOUT">Groups + knockout</option>
            <option value="ROUND_ROBIN">Round robin only</option>
          </select>
        </div>
      </Section>

      <Section n="03" title="Schedule & fees">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Start date</label>
            <input className="input" type="date" name="startDate" required />
          </div>
          <div>
            <label className="label">End date</label>
            <input className="input" type="date" name="endDate" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Fee (USD/team)</label>
            <input className="input" type="number" min={0} step="0.01" name="fee" defaultValue={150} />
          </div>
          <div>
            <label className="label"># {SPORTS[sport]?.surfaceWord}s</label>
            <input className="input" type="number" min={1} name="fieldsCount" defaultValue={2} />
          </div>
          <div>
            <label className="label"># Groups</label>
            <input className="input" type="number" min={1} name="groupsCount" defaultValue={2} />
          </div>
        </div>
        <div className="mt-4">
          <label className="label">Teams advancing per group</label>
          <input className="input" type="number" min={1} name="advancePerGroup" defaultValue={2} />
        </div>
      </Section>

      <Section
        n="04"
        title="Tournament director"
        hint="Kept on file as the point of contact for this event — not shown publicly."
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Full name</label>
            <input className="input" name="supervisorName" required placeholder="Adrian Velasquez" />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" name="supervisorEmail" required placeholder="you@example.com" />
          </div>
        </div>
        <div className="mt-4">
          <label className="label">Phone (optional)</label>
          <input className="input" name="supervisorPhone" placeholder="(305) 555-0100" />
        </div>
      </Section>

      <button className="btn-primary w-full text-base py-3">Create tournament</button>
    </form>
  );
}
