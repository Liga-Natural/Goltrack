import type { Team, Referee, Application, Tournament, Match } from "@/lib/models";

// Who a broadcast reaches, and what it says. Kept pure so the composer can
// show a live recipient count from the same function that later builds the
// send list — a "send to 47 people" that turns out to mean 3 is the failure
// mode this avoids.

// No field marshal scope: on this platform the referee is the person on the
// field, and they are the ones with contact details on file. A scope that
// could only ever reach nobody was clutter in the composer.
export type AudienceScope = "ALL" | "DIVISION" | "COACHES" | "REFEREES";
export type Priority = "STANDARD" | "URGENT";

export interface AudienceResult {
  emails: string[];
  /** Said plainly in the composer when a scope cannot reach anyone. */
  note: string | null;
}

function clean(list: (string | null | undefined)[]): string[] {
  return Array.from(
    new Set(
      list
        .map((e) => (e || "").trim().toLowerCase())
        // A referee's "contact" field is free text and is often a phone
        // number; anything without an @ is not an address to email.
        .filter((e) => e.includes("@") && e.length > 3)
    )
  );
}

export function resolveAudience(
  scope: AudienceScope,
  division: string | null,
  data: { teams: Team[]; referees: Referee[]; applications: Application[] }
): AudienceResult {
  const { teams, referees, applications } = data;

  switch (scope) {
    case "COACHES":
      return { emails: clean(teams.map((t) => t.contactEmail)), note: null };

    case "REFEREES": {
      const emails = clean(referees.map((r) => r.contact));
      const withoutEmail = referees.length - emails.length;
      return {
        emails,
        note:
          withoutEmail > 0
            ? `${withoutEmail} official${withoutEmail === 1 ? " has" : "s have"} no email address on file and cannot be reached.`
            : null,
      };
    }

    case "DIVISION": {
      if (!division) return { emails: [], note: "Pick a division." };
      const matching = applications.filter((a) => a.division === division);
      const teamIds = new Set(matching.map((a) => a.teamId).filter(Boolean) as string[]);
      return {
        emails: clean([
          ...matching.map((a) => a.managerEmail),
          ...teams.filter((t) => teamIds.has(t.id)).map((t) => t.contactEmail),
        ]),
        note: matching.length === 0 ? "No applications carry that division." : null,
      };
    }

    case "ALL":
    default:
      return {
        emails: clean([
          ...teams.map((t) => t.contactEmail),
          ...applications.map((a) => a.managerEmail),
          ...referees.map((r) => r.contact),
        ]),
        note: null,
      };
  }
}

export const AUDIENCE_LABELS: Record<AudienceScope, string> = {
  ALL: "All participants",
  DIVISION: "A specific division",
  COACHES: "Coaches & managers",
  REFEREES: "Referees",
};

export interface BroadcastTemplate {
  id: string;
  label: string;
  priority: Priority;
  scope: AudienceScope;
  subject: (t: Tournament) => string;
  body: (t: Tournament, ctx: { match?: Match; fieldList: string }) => string;
}

// Templates are starting points an organizer edits, not automation that fires
// on its own: Jogo has no scheduler, so nothing here sends itself when a
// schedule slips. The composer says as much.
export const TEMPLATES: BroadcastTemplate[] = [
  {
    id: "DELAY",
    label: "Schedule delay",
    priority: "URGENT",
    scope: "ALL",
    subject: (t) => `${t.name} — schedule delay`,
    body: (t) =>
      [
        `All kick-offs at ${t.name} are delayed.`,
        ``,
        `We will confirm new times as soon as we have them. Please stay near your field and watch the event page for updates.`,
      ].join("\n"),
  },
  {
    id: "FIELD_CHANGE",
    label: "Field change",
    priority: "URGENT",
    scope: "COACHES",
    subject: (t) => `${t.name} — field change`,
    body: (t, ctx) =>
      [
        `A fixture at ${t.name} has moved field.`,
        ``,
        ctx.fieldList ? `Fields in use: ${ctx.fieldList}.` : ``,
        `Please check the event page for your team's current field before kick-off.`,
      ]
        .filter(Boolean)
        .join("\n"),
  },
  {
    id: "WEATHER",
    label: "Weather / rainout",
    priority: "URGENT",
    scope: "ALL",
    subject: (t) => `${t.name} — weather hold`,
    body: (t) =>
      [
        `Play at ${t.name} is on hold for weather.`,
        ``,
        `Please clear the fields and wait for the all-clear. We will send another message the moment play resumes.`,
      ].join("\n"),
  },
  {
    id: "RESULTS",
    label: "Results posted",
    priority: "STANDARD",
    scope: "ALL",
    subject: (t) => `${t.name} — results posted`,
    body: (t) => [`Scores and standings for ${t.name} are up to date on the event page.`].join("\n"),
  },
  {
    id: "ACCEPTED",
    label: "Application accepted",
    priority: "STANDARD",
    scope: "COACHES",
    subject: (t) => `${t.name} — your team is in`,
    body: (t) =>
      [
        `Your application to ${t.name} has been accepted.`,
        ``,
        `Next: settle the entry fee, add your roster, and upload your club crest from the link we sent you.`,
      ].join("\n"),
  },
  {
    id: "ACTION_REQUIRED",
    label: "Action required",
    priority: "URGENT",
    scope: "COACHES",
    subject: (t) => `${t.name} — action required`,
    body: (t) =>
      [
        `Something on your entry to ${t.name} still needs your attention.`,
        ``,
        `Please check your invoice, roster, and paperwork on the team page and reply if anything is unclear.`,
      ].join("\n"),
  },
];

export type EventStatus = "OPEN" | "DELAY" | "SUSPENDED";

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  OPEN: "All fields open",
  DELAY: "Weather delay",
  SUSPENDED: "Play suspended",
};

export const EVENT_STATUS_CLASS: Record<EventStatus, string> = {
  OPEN: "badge-accepted",
  DELAY: "badge-pending",
  SUSPENDED: "badge-danger",
};

export function isEventStatus(value: string): value is EventStatus {
  return value === "OPEN" || value === "DELAY" || value === "SUSPENDED";
}

/** A maps link from whatever address the organizer typed. */
export function mapsUrl(location: string | null): string | null {
  if (!location || !location.trim()) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.trim())}`;
}
