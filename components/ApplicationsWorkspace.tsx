"use client";

import { useState } from "react";
import type { Application, ApplicationMessage } from "@/lib/models";
import { decideApplication, acceptApplication, setApplicationPayment, queueApplicationMessage } from "@/lib/actions";
import { tierClass } from "@/lib/tierStyles";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  WAITLISTED: "Waitlisted",
  DECLINED: "Declined",
};

const PAYMENT_LABEL: Record<string, string> = {
  UNPAID: "Unpaid",
  DEPOSIT_PAID: "Deposit paid",
  INVOICE_REQUESTED: "Invoice requested",
  PAID: "Paid",
};

const TEMPLATES = [
  {
    key: "RECEIVED",
    label: "Application received",
    audience: "PENDING",
    subject: "We've got your entry",
    body: "Thanks for entering. Your application is with us now and we'll confirm your place shortly.",
  },
  {
    key: "ACCEPTED",
    label: "Accepted into tournament",
    audience: "ACCEPTED",
    subject: "You're in",
    body: "Your team has been accepted. Fixtures will be published once the schedule is generated — watch the tournament page.",
  },
  {
    key: "PAYMENT",
    label: "Payment reminder",
    audience: "UNPAID",
    subject: "Entry fee outstanding",
    body: "A friendly nudge: your entry fee is still outstanding. Your place is held until the roster freeze.",
  },
  {
    key: "FREEZE",
    label: "Roster freeze warning",
    audience: "ACCEPTED",
    subject: "Rosters freeze soon",
    body: "Rosters freeze ahead of the first whistle. Please make any final player changes before then.",
  },
];

function Pill({ tone, children }: { tone: "neutral" | "good" | "warn"; children: React.ReactNode }) {
  // Semantic colour, deliberately not theme-inverting: mint always reads as
  // accepted and amber as pending, so a glance down the column means the
  // same thing on either canvas.
  const map = {
    neutral: "badge",
    good: "badge badge-accepted",
    warn: "badge badge-pending",
  };
  return <span className={`${map[tone]} text-[10px] shrink-0`}>{children}</span>;
}

