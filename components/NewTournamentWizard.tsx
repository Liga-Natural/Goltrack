"use client";

import { useState } from "react";
import { createTournament } from "@/lib/actions";
import { SPORTS, SPORT_NAMES } from "@/lib/sportTheme";

const STEPS = [
  { n: "01", title: "Event details", hint: "What it's called and where it's played." },
  { n: "02", title: "Format", hint: "How teams are grouped and how a winner is decided." },
  { n: "03", title: "Schedule & fees", hint: "Dates, pitches, and what a team pays to enter." },
  { n: "04", title: "Director", hint: "Point of contact for this event — not shown publicly." },
];

const AGE_GROUPS = ["U8","U9","U10","U11","U12","U13","U14","U15","U16","U17","U18","U19"];
const TIERS = ["Premier", "Gold", "Silver", "Bronze"];

const FORMATS = [
  { value: "GROUPS_KNOCKOUT", label: "Groups + knockout", body: "Group stage seeds a bracket. The default for weekend cups." },
  { value: "SINGLE_ELIM", label: "Single elimination", body: "Straight to a bracket — every team enters, one loss is out." },
  { value: "ROUND_ROBIN", label: "League table", body: "Everyone plays everyone. Placings come from the table." },
];

function fmtDate(s: string): string {
  if (!s) return "";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

// Live preview of the tournament as it's being described. Not decoration:
// this form writes a public page, and until now nothing showed an organizer
// what that page would say until after they'd committed a record to the
// database.
function PreviewCard({
  name,
  sport,
  teamFormat,
  format,
  location,
  startDate,
  endDate,
  fee,
  director,
  divisionCount,
}: {
  name: string;
  sport: string;
  teamFormat: string;
  format: string;
  location: string;
  startDate: string;
  endDate: string;
  fee: string;
  director: string;
  divisionCount: number;
}) {
  const theme = SPORTS[sport];
  const range = [fmtDate(startDate), fmtDate(endDate)].filter(Boolean);
  const formatLabel = FORMATS.find((f) => f.value === format)?.label;

  return (
    <div className="card p-6">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-4">Public page preview</p>
      <h3 className="text-2xl font-extrabold text-inkDisplay leading-tight mb-2 break-words">
        {name || <span className="text-ink3">Untitled tournament</span>}
      </h3>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {theme && (
          <span className={`badge ${theme.soft}`}>
            {theme.emoji} {theme.label} {teamFormat}
          </span>
        )}
        {formatLabel && <span className="badge">{formatLabel}</span>}
        {divisionCount ? <span className="badge">{divisionCount} divisions</span> : null}
      </div>
      <p className="text-sm text-ink2">
        {range.length ? range.join(" – ") : <span className="text-ink3">Dates not set</span>}
        {location ? ` · ${location}` : ""}
      </p>
      <div className="mt-5 pt-5 border-t border-lineSoft grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-1">Entry fee</p>
          <p className="font-score text-2xl text-inkDisplay leading-none">${fee || "0"}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-1">Director</p>
          <p className="text-sm truncate">{director || <span className="text-ink3">—</span>}</p>
        </div>
      </div>
    </div>
  );
}

export function NewTournamentWizard() {
  const [step, setStep] = useState(0);
  const [v, setV] = useState({
    name: "",
    location: "",
    sport: "Soccer",
    teamFormat: "",
    format: "GROUPS_KNOCKOUT",
    startDate: "",
    endDate: "",
    fee: "150",
    fieldsCount: "2",
    groupsCount: "2",
    advancePerGroup: "2",
    ages: [] as string[],
    tiers: [] as string[],
    supervisorName: "",
    supervisorEmail: "",
    supervisorPhone: "",
  });

  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setV((prev) => ({ ...prev, [k]: e.target.value }));

  const formats = SPORTS[v.sport]?.formats || [];
  const teamFormat = v.teamFormat || formats[0] || "";
  const isLast = step === STEPS.length - 1;
  const groupsRelevant = v.format === "GROUPS_KNOCKOUT";
  const divisions = v.ages.flatMap((a) => (v.tiers.length ? v.tiers.map((t) => `${a} ${t}`) : [a]));

  const toggle = (key: "ages" | "tiers", value: string) =>
    setV((p) => ({
      ...p,
      [key]: p[key].includes(value) ? p[key].filter((x) => x !== value) : [...p[key], value],
    }));

  // Every step stays mounted so the FormData this posts is byte-identical to
  // the single-page form it replaces — same field names, same server action,
  // nothing conditionally dropped from the payload. Inactive steps are
  // hidden rather than unmounted for exactly that reason.
  //
  // `required` is bound to the active step instead of being static: a
  // required control inside a display:none subtree makes the browser abort
  // submit with "An invalid form control is not focusable", with no visible
  // error to explain it. Advancing runs reportValidity() on the visible
  // fieldset, so each step still validates before you leave it.
  function next(e: React.MouseEvent<HTMLButtonElement>) {
    const panel = (e.currentTarget.closest("form") as HTMLFormElement).querySelector<HTMLElement>(
      `[data-step="${step}"]`
    );
    const fields = panel?.querySelectorAll<HTMLInputElement>("input, select");
    for (const f of Array.from(fields || [])) {
      if (!f.reportValidity()) return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  return (
    <form action={createTournament} className="grid xl:grid-cols-[1fr_22rem] gap-6 items-start mt-6">
      <div className="card p-6 sm:p-8">
        {/* Step rail. aria-current marks the active step for assistive tech;
            the numerals are decorative and already announced by the label. */}
        <ol className="flex items-center gap-1 mb-8">
          {STEPS.map((s, i) => (
            <li key={s.n} className="flex items-center gap-1 flex-1 last:flex-none">
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                aria-current={i === step ? "step" : undefined}
                className={`flex items-center gap-2 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  i === step
                    ? "bg-black/10 text-black"
                    : i < step
                      ? "text-ink2 hover:text-black hover:bg-black/5"
                      : "text-ink3 cursor-default"
                }`}
              >
                <span className="font-mono">{s.n}</span>
                <span className="hidden sm:inline whitespace-nowrap">{s.title}</span>
              </button>
              {i < STEPS.length - 1 && <span className="flex-1 h-px bg-line" />}
            </li>
          ))}
        </ol>

        <div className="mb-6">
          <h2 className="text-xl font-extrabold text-inkDisplay">{STEPS[step].title}</h2>
          <p className="text-sm text-ink2 mt-1">{STEPS[step].hint}</p>
        </div>

        <div data-step="0" hidden={step !== 0} className="space-y-4">
          <div>
            <label className="label">Tournament name</label>
            <input className="input" name="name" required={step === 0} value={v.name} onChange={set("name")} placeholder="Coastal Cup Youth Invitational" />
          </div>
          <div>
            <label className="label">Location</label>
            <input className="input" name="location" value={v.location} onChange={set("location")} placeholder="Magic City Fields, Miami FL" />
          </div>
          <div>
            <label className="label">Sport</label>
            {/* Cards, not a <select>: the sport drives roster size, pitch
                vocabulary and the colour tag, so it deserves to be visible
                rather than collapsed behind a dropdown. */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
              {SPORT_NAMES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setV((p) => ({ ...p, sport: s, teamFormat: SPORTS[s].formats[0] }))}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    v.sport === s ? "border-black/30 bg-black/[0.06]" : "border-line hover:bg-black/[0.03]"
                  }`}
                >
                  <span className="block text-lg leading-none mb-1.5">{SPORTS[s].emoji}</span>
                  <span className="block text-xs font-semibold leading-tight">{s}</span>
                </button>
              ))}
            </div>
            <input type="hidden" name="sport" value={v.sport} />
          </div>
          <div>
            <label className="label">Team format</label>
            <select className="input" name="teamFormat" value={teamFormat} onChange={set("teamFormat")}>
              {formats.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>

        <div data-step="1" hidden={step !== 1} className="space-y-3">
          {FORMATS.map((f) => (
            <label
              key={f.value}
              className={`flex gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${
                v.format === f.value ? "border-black/30 bg-black/[0.06]" : "border-line hover:bg-black/[0.03]"
              }`}
            >
              <input
                type="radio"
                name="format"
                value={f.value}
                checked={v.format === f.value}
                onChange={set("format")}
                className="mt-1 accent-current"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{f.label}</span>
                <span className="block text-xs text-ink2 mt-0.5">{f.body}</span>
              </span>
            </label>
          ))}
          {/* Divisions are the cross-product of the ages and tiers picked
              here — "U12" x "Gold" becomes the division "U12 Gold". Posting
              the composed names rather than the two axes keeps the applicant
              form and the applications table reading one flat list, and lets
              an organizer who wants only age groups simply pick no tier. */}
          <div className="pt-4 border-t border-lineSoft">
            <p className="label">Age groups</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {AGE_GROUPS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggle("ages", a)}
                  aria-pressed={v.ages.includes(a)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                    v.ages.includes(a) ? "bg-black/10 text-black border-black/20" : "border-line text-ink2 hover:text-black"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
            <p className="label">Skill tiers (optional)</p>
            <div className="flex flex-wrap gap-1.5">
              {TIERS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggle("tiers", t)}
                  aria-pressed={v.tiers.includes(t)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                    v.tiers.includes(t) ? "bg-black/10 text-black border-black/20" : "border-line text-ink2 hover:text-black"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            {divisions.length > 0 && (
              <p className="text-xs text-ink3 mt-3">
                {divisions.length} division{divisions.length === 1 ? "" : "s"}: {divisions.slice(0, 6).join(", ")}
                {divisions.length > 6 ? "…" : ""}
              </p>
            )}
            {divisions.map((d) => (
              <input key={d} type="hidden" name="divisions" value={d} />
            ))}
          </div>

          {/* Group settings only mean something for the grouped format, but
              they stay in the DOM when hidden so the payload never changes
              shape — the action reads them either way and ignores them for
              the other formats. */}
          <div className={groupsRelevant ? "grid grid-cols-2 gap-4 pt-2" : "hidden"}>
            <div>
              <label className="label"># Groups</label>
              <input className="input" type="number" min={1} name="groupsCount" value={v.groupsCount} onChange={set("groupsCount")} />
            </div>
            <div>
              <label className="label">Advancing per group</label>
              <input className="input" type="number" min={1} name="advancePerGroup" value={v.advancePerGroup} onChange={set("advancePerGroup")} />
            </div>
          </div>
          {!groupsRelevant && (
            <>
              <input type="hidden" name="groupsCount" value={v.groupsCount} />
              <input type="hidden" name="advancePerGroup" value={v.advancePerGroup} />
            </>
          )}
        </div>

        <div data-step="2" hidden={step !== 2} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start date</label>
              <input className="input" type="date" name="startDate" required={step === 2} value={v.startDate} onChange={set("startDate")} />
            </div>
            <div>
              <label className="label">End date</label>
              <input className="input" type="date" name="endDate" value={v.endDate} onChange={set("endDate")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fee (USD/team)</label>
              <input className="input" type="number" min={0} step="0.01" name="fee" value={v.fee} onChange={set("fee")} />
            </div>
            <div>
              <label className="label"># {SPORTS[v.sport]?.surfaceWord}s</label>
              <input className="input" type="number" min={1} name="fieldsCount" value={v.fieldsCount} onChange={set("fieldsCount")} />
            </div>
          </div>
        </div>

        <div data-step="3" hidden={step !== 3} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full name</label>
              <input className="input" name="supervisorName" required={step === 3} value={v.supervisorName} onChange={set("supervisorName")} placeholder="Adrian Velasquez" />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" name="supervisorEmail" required={step === 3} value={v.supervisorEmail} onChange={set("supervisorEmail")} placeholder="you@example.com" />
            </div>
          </div>
          <div>
            <label className="label">Phone (optional)</label>
            <input className="input" name="supervisorPhone" value={v.supervisorPhone} onChange={set("supervisorPhone")} placeholder="(305) 555-0100" />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-8 pt-6 border-t border-lineSoft">
          {step > 0 && (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="btn-ghost text-sm">
              ← Back
            </button>
          )}
          <span className="text-xs text-ink3 ml-auto">
            Step {step + 1} of {STEPS.length}
          </span>
          {isLast ? (
            <button className="btn-primary">Create tournament</button>
          ) : (
            <button type="button" onClick={next} className="btn-primary">
              Continue →
            </button>
          )}
        </div>
      </div>

      {/* xl-only: below that the preview would push the form itself below the
          fold on the step where you're still typing the name. */}
      <div className="hidden xl:block sticky top-6">
        <PreviewCard
          name={v.name}
          sport={v.sport}
          teamFormat={teamFormat}
          format={v.format}
          location={v.location}
          startDate={v.startDate}
          endDate={v.endDate}
          fee={v.fee}
          director={v.supervisorName}
          divisionCount={divisions.length}
        />
      </div>
    </form>
  );
}
