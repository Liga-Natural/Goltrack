"use client";

import { useMemo, useState, useTransition } from "react";
import { sendBroadcast, setEventStatus } from "@/lib/actions";
import {
  AUDIENCE_LABELS,
  TEMPLATES,
  EVENT_STATUS_LABEL,
  EVENT_STATUS_CLASS,
  resolveAudience,
} from "@/lib/broadcast";
import type { AudienceScope, EventStatus, Priority } from "@/lib/broadcast";
import type { Team, Referee, Application, Tournament } from "@/lib/models";

const SCOPES: AudienceScope[] = ["ALL", "DIVISION", "COACHES", "REFEREES"];
const STATUSES: EventStatus[] = ["OPEN", "DELAY", "SUSPENDED"];

export function BroadcastComposer({
  tournament,
  teams,
  referees,
  applications,
  divisions,
  fieldList,
}: {
  tournament: Tournament;
  teams: Team[];
  referees: Referee[];
  applications: Application[];
  divisions: string[];
  fieldList: string;
}) {
  const [scope, setScope] = useState<AudienceScope>("ALL");
  const [division, setDivision] = useState(divisions[0] ?? "");
  const [priority, setPriority] = useState<Priority>("STANDARD");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [template, setTemplate] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // The count shown here comes from the same resolver the server uses to
  // build the send list, so "47 recipients" is the number that will actually
  // be mailed rather than an optimistic guess.
  const audience = useMemo(
    () => resolveAudience(scope, scope === "DIVISION" ? division : null, { teams, referees, applications }),
    [scope, division, teams, referees, applications]
  );

  function applyTemplate(id: string) {
    setTemplate(id);
    const t = TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setSubject(t.subject(tournament));
    setBody(t.body(tournament, { fieldList }));
    setPriority(t.priority);
    setScope(t.scope);
  }

  return (
    <div className="space-y-6">
      {/* Live status */}
      <form
        action={(fd) =>
          startTransition(async () => {
            const result = await setEventStatus(tournament.id, fd);
            setStatusNotice(result.error || "Status updated — the public event page shows it now.");
          })
        }
        className="card p-5 sm:p-6 space-y-4"
      >
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2">Live event status</h2>
          <span className={`badge ${EVENT_STATUS_CLASS[(tournament.eventStatus as EventStatus) ?? "OPEN"]} text-[10px]`}>
            {EVENT_STATUS_LABEL[(tournament.eventStatus as EventStatus) ?? "OPEN"]}
          </span>
        </div>
        <div className="grid sm:grid-cols-3 gap-2">
          {STATUSES.map((s) => (
            <label
              key={s}
              className={`cursor-pointer rounded-xl border p-3 text-center transition-colors ${
                tournament.eventStatus === s ? "border-pitch-400 bg-pitch-400/10" : "border-line hover:border-black/25"
              }`}
            >
              <input
                type="radio"
                name="eventStatus"
                value={s}
                defaultChecked={tournament.eventStatus === s}
                className="sr-only"
              />
              <span className="block text-sm font-semibold text-inkDisplay">{EVENT_STATUS_LABEL[s]}</span>
            </label>
          ))}
        </div>
        <input
          name="eventStatusNote"
          className="input w-full"
          defaultValue={tournament.eventStatusNote ?? ""}
          placeholder="Optional detail — “Back on at 2:15, fields 1–3 only”"
        />
        <div className="flex items-center gap-3">
          <button type="submit" className="btn-secondary text-sm" disabled={pending}>
            Update status
          </button>
          {statusNotice && (
            <span className="text-xs text-ink2" role="status">
              {statusNotice}
            </span>
          )}
        </div>
        <p className="text-[11px] text-ink3">
          This is the rainout switch: spectators see it on the public event page immediately. It is not weather data —
          Jogo has no weather provider — it is what you tell people.
        </p>
      </form>

      {/* Composer */}
      <form
        action={(fd) =>
          startTransition(async () => {
            const result = await sendBroadcast(tournament.id, fd);
            setNotice(result.error || result.detail);
          })
        }
        className="card p-5 sm:p-6 space-y-5"
      >
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2">Broadcast</h2>

        <div>
          <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-2">Templates</span>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => applyTemplate(t.id)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  template === t.id
                    ? "border-pitch-400 bg-pitch-400/10 text-inkDisplay font-semibold"
                    : "border-line text-ink2 hover:border-black/25"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-ink3 mt-2">
            Starting points you edit, not automation. Nothing fires on its own when a schedule slips — Jogo has no
            scheduler, so a person presses send.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">Audience</span>
            <select
              name="scope"
              className="input w-full"
              value={scope}
              onChange={(e) => setScope(e.target.value as AudienceScope)}
            >
              {SCOPES.map((s) => (
                <option key={s} value={s}>
                  {AUDIENCE_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          {scope === "DIVISION" ? (
            <label className="block">
              <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">Division</span>
              <select name="division" className="input w-full" value={division} onChange={(e) => setDivision(e.target.value)}>
                {divisions.length === 0 && <option value="">No divisions recorded</option>}
                {divisions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <input type="hidden" name="division" value="" />
          )}
        </div>

        <div>
          <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-2">Priority</span>
          <div className="grid sm:grid-cols-2 gap-2">
            {(["STANDARD", "URGENT"] as Priority[]).map((p) => (
              <label
                key={p}
                className={`cursor-pointer rounded-xl border p-3 transition-colors ${
                  priority === p
                    ? p === "URGENT"
                      ? "border-warning-500 bg-warning-500/10"
                      : "border-pitch-400 bg-pitch-400/10"
                    : "border-line hover:border-black/25"
                }`}
              >
                <input
                  type="radio"
                  name="priority"
                  value={p}
                  checked={priority === p}
                  onChange={() => setPriority(p)}
                  className="sr-only"
                />
                <span className="block text-sm font-semibold text-inkDisplay">
                  {p === "URGENT" ? "Urgent / weather alert" : "Standard announcement"}
                </span>
                <span className="block text-[11px] text-ink3 mt-0.5">
                  {p === "URGENT" ? "Also pinned as a banner on the public page for 12 hours." : "Email only."}
                </span>
              </label>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">Subject</span>
          <input name="subject" className="input w-full" value={subject} onChange={(e) => setSubject(e.target.value)} required />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">Message</span>
          <textarea
            name="body"
            rows={6}
            className="input w-full min-h-[140px] h-auto py-3"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
        </label>
        <input type="hidden" name="template" value={template} />

        {/* Channels, stated as what they are rather than as toggles that do
            nothing. Email is real; the in-app alert is the public banner an
            urgent priority raises; SMS has no provider. */}
        <div className="rounded-xl border border-line p-4">
          <p className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-2">Channels</p>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="badge badge-accepted text-[10px]">EMAIL</span>
            <span className={`badge text-[10px] ${priority === "URGENT" ? "badge-accepted" : "bg-neutralBadge text-ink2 border border-line"}`}>
              IN-APP BANNER {priority === "URGENT" ? "ON" : "OFF"}
            </span>
            <span className="badge badge-danger text-[10px]">SMS UNAVAILABLE</span>
          </div>
          <p className="text-[11px] text-ink3">
            <span className="text-inkDisplay font-score">{audience.emails.length}</span> recipient
            {audience.emails.length === 1 ? "" : "s"} in this audience.
            {audience.note ? ` ${audience.note}` : ""} There is no SMS provider connected, so text messages are not
            offered rather than shown as a toggle that quietly does nothing.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button type="submit" className={priority === "URGENT" ? "btn-primary text-sm" : "btn-secondary text-sm"} disabled={pending}>
            {pending ? "Sending…" : priority === "URGENT" ? "Send urgent alert" : "Send announcement"}
          </button>
          {notice && (
            <span className="text-xs text-ink2" role="status">
              {notice}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