export function ApplicationsWorkspace({
  tournamentId,
  applications,
  messages,
  divisions,
  groups,
  teamGroupById,
}: {
  tournamentId: string;
  applications: Application[];
  messages: ApplicationMessage[];
  divisions: string[];
  groups: string[];
  teamGroupById: Record<string, string | null>;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [placement, setPlacement] = useState<"auto" | "manual">("auto");
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState({ template: "", audience: "ALL", subject: "", body: "" });

  const open = applications.find((a) => a.id === openId) || null;
  const accepting = applications.find((a) => a.id === acceptingId) || null;
  const counts = {
    total: applications.length,
    pending: applications.filter((a) => a.status === "PENDING").length,
    accepted: applications.filter((a) => a.status === "ACCEPTED").length,
    waitlisted: applications.filter((a) => a.status === "WAITLISTED").length,
    unpaid: applications.filter((a) => a.paymentStatus === "UNPAID" || a.paymentStatus === "INVOICE_REQUESTED").length,
  };

  const pickTemplate = (key: string) => {
    const t = TEMPLATES.find((x) => x.key === key);
    if (!t) return;
    setDraft({ template: t.key, audience: t.audience, subject: t.subject, body: t.body });
  };

  return (
    <div className="space-y-6">
      <div className="card mesh p-5 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-5">
          {[
            ["Applied", counts.total],
            ["Pending", counts.pending],
            ["Accepted", counts.accepted],
            ["Waitlisted", counts.waitlisted],
            ["Unpaid", counts.unpaid],
          ].map(([label, value]) => (
            <div key={label as string} className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-1">{label}</p>
              <p className="font-score text-2xl text-inkDisplay leading-none">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2">Applicants</h2>
          <button type="button" onClick={() => setComposing(true)} className="btn-secondary text-xs">
            Message applicants
          </button>
        </div>

        {applications.length === 0 ? (
          <p className="text-sm text-ink2 py-8 text-center">
            No applications yet. Share the registration link and they&apos;ll land here.
          </p>
        ) : (
          <div className="divide-y divide-lineSoft">
            {applications.map((a) => (
              <div key={a.id} className="py-3.5">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setOpenId(a.id)}
                    className="min-w-0 flex-1 text-left"
                    aria-label={`Open ${a.teamName}`}
                  >
                    <p className="text-sm font-semibold truncate">
                      {a.teamName}
                      {a.division && (
                        <span className={`badge text-[10px] ml-2 align-middle ${tierClass(a.division)}`}>{a.division}</span>
                      )}
                    </p>
                    <p className="text-xs text-ink3 truncate">
                      {[a.clubName, `${a.rosterCount} players`, a.managerName].filter(Boolean).join(" · ")}
                    </p>
                  </button>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Pill tone={a.paymentStatus === "PAID" || a.paymentStatus === "DEPOSIT_PAID" ? "good" : "warn"}>
                      {PAYMENT_LABEL[a.paymentStatus]}
                    </Pill>
                    <Pill tone={a.status === "ACCEPTED" ? "good" : "neutral"}>
                      {a.status === "ACCEPTED"
                        ? `Accepted${a.teamId && teamGroupById[a.teamId] ? ` · Group ${teamGroupById[a.teamId]}` : " · Roster open"}`
                        : STATUS_LABEL[a.status]}
                    </Pill>
                  </div>
                </div>
                {a.status !== "ACCEPTED" && (
                  <div className="flex flex-wrap gap-2 mt-2.5">
                    <button type="button" onClick={() => setAcceptingId(a.id)} className="btn-secondary text-xs">
                      Accept team
                    </button>
                    <form action={decideApplication.bind(null, tournamentId, a.id, "WAITLISTED")}>
                      <button className="btn-ghost text-xs">Waitlist</button>
                    </form>
                    <form action={decideApplication.bind(null, tournamentId, a.id, "DECLINED")}>
                      <button className="btn-ghost text-xs">Decline</button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {messages.length > 0 && (
        <div className="card p-5 sm:p-6">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-3">Message history</h2>
          <div className="divide-y divide-lineSoft">
            {messages.map((m) => (
              <div key={m.id} className="py-3 flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{m.subject}</p>
                  <p className="text-xs text-ink3 truncate">
                    {m.audience} · {m.recipientCount} recipient{m.recipientCount === 1 ? "" : "s"}
                  </p>
                </div>
                <Pill tone="warn">{m.status}</Pill>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail drawer. Rendered only while open so its inputs never join the
          page's tab order behind the scenes. The scrim uses a literal rgba
          rather than bg-black/60 — `black` is remapped onto --ink in this
          codebase, so that token paints white over a dark page. */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Close details"
            className="absolute inset-0 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm"
            onClick={() => setOpenId(null)}
          />
          <aside className="relative w-full max-w-md h-full overflow-y-auto modal-panel rounded-none border-l p-6">
            <div className="flex items-start justify-between gap-3 mb-6">
              <div className="min-w-0">
                <h3 className="text-xl font-extrabold text-inkDisplay truncate">{open.teamName}</h3>
                <p className="text-xs text-ink3">{open.clubName || "No club given"}</p>
              </div>
              <button type="button" onClick={() => setOpenId(null)} className="btn-ghost text-xs shrink-0">
                Close
              </button>
            </div>

            <dl className="space-y-4 mb-6">
              {[
                ["Division", open.division || "—"],
                ["Roster declared", `${open.rosterCount} players`],
                ["Manager", open.managerName],
                ["Email", open.managerEmail],
                ["Phone", open.managerPhone || "—"],
                ["Applied", new Date(open.createdAt).toLocaleString()],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-0.5">{k}</dt>
                  <dd className="text-sm break-words">{v}</dd>
                </div>
              ))}
              {open.notes && (
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-0.5">Notes</dt>
                  <dd className="text-sm text-ink2 whitespace-pre-wrap">{open.notes}</dd>
                </div>
              )}
            </dl>

            <div className="border-t border-lineSoft pt-5 space-y-3">
              <p className="text-[11px] uppercase tracking-wide text-ink2 font-semibold">Payment</p>
              <div className="flex flex-wrap gap-2">
                {(["UNPAID", "INVOICE_REQUESTED", "DEPOSIT_PAID", "PAID"] as const).map((p) => (
                  <form key={p} action={setApplicationPayment.bind(null, tournamentId, open.id, p)}>
                    <button className={`text-xs ${open.paymentStatus === p ? "btn-secondary" : "btn-ghost"}`}>
                      {PAYMENT_LABEL[p]}
                    </button>
                  </form>
                ))}
              </div>
            </div>

            <div className="border-t border-lineSoft pt-5 mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { setAcceptingId(open.id); setOpenId(null); }}
                className="btn-secondary text-xs"
              >
                Accept team
              </button>
              <form action={decideApplication.bind(null, tournamentId, open.id, "WAITLISTED")}>
                <button className="btn-ghost text-xs">Waitlist</button>
              </form>
              <form action={decideApplication.bind(null, tournamentId, open.id, "DECLINED")}>
                <button className="btn-ghost text-xs">Decline</button>
              </form>
            </div>
          </aside>
        </div>
      )}


      {/* Stage 2: acceptance is a placement decision, not a yes/no. The
          organizer confirms which division the team actually lands in (which
          is often not the one it asked for) and the payment terms, and only
          then does the team row get created and its roster unlock. */}
      {accepting && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <button
            type="button"
            aria-label="Cancel acceptance"
            className="absolute inset-0 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm"
            onClick={() => setAcceptingId(null)}
          />
          <form
            action={async (fd) => {
              await acceptApplication(tournamentId, accepting.id, fd);
              setAcceptingId(null);
            }}
            className="relative modal-panel rounded-2xl w-full sm:max-w-md max-h-full overflow-y-auto p-6"
          >
            <h3 className="text-xl font-extrabold text-inkDisplay mb-1">Acceptance &amp; placement</h3>
            <p className="text-xs text-ink3 mb-5">
              {accepting.teamName} · requested {accepting.division || "no division"} · {accepting.rosterCount} players
            </p>

            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="acc-division">Place in division</label>
                {divisions.length > 0 ? (
                  <select
                    id="acc-division"
                    className="input"
                    name="division"
                    defaultValue={divisions.includes(accepting.division || "") ? (accepting.division as string) : divisions[0]}
                  >
                    {divisions.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                ) : (
                  <input id="acc-division" className="input" name="division" defaultValue={accepting.division || ""} placeholder="U14 Gold" />
                )}
              </div>
              {groups.length > 0 && (
                <div>
                  <label className="label">Bracket placement</label>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setPlacement("auto")}
                      aria-pressed={placement === "auto"}
                      className={`rounded-xl border p-3 text-left transition-colors ${
                        placement === "auto" ? "border-black/30 bg-black/[0.06]" : "border-line hover:bg-black/[0.03]"
                      }`}
                    >
                      <span className="block text-sm font-semibold">Auto-assign</span>
                      <span className="block text-[11px] text-ink2 mt-0.5">Smallest group</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlacement("manual")}
                      aria-pressed={placement === "manual"}
                      className={`rounded-xl border p-3 text-left transition-colors ${
                        placement === "manual" ? "border-black/30 bg-black/[0.06]" : "border-line hover:bg-black/[0.03]"
                      }`}
                    >
                      <span className="block text-sm font-semibold">Choose group</span>
                      <span className="block text-[11px] text-ink2 mt-0.5">Place manually</span>
                    </button>
                  </div>
                  <input type="hidden" name="placement" value={placement} />
                  {placement === "manual" && (
                    <select className="input" name="groupName" defaultValue={groups[0]} aria-label="Group">
                      {groups.map((g) => (
                        <option key={g} value={g}>Group {g}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
              <div>
                <label className="label" htmlFor="acc-payment">Payment terms</label>
                <select id="acc-payment" className="input" name="paymentStatus" defaultValue={accepting.paymentStatus}>
                  <option value="UNPAID">Full balance due</option>
                  <option value="DEPOSIT_PAID">Deposit paid</option>
                  <option value="INVOICE_REQUESTED">Invoice issued</option>
                  <option value="PAID">Paid in full</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={() => setAcceptingId(null)} className="btn-ghost text-sm">
                Cancel
              </button>
              <button className="btn-primary text-sm ml-auto">Confirm acceptance &amp; place in bracket</button>
            </div>
          </form>
        </div>
      )}
      {composing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <button
            type="button"
            aria-label="Close composer"
            className="absolute inset-0 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm"
            onClick={() => setComposing(false)}
          />
          <form
            action={async (fd) => {
              await queueApplicationMessage(tournamentId, fd);
              setComposing(false);
              setDraft({ template: "", audience: "ALL", subject: "", body: "" });
            }}
            className="relative modal-panel rounded-2xl w-full sm:max-w-lg max-h-full overflow-y-auto p-6"
          >
            <h3 className="text-xl font-extrabold text-inkDisplay mb-1">Message applicants</h3>
            <p className="text-xs text-ink3 mb-5">
              Queued for delivery. No mail provider is connected yet, so nothing sends until one is.
            </p>

            <div className="flex flex-wrap gap-2 mb-5">
              {TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => pickTemplate(t.key)}
                  className={`text-xs ${draft.template === t.key ? "btn-secondary" : "btn-ghost"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <input type="hidden" name="template" value={draft.template} />

            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="audience">Send to</label>
                <select
                  id="audience"
                  className="input"
                  name="audience"
                  value={draft.audience}
                  onChange={(e) => setDraft((d) => ({ ...d, audience: e.target.value }))}
                >
                  <option value="ALL">All applicants</option>
                  <option value="PENDING">All pending applicants</option>
                  <option value="ACCEPTED">Accepted coaches</option>
                  <option value="WAITLISTED">Waitlisted teams</option>
                  <option value="UNPAID">Unpaid / invoice requested</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="subject">Subject</label>
                <input
                  id="subject"
                  className="input"
                  name="subject"
                  required
                  value={draft.subject}
                  onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))}
                />
              </div>
              <div>
                <label className="label" htmlFor="body">Message</label>
                <textarea
                  id="body"
                  className="input min-h-[8rem] py-3"
                  name="body"
                  required
                  value={draft.body}
                  onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={() => setComposing(false)} className="btn-ghost text-sm">
                Cancel
              </button>
              <button className="btn-primary text-sm ml-auto">Queue message</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
