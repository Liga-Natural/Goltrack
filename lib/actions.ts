"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { run as dbRun } from "@/lib/db";
import {
  Tournaments,
  Teams,
  Players,
  Matches,
  Referees,
  CheckIns,
  SiteSettings,
  Users,
  Applications,
  ApplicationMessages,
  Invoices,
  InvoiceItems,
  InvoicePayments,
  InvoiceInstallments,
  UserInvites,
  TournamentStaff,
  PaymentSettings,
  PlatformFees,
  PlatformPayouts,
  MatchEvents,
  PlayerMetrics,
  Availability,
  Lineups,
  MatchReports,
  RefereeFees,
  isRole,
  slugify,
  Format,
} from "@/lib/models";
import type { ApplicationStatus, PaymentStatus, PaymentMethod, User, Role, MatchEventType, AvailabilityStatus } from "@/lib/models";
import { ROLE_LABELS } from "@/lib/permissions";
import {
  can,
  isPermission,
  serializePermissions,
  effectivePermissions,
  PERMISSION_LABELS,
} from "@/lib/permissions";
import type { Permission } from "@/lib/permissions";
import { computeTotals, buildPaymentPlan, nextInvoiceNumber, money, formatDate } from "@/lib/invoices";
import { quoteRegistration, dueReminders } from "@/lib/pricing";
import { resolveAudience, isEventStatus } from "@/lib/broadcast";
import type { AudienceScope } from "@/lib/broadcast";
import { cookies } from "next/headers";
import { getCurrentUser, hashPassword, verifyPassword, createSessionToken, sessionCookieName } from "@/lib/auth";
import { generateGroupStage, generateRoundRobinOnly, generateKnockoutBracket } from "@/lib/bracket";
import { computeStandings, groupNames } from "@/lib/standings";
import { getSportTheme } from "@/lib/sportTheme";
import { isValidHex } from "@/lib/colorRamp";
import { sendBulkEmail, mailerConfigured } from "@/lib/mailer";
import { groupLetters } from "@/lib/groups";

// Crest uploads are validated by sniffing the file's actual bytes rather
// than trusting the browser-supplied Content-Type (which is easy to spoof
// by renaming a file) — this determines the stored mimeType too, so what we
// serve later always matches what the bytes actually are.
const MAX_CREST_BYTES = 5 * 1024 * 1024;

async function validateCrestFile(file: File): Promise<{ bytes: Uint8Array; mimeType: string }> {
  if (file.size === 0) throw new Error("No file selected");
  if (file.size > MAX_CREST_BYTES) throw new Error("Image must be 5MB or smaller");

  const bytes = new Uint8Array(await file.arrayBuffer());

  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { bytes, mimeType: "image/png" };
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { bytes, mimeType: "image/jpeg" };
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { bytes, mimeType: "image/webp" };
  }
  // SVG has no fixed magic bytes — it's text — so sniff the start of the
  // decoded content instead of the raw bytes.
  const head = new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, 512)).trimStart();
  if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(head)) {
    return { bytes, mimeType: "image/svg+xml" };
  }

  throw new Error("Unsupported image format — use PNG, JPG, WEBP, or SVG");
}

// Who may act on a tournament. Widened, never narrowed: the owner keeps
// exactly the access they had, and two more cases are now allowed in — the
// platform admin, and staff explicitly assigned onto this event. Without the
// assignment case an invited director would be refused everything, which
// would make the whole invitation flow decorative.
async function requireOwnedTournament(tournamentId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  const tournament = await Tournaments.byId(tournamentId);
  if (!tournament) throw new Error("Not found");
  if (tournament.ownerId === user.id) return { user, tournament };
  if (user.role === "ADMIN") return { user, tournament };
  if (await TournamentStaff.isAssigned(tournament.id, user.id)) return { user, tournament };
  throw new Error("Not found");
}

// The permission gate. Kept separate from the tournament check above because
// the two answer different questions: that one is "may you touch this event
// at all", this one is "may you do this *kind* of thing anywhere".
function requirePermission(user: User, permission: Permission) {
  if (!can(user, permission)) {
    throw new Error(`Your account does not have ${PERMISSION_LABELS[permission].label.toLowerCase()}.`);
  }
}

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  if (user.role !== "ADMIN") throw new Error("Not found");
  return user;
}

export async function createTournament(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const name = String(formData.get("name") || "").trim();
  const sport = String(formData.get("sport") || "Soccer").trim();
  const teamFormat = String(formData.get("teamFormat") || "11v11").trim();
  const format = (String(formData.get("format") || "GROUPS_KNOCKOUT") as Format);
  const location = String(formData.get("location") || "").trim() || null;
  const startDate = String(formData.get("startDate") || "");
  const endDate = String(formData.get("endDate") || startDate);
  const feeDollars = Number(formData.get("fee") || 0);
  const fieldsCount = Math.max(1, Number(formData.get("fieldsCount") || 2));
  const groupsCount = Math.max(1, Number(formData.get("groupsCount") || 2));
  const advancePerGroup = Math.max(1, Number(formData.get("advancePerGroup") || 2));
  const supervisorName = String(formData.get("supervisorName") || "").trim();
  const supervisorEmail = String(formData.get("supervisorEmail") || "").trim();
  const supervisorPhone = String(formData.get("supervisorPhone") || "").trim() || null;
  // Divisions arrive as one repeated field per checked box. Stored as JSON
  // rather than a joined string so a division containing a comma (a real
  // possibility: "U12 Gold, East") can't silently split into two.
  const divisionList = formData.getAll("divisions").map((d) => String(d).trim()).filter(Boolean);
  const divisions = divisionList.length ? JSON.stringify(divisionList) : null;

  if (!name || !startDate) throw new Error("Name and start date are required");
  if (!supervisorName || !supervisorEmail) throw new Error("Tournament director name and email are required");

  let baseSlug = slugify(name);
  let slug = baseSlug;
  let n = 1;
  while (await Tournaments.slugExists(slug)) {
    n++;
    slug = `${baseSlug}-${n}`;
  }

  const tournament = await Tournaments.create({
    slug,
    name,
    sport,
    teamFormat,
    format,
    status: "REGISTRATION_OPEN",
    location,
    startDate: new Date(startDate).toISOString(),
    endDate: new Date(endDate).toISOString(),
    feeCents: Math.round(feeDollars * 100),
    fieldsCount,
    groupsCount,
    advancePerGroup,
    supervisorName,
    supervisorEmail,
    supervisorPhone,
    divisions,
    ownerId: user.id,
  });

  redirect(`/dashboard/tournaments/${tournament.id}`);
}


// ── Team applications ────────────────────────────────────────────────────
// Public, unauthenticated: this is the form behind a tournament's shareable
// registration link. It deliberately does NOT create a team — an applicant
// is a request, and a team row is a confirmed entrant that standings and
// fixture generation both read from. Accepting is what promotes one to the
// other (see decideApplication).
export async function submitApplication(slug: string, formData: FormData) {
  const tournament = await Tournaments.bySlug(slug);
  if (!tournament) throw new Error("Tournament not found");
  if (tournament.status === "COMPLETED") throw new Error("This tournament has finished.");

  const teamName = String(formData.get("teamName") || "").trim();
  const managerName = String(formData.get("managerName") || "").trim();
  const managerEmail = String(formData.get("managerEmail") || "").trim();
  if (!teamName || !managerName || !managerEmail) {
    throw new Error("Team name, manager name and email are required");
  }

  // Division is stored as one composed string ("U12 Premier") because that
  // is what the organizer configured in the wizard and what the applications
  // table already holds — the form collects the two axes separately only
  // because that is far easier to pick from on a phone than one long list.
  const ageGroup = String(formData.get("ageGroup") || "").trim();
  const tier = String(formData.get("tier") || "").trim();
  const composed = [ageGroup, tier].filter(Boolean).join(" ");

  const payment = String(formData.get("payment") || "INVOICE_REQUESTED");
  const paymentStatus: PaymentStatus =
    payment === "DEPOSIT_PAID" ? "DEPOSIT_PAID" : payment === "PAID" ? "PAID" : "INVOICE_REQUESTED";
  const application = await Applications.create({
    tournamentId: tournament.id,
    teamName,
    clubName: String(formData.get("clubName") || "").trim() || null,
    division: composed || String(formData.get("division") || "").trim() || null,
    managerName,
    managerEmail,
    managerPhone: String(formData.get("managerPhone") || "").trim() || null,
    rosterCount: Math.max(0, Number(formData.get("rosterCount") || 0)),
    notes: String(formData.get("notes") || "").trim() || null,
    paymentStatus,
  });

  // Same byte-sniffing validator the organizer-side upload uses: it reads the
  // file's magic bytes rather than trusting the browser's Content-Type, which
  // is trivially spoofed by renaming a file. A bad or oversized image must not
  // sink an otherwise valid application, so a failure here is swallowed — the
  // team still gets in, just without a badge, and can add one after
  // acceptance through the crest link.
  const crest = formData.get("crest");
  if (crest instanceof File && crest.size > 0) {
    try {
      const { bytes, mimeType } = await validateCrestFile(crest);
      await Applications.setCrest(application.id, bytes, mimeType);
    } catch {
      // Ignored on purpose — see above.
    }
  }

  revalidatePath(`/dashboard/tournaments/${tournament.id}/applications`);
  redirect(`/t/${slug}/apply?submitted=${application.id}`);
}

export async function decideApplication(tournamentId: string, applicationId: string, status: ApplicationStatus) {
  const { user, tournament } = await requireOwnedTournament(tournamentId);
  requirePermission(user, "ROSTER");
  const application = await Applications.byId(applicationId);
  if (!application || application.tournamentId !== tournament.id) throw new Error("Application not found");

  let teamId: string | null = application.teamId;
  // Accepting creates the entrant, once. Re-accepting an already-accepted
  // application must not mint a second team row, which is why this is
  // guarded on the existing teamId rather than on the previous status.
  if (status === "ACCEPTED" && !teamId) {
    const team = await Teams.create({
      tournamentId: tournament.id,
      name: application.teamName,
      contactName: application.managerName,
      contactEmail: application.managerEmail,
      paid: application.paymentStatus === "PAID" || application.paymentStatus === "DEPOSIT_PAID",
    });
    teamId = team.id;
  }
  // Declining or waitlisting a team that was already accepted has to remove
  // the entrant again, otherwise it keeps its fixtures and its standings row.
  if (status !== "ACCEPTED" && application.teamId) {
    await Teams.remove(application.teamId);
    teamId = null;
    await dbRun(`UPDATE applications SET teamId = NULL WHERE id = $id`, { $id: applicationId } as any);
  }

  await Applications.setStatus(applicationId, status, teamId);
  revalidatePath(`/dashboard/tournaments/${tournamentId}/applications`);
  revalidatePath(`/dashboard/tournaments/${tournamentId}/teams`);
  revalidatePath(`/dashboard/tournaments/${tournamentId}`);
}

// Stage 2 of the application engine. Accepting is the one transition that
// also *places* a team: division, payment terms, and which group it lands
// in are all settled here, and only then is the team row created.
export async function acceptApplication(tournamentId: string, applicationId: string, formData: FormData) {
  const { user, tournament } = await requireOwnedTournament(tournamentId);
  requirePermission(user, "ROSTER");
  const application = await Applications.byId(applicationId);
  if (!application || application.tournamentId !== tournament.id) throw new Error("Application not found");

  const division = String(formData.get("division") || "").trim() || application.division;
  const paymentRaw = String(formData.get("paymentStatus") || application.paymentStatus);
  const paymentStatus = (["UNPAID", "DEPOSIT_PAID", "INVOICE_REQUESTED", "PAID"].includes(paymentRaw)
    ? paymentRaw
    : "UNPAID") as PaymentStatus;

  // Placement. "auto" balances by headcount rather than round-robining
  // blindly: the smallest group wins, so a team accepted late fills the gap
  // left by a decline instead of extending whichever group happens to be
  // next in the alphabet. Only groups the tournament actually declared are
  // candidates, so this can never invent a Group D on a two-group event.
  const letters = groupLetters(tournament.groupsCount);
  const mode = String(formData.get("placement") || "auto");
  const existing = await Teams.listByTournament(tournament.id);
  let groupName: string | null = null;
  if (tournament.format === "GROUPS_KNOCKOUT") {
    if (mode === "manual") {
      const picked = String(formData.get("groupName") || "").trim();
      groupName = letters.includes(picked) ? picked : letters[0];
    } else {
      const counts = new Map(letters.map((l) => [l, 0]));
      for (const t of existing) {
        if (t.groupName && counts.has(t.groupName)) counts.set(t.groupName, (counts.get(t.groupName) as number) + 1);
      }
      groupName = letters.reduce((best, l) =>
        (counts.get(l) as number) < (counts.get(best) as number) ? l : best
      , letters[0]);
    }
  }

  let teamId = application.teamId;
  if (!teamId) {
    const team = await Teams.create({
      tournamentId: tournament.id,
      name: application.teamName,
      contactName: application.managerName,
      contactEmail: application.managerEmail,
      paid: paymentStatus === "PAID" || paymentStatus === "DEPOSIT_PAID",
      groupName,
    });
    teamId = team.id;
    // Carry the badge the manager uploaded at application time onto the team
    // that now exists, so an accepted club appears with its crest already set
    // rather than being asked for it a second time.
    const crest = await Applications.crestBytes(applicationId);
    if (crest) await Teams.setCrest(team.id, crest.blob, crest.mimeType);
  } else if (groupName) {
    await Teams.setGroup(teamId, groupName);
  }

  await dbRun(`UPDATE applications SET division = $division WHERE id = $id`, {
    $id: applicationId,
    $division: division,
  } as any);
  await Applications.setPaymentStatus(applicationId, paymentStatus);
  await Applications.setStatus(applicationId, "ACCEPTED", teamId);

  revalidatePath(`/dashboard/tournaments/${tournamentId}/applications`);
  revalidatePath(`/dashboard/tournaments/${tournamentId}/teams`);
  revalidatePath(`/dashboard/tournaments/${tournamentId}`);
  revalidatePath("/team");
}

export async function setApplicationPayment(tournamentId: string, applicationId: string, paymentStatus: PaymentStatus) {
  const { user } = await requireOwnedTournament(tournamentId);
  requirePermission(user, "FINANCE");
  await Applications.setPaymentStatus(applicationId, paymentStatus);
  revalidatePath(`/dashboard/tournaments/${tournamentId}/applications`);
}

// Records an outbound message and attempts delivery. The status it lands on
// is the truth: SENT when the provider accepted it, FAILED when it rejected
// it, and QUEUED when no provider is configured at all. Claiming delivery
// that did not happen is the one outcome worth avoiding — an organizer would
// stop chasing a coach who never heard from them.
export async function queueApplicationMessage(tournamentId: string, formData: FormData) {
  const { user, tournament } = await requireOwnedTournament(tournamentId);
  requirePermission(user, "COMMUNICATION");
  const subject = String(formData.get("subject") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const audience = String(formData.get("audience") || "ALL");
  if (!subject || !body) throw new Error("Subject and message are required");

  const applications = await Applications.listByTournament(tournament.id);
  const targeted = applications.filter((a) => {
    if (audience === "ALL") return true;
    if (audience === "UNPAID") return a.paymentStatus === "UNPAID" || a.paymentStatus === "INVOICE_REQUESTED";
    return a.status === audience;
  });

  const recipients = targeted.map((a) => a.managerEmail);
  const message = await ApplicationMessages.create({
    tournamentId: tournament.id,
    template: String(formData.get("template") || "") || null,
    audience,
    subject,
    body,
    recipients: JSON.stringify(recipients),
    recipientCount: recipients.length,
  });

  // Recorded first, then sent. If the provider call throws or the process
  // dies mid-flight, the intent survives as QUEUED — losing the record of a
  // message an organizer believes they sent is the worse failure.
  const result = await sendBulkEmail(recipients, subject, body);
  if (result.ok) {
    await ApplicationMessages.setStatus(message.id, "SENT");
  } else if (result.configured) {
    await ApplicationMessages.setStatus(message.id, "FAILED");
  }
  // Not configured: left QUEUED, which is exactly what it is.

  revalidatePath(`/dashboard/tournaments/${tournamentId}/applications`);
}

export async function addTeam(tournamentId: string, formData: FormData) {
  const { tournament } = await requireOwnedTournament(tournamentId);
  const name = String(formData.get("name") || "").trim();
  const contactName = String(formData.get("contactName") || "").trim();
  const contactEmail = String(formData.get("contactEmail") || "").trim();
  const logoUrl = String(formData.get("logoUrl") || "").trim() || null;
  if (!name || !contactName || !contactEmail) throw new Error("All team fields are required");
  await Teams.create({ tournamentId: tournament.id, name, contactName, contactEmail, logoUrl });
  revalidatePath(`/dashboard/tournaments/${tournamentId}/teams`);
}

export async function removeTeam(tournamentId: string, teamId: string) {
  await requireOwnedTournament(tournamentId);
  await Teams.remove(teamId);
  revalidatePath(`/dashboard/tournaments/${tournamentId}/teams`);
}

export async function createTeamInvite(tournamentId: string) {
  await requireOwnedTournament(tournamentId);
  await Teams.createInvite(tournamentId);
  revalidatePath(`/dashboard/tournaments/${tournamentId}/teams`);
}

// Organizer-side crest upload, from the tournament's Teams management page.
export async function uploadTeamCrest(tournamentId: string, teamId: string, formData: FormData) {
  const { tournament } = await requireOwnedTournament(tournamentId);
  const team = await Teams.byId(teamId);
  if (!team || team.tournamentId !== tournament.id) throw new Error("Team not found");
  const file = formData.get("crest");
  if (!(file instanceof File)) throw new Error("No file uploaded");
  const { bytes, mimeType } = await validateCrestFile(file);
  await Teams.setCrest(teamId, bytes, mimeType);
  revalidatePath(`/dashboard/tournaments/${tournamentId}/teams`);
  revalidatePath(`/t/${tournament.slug}`);
  revalidatePath(`/t/${tournament.slug}/teams/${teamId}`);
}

// No-login, token-based self-service crest upload for a team's own
// manager/coach — same trust model as the existing invite-link token
// (long random, unguessable), except this one is never consumed, so it can
// be reused to replace the crest later.
export async function uploadTeamCrestPublic(token: string, formData: FormData) {
  const team = await Teams.byLogoToken(token);
  if (!team) throw new Error("This crest upload link is invalid.");
  const file = formData.get("crest");
  if (!(file instanceof File)) throw new Error("No file uploaded");
  const { bytes, mimeType } = await validateCrestFile(file);
  await Teams.setCrest(team.id, bytes, mimeType);
  const tournament = await Tournaments.byId(team.tournamentId);
  revalidatePath(`/dashboard/tournaments/${team.tournamentId}/teams`);
  if (tournament) {
    revalidatePath(`/t/${tournament.slug}`);
    revalidatePath(`/t/${tournament.slug}/teams/${team.id}`);
  }
  revalidatePath(`/t/${tournament?.slug}/crest/${token}`);
}

export async function addPlayer(tournamentId: string, teamId: string, formData: FormData) {
  await requireOwnedTournament(tournamentId);
  const name = String(formData.get("name") || "").trim();
  const jerseyNumber = String(formData.get("jerseyNumber") || "").trim() || null;
  if (!name) throw new Error("Player name required");
  await Players.create({ teamId, name, jerseyNumber });
  revalidatePath(`/dashboard/tournaments/${tournamentId}/teams`);
}

export async function setTeamPaid(tournamentId: string, teamId: string, paid: boolean) {
  const { user } = await requireOwnedTournament(tournamentId);
  requirePermission(user, "FINANCE");
  await Teams.setPaid(teamId, paid);
  revalidatePath(`/dashboard/tournaments/${tournamentId}/teams`);
}

export async function setTeamCheckedIn(tournamentId: string, teamId: string, checkedIn: boolean) {
  await requireOwnedTournament(tournamentId);
  await Teams.setCheckedIn(teamId, checkedIn);
  revalidatePath(`/dashboard/tournaments/${tournamentId}/checkin`);
}

// Stage 3: roster entry by the team's own manager, not the organizer.
// addPlayer above is gated on requireOwnedTournament, which is correct for
// the organizer's Teams page but locks out the very person who should be
// filling in the roster. This resolves the team from the signed-in user
// instead, so a manager can only ever write to their own squad — and a team
// row only exists once an application has been accepted, which is what makes
// "roster unlocks on acceptance" true rather than merely displayed.
export async function addOwnPlayer(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  const team = await Teams.byUserId(user.id);
  if (!team) throw new Error("No team linked to this account");

  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Player name is required");

  await Players.create({
    teamId: team.id,
    name,
    jerseyNumber: String(formData.get("jerseyNumber") || "").trim() || null,
    birthdate: String(formData.get("birthdate") || "").trim() || null,
  });
  revalidatePath("/team");
}

export async function checkInPlayerByPassport(tournamentId: string, passportId: string) {
  await requireOwnedTournament(tournamentId);
  const player = await Players.byPassportId(passportId.trim());
  if (!player) return { ok: false, message: "No player found with that passport ID." };
  const team = await Teams.byId(player.teamId);
  if (!team || team.tournamentId !== tournamentId) {
    return { ok: false, message: "That passport belongs to a different tournament." };
  }
  await CheckIns.create(tournamentId, player.id);
  revalidatePath(`/dashboard/tournaments/${tournamentId}/checkin`);
  return { ok: true, message: `${player.name} (${team.name}) checked in.` };
}

export async function addReferee(tournamentId: string, formData: FormData) {
  await requireOwnedTournament(tournamentId);
  const name = String(formData.get("name") || "").trim();
  const contact = String(formData.get("contact") || "").trim() || null;
  if (!name) throw new Error("Referee name required");
  await Referees.create({ tournamentId, name, contact });
  revalidatePath(`/dashboard/tournaments/${tournamentId}/referees`);
}

export async function assignReferee(tournamentId: string, matchId: string, refereeId: string) {
  await requireOwnedTournament(tournamentId);
  await Matches.assignReferee(matchId, refereeId || null);
  revalidatePath(`/dashboard/tournaments/${tournamentId}/referees`);
  revalidatePath(`/dashboard/tournaments/${tournamentId}/scores`);
}

export async function setMatchMotm(tournamentId: string, matchId: string, playerId: string) {
  await requireOwnedTournament(tournamentId);
  await Matches.setMotm(matchId, playerId || null);
  revalidatePath(`/dashboard/tournaments/${tournamentId}/scores`);
}

export async function generateSchedule(tournamentId: string) {
  const { user, tournament } = await requireOwnedTournament(tournamentId);
  requirePermission(user, "SCHEDULE_OVERRIDE");
  const allTeams = await Teams.listByTournament(tournamentId);
  const teams = allTeams.filter((t) => t.name); // skip unclaimed invite slots
  if (teams.length < 2) throw new Error("Add at least two teams first");

  await Matches.deleteByTournament(tournamentId);

  const startTime = new Date(tournament.startDate);
  const surfaceWord = getSportTheme(tournament.sport).surfaceWord;
  let generated;
  if (tournament.format === "SINGLE_ELIM") {
    // A single-elimination tournament has no group stage: the bracket *is*
    // the schedule. Without this branch it fell through to generateGroupStage
    // and produced a round-robin nobody asked for.
    generated = generateKnockoutBracket(
      teams.map((t) => t.id),
      startTime,
      `${surfaceWord} 1`
    ).map((m) => ({ ...m, groupName: null }));
    for (const t of teams) await Teams.setGroup(t.id, null);
  } else if (tournament.format === "ROUND_ROBIN") {
    generated = generateRoundRobinOnly(teams, { fieldsCount: tournament.fieldsCount, startTime, surfaceWord });
    for (const t of teams) await Teams.setGroup(t.id, null);
  } else {
    generated = generateGroupStage(teams, {
      groupsCount: tournament.groupsCount,
      fieldsCount: tournament.fieldsCount,
      startTime,
      surfaceWord,
    });
    // Persist group assignments back onto the teams.
    for (const m of generated) {
      if (m.homeTeamId && m.groupName) await Teams.setGroup(m.homeTeamId, m.groupName);
      if (m.awayTeamId && m.groupName) await Teams.setGroup(m.awayTeamId, m.groupName);
    }
  }

  for (const m of generated) {
    await Matches.create({
      tournamentId,
      stage: m.stage,
      round: m.round,
      groupName: m.groupName,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      homeLabel: m.homeLabel,
      awayLabel: m.awayLabel,
      homeScore: null,
      awayScore: null,
      field: m.field,
      scheduledAt: m.scheduledAt,
      status: "SCHEDULED",
      refereeId: null,
      orderIndex: m.orderIndex,
    });
  }

  await Tournaments.updateStatus(tournamentId, "SCHEDULED");
  revalidatePath(`/dashboard/tournaments/${tournamentId}`);
  revalidatePath(`/dashboard/tournaments/${tournamentId}/schedule`);
}

export async function generateKnockout(tournamentId: string) {
  const { user, tournament } = await requireOwnedTournament(tournamentId);
  requirePermission(user, "SCHEDULE_OVERRIDE");
  const teams = await Teams.listByTournament(tournamentId);
  const matches = await Matches.listByTournament(tournamentId);

  // Remove any previously generated knockout matches (keep group stage).
  const groupMatches = matches.filter((m) => m.stage === "GROUP");
  const toDelete = matches.filter((m) => m.stage === "KNOCKOUT");
  for (const m of toDelete) {
    await dbRun(`DELETE FROM matches WHERE id = $id`, { $id: m.id } as any);
  }

  const qualifiers: string[] = [];
  if (tournament.format === "SINGLE_ELIM") {
    // No group stage to qualify out of — every registered team enters the
    // bracket. Seeded by registration order, which is the only ordering
    // that exists before a ball is kicked.
    qualifiers.push(...teams.map((t) => t.id));
  } else if (tournament.format === "ROUND_ROBIN") {
    const standings = computeStandings(teams, groupMatches, null);
    qualifiers.push(...standings.slice(0, Math.min(8, standings.length)).map((s) => s.team.id));
  } else {
    for (const g of groupNames(teams)) {
      const standings = computeStandings(teams, groupMatches, g);
      qualifiers.push(...standings.slice(0, tournament.advancePerGroup).map((s) => s.team.id));
    }
  }

  if (qualifiers.length < 2) throw new Error("Not enough teams with completed group results yet");

  const generated = generateKnockoutBracket(qualifiers, new Date(tournament.endDate), `${getSportTheme(tournament.sport).surfaceWord} 1`);
  for (const m of generated) {
    await Matches.create({
      tournamentId,
      stage: m.stage,
      round: m.round,
      groupName: null,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      homeLabel: m.homeLabel,
      awayLabel: m.awayLabel,
      homeScore: null,
      awayScore: null,
      field: m.field,
      scheduledAt: m.scheduledAt,
      status: "SCHEDULED",
      refereeId: null,
      orderIndex: m.orderIndex,
    });
  }
  revalidatePath(`/dashboard/tournaments/${tournamentId}/schedule`);
}

export async function updateMatchScore(tournamentId: string, matchId: string, homeScore: number, awayScore: number, status: "SCHEDULED" | "LIVE" | "FINAL") {
  await requireOwnedTournament(tournamentId);
  await Matches.updateScore(matchId, homeScore, awayScore, status);
  revalidatePath(`/dashboard/tournaments/${tournamentId}/scores`);
  revalidatePath(`/dashboard/tournaments/${tournamentId}/schedule`);
}

export async function setTournamentStatus(tournamentId: string, status: "DRAFT" | "REGISTRATION_OPEN" | "SCHEDULED" | "LIVE" | "COMPLETED") {
  await requireOwnedTournament(tournamentId);
  await Tournaments.updateStatus(tournamentId, status);
  revalidatePath(`/dashboard/tournaments/${tournamentId}`);
}

// The site accent color is a global, not per-tournament, setting — gated
// behind being logged in (like the rest of /dashboard) rather than any
// particular tournament ownership, since it applies to the whole product.
export async function updateSiteAccentColor(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  const hex = String(formData.get("accentColor") || "").trim();
  if (!isValidHex(hex)) throw new Error("Enter a color as a 6-digit hex code, e.g. #F2545C");
  await SiteSettings.setAccentColor(hex);
  // The accent color reaches every route, not just one tournament's pages,
  // so revalidate the whole tree rather than a single path.
  revalidatePath("/", "layout");
}

export async function updateSiteTheme(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  const theme = String(formData.get("theme") || "");
  if (theme !== "light" && theme !== "dark") throw new Error("Invalid theme");
  await SiteSettings.setTheme(theme);
  revalidatePath("/", "layout");
}

// ---------- Public actions (registration + demo payment) ----------

// A thrown Error from a Server Action never reaches the person filling out
// the form — Next.js redacts server error messages in production (for good
// reason: an uncaught exception can carry internal detail) and shows a bare
// "Application error" page instead, with the real message only in server
// logs. That's correct for actual bugs, but every check below is a normal,
// expected validation outcome a real person will hit (a typo'd password, an
// email already in use) — those need to render inline on the form, which
// only works by returning state for useFormState to pick up, never by
// throwing. Genuinely exceptional cases (a tampered/nonexistent slug or
// token — not reachable through the UI in normal use) still throw.
export type FormActionState = { error?: string };

// Shared by both team-registration flows below. Creates a real
// TEAM_MANAGER account tied to this specific team and logs them straight
// in — team registration already collects a contact email, so a password
// alongside it is the whole signup, no separate flow needed. If that email
// already has an account, we verify the given password against it rather
// than silently overwrite or hijack whatever's there — a silent no-op here
// would leave someone thinking they now have a working account when they
// don't, discovered only much later at their next login attempt.
async function attachTeamManagerAccount(
  contactName: string,
  contactEmail: string,
  password: string
): Promise<{ userId: string } | { error: string }> {
  const email = contactEmail.toLowerCase();
  let user = await Users.byEmail(email);
  if (user) {
    if (user.role !== "TEAM_MANAGER") {
      return { error: `${contactEmail} is already used for a different kind of account. Use a different email for the team contact.` };
    }
    if (!(await verifyPassword(password, user.passwordHash))) {
      return { error: `${contactEmail} already has a team account — enter its existing password, or use a different email.` };
    }
  } else {
    user = await Users.create(email, await hashPassword(password), contactName, "TEAM_MANAGER");
  }
  const token = await createSessionToken(user.id);
  cookies().set(sessionCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return { userId: user.id };
}

export async function registerTeamPublic(slug: string, _prevState: FormActionState, formData: FormData): Promise<FormActionState> {
  const tournament = await Tournaments.bySlug(slug);
  if (!tournament) throw new Error("Tournament not found");

  const name = String(formData.get("name") || "").trim();
  const contactName = String(formData.get("contactName") || "").trim();
  const contactEmail = String(formData.get("contactEmail") || "").trim();
  const password = String(formData.get("password") || "");
  const logoUrl = String(formData.get("logoUrl") || "").trim() || null;
  if (!name || !contactName || !contactEmail) return { error: "All team fields are required" };
  if (!password || password.length < 8) return { error: "Password must be at least 8 characters" };

  const account = await attachTeamManagerAccount(contactName, contactEmail, password);
  if ("error" in account) return account;
  const team = await Teams.create({ tournamentId: tournament.id, name, contactName, contactEmail, logoUrl, userId: account.userId });

  const playerNames = formData.getAll("playerName") as string[];
  const playerJerseys = formData.getAll("playerJersey") as string[];
  for (let i = 0; i < playerNames.length; i++) {
    const trimmed = playerNames[i].trim();
    if (!trimmed) continue;
    await Players.create({ teamId: team.id, name: trimmed, jerseyNumber: playerJerseys[i]?.trim() || null });
  }

  redirect(`/t/${slug}/register/pay?team=${team.id}`);
}

// The manager gate in front of team registration. Reuses
// attachTeamManagerAccount, which already creates-or-signs-in and sets the
// session cookie — so one form handles both "I'm new" and "I have an
// account", which is what a coach standing on a touchline actually needs.
//
// Phone is carried forward in the redirect rather than stored: the users
// table has no phone column, and adding one is out of scope here. It lands
// prefilled on the application form, where managerPhone is a real persisted
// field — so the number the manager typed is not silently discarded.
export async function managerGate(slug: string, _prevState: FormActionState, formData: FormData): Promise<FormActionState> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const phone = String(formData.get("phone") || "").trim();

  if (!name || !email) return { error: "Name and email are required" };
  if (!password || password.length < 8) return { error: "Password must be at least 8 characters" };

  const account = await attachTeamManagerAccount(name, email, password);
  if ("error" in account) return account;

  redirect(`/t/${slug}/apply${phone ? `?phone=${encodeURIComponent(phone)}` : ""}`);
}

export async function claimTeamInvite(token: string, _prevState: FormActionState, formData: FormData): Promise<FormActionState> {
  const team = await Teams.byInviteToken(token);
  if (!team) throw new Error("This invite link is invalid or has already been used.");
  const tournament = await Tournaments.byId(team.tournamentId);
  if (!tournament) throw new Error("Tournament not found");

  const name = String(formData.get("name") || "").trim();
  const contactName = String(formData.get("contactName") || "").trim();
  const contactEmail = String(formData.get("contactEmail") || "").trim();
  const password = String(formData.get("password") || "");
  const logoUrl = String(formData.get("logoUrl") || "").trim() || null;
  if (!name || !contactName || !contactEmail) return { error: "All team fields are required" };
  if (!password || password.length < 8) return { error: "Password must be at least 8 characters" };

  const account = await attachTeamManagerAccount(contactName, contactEmail, password);
  if ("error" in account) return account;
  const claimed = await Teams.claimInvite(team.id, { name, contactName, contactEmail, logoUrl, userId: account.userId });
  if (!claimed) return { error: "Could not claim this invite — it may have just been used." };

  const playerNames = formData.getAll("playerName") as string[];
  const playerJerseys = formData.getAll("playerJersey") as string[];
  for (let i = 0; i < playerNames.length; i++) {
    const trimmed = playerNames[i].trim();
    if (!trimmed) continue;
    await Players.create({ teamId: claimed.id, name: trimmed, jerseyNumber: playerJerseys[i]?.trim() || null });
  }

  redirect(`/t/${tournament.slug}/register/pay?team=${claimed.id}`);
}

// A player's passport already exists the moment they're added to a
// roster — this just attaches a login to it. Existing accounts aren't
// reused here the way attachTeamManagerAccount reuses a team-manager one:
// a passport is a one-to-one identity, so claiming always creates a fresh
// account, and Players.claim's `userId IS NULL` guard is what stops the
// same link being used twice.
export async function claimPlayerPassport(playerId: string, _prevState: FormActionState, formData: FormData): Promise<FormActionState> {
  const player = await Players.byId(playerId);
  if (!player) throw new Error("Passport not found");
  if (player.userId) return { error: "This passport has already been claimed." };

  const name = String(formData.get("name") || "").trim() || player.name;
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!email) return { error: "Email is required" };
  if (!password || password.length < 8) return { error: "Password must be at least 8 characters" };
  if (await Users.byEmail(email)) return { error: "An account with that email already exists." };

  const user = await Users.create(email, await hashPassword(password), name, "PLAYER");
  const claimed = await Players.claim(player.id, user.id);
  if (!claimed) return { error: "This passport has already been claimed." };

  const token = await createSessionToken(user.id);
  cookies().set(sessionCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/me");
}

export async function markTeamPaidDemo(teamId: string) {
  const team = await Teams.byId(teamId);
  if (!team) throw new Error("Team not found");
  await Teams.setPaid(teamId, true);
  const tournament = await Tournaments.byId(team.tournamentId);
  redirect(`/t/${tournament?.slug}?paid=1`);
}

// ---------- Invoicing ----------
//
// Every figure an organizer can change lands in the ledger as a row: a
// discount edits the invoice, a payment or a refund appends to
// invoice_payments, and the totals are recomputed from those rows on read.
// Nothing here writes a cached total, so an invoice can never end up
// disagreeing with its own line items.

// Accepts what a person actually types into a money field — "1,250", "$150",
// "150.5" — and refuses what it cannot read rather than silently banking a 0.
function parseMoneyToCents(raw: string): number {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (!cleaned || !/^-?\d*\.?\d*$/.test(cleaned)) throw new Error("Enter an amount like 150.00");
  const value = Number(cleaned);
  if (!Number.isFinite(value)) throw new Error("Enter an amount like 150.00");
  return Math.round(value * 100);
}

// What a form action hands back. Bad input is a returned message, never a
// thrown error: Next masks a thrown server-action error in production behind
// a generic string, so throwing would turn "Enter an amount like 150.00" into
// "an error occurred" exactly where the organizer needs to read it. Auth and
// not-found still throw — those are not something the user can retype their
// way out of.
export type ActionResult = { error?: string };

async function guarded(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

// Every caller of this touches money, so the finance gate lives here rather
// than being repeated (and eventually forgotten) in each of the six actions
// that record payments, refunds, discounts, plans and reminders.
async function requireInvoice(tournamentId: string, invoiceId: string) {
  const { user, tournament } = await requireOwnedTournament(tournamentId);
  requirePermission(user, "FINANCE");
  const invoice = await Invoices.byId(invoiceId);
  if (!invoice || invoice.tournamentId !== tournament.id) throw new Error("Invoice not found");
  return { user, tournament, invoice };
}

// Keeps the team's `paid` flag — which predates invoicing and is what the
// entrants list, the check-in desk and the public page all read — in step
// with the ledger, so settling an invoice doesn't leave the rest of the app
// still calling the club a debtor. Derived from the rows every time rather
// than toggled, so a refund correctly un-settles a team too.
async function syncTeamPaidFromLedger(invoiceId: string, teamId: string | null) {
  if (!teamId) return;
  const [invoice, items, payments] = await Promise.all([
    Invoices.byId(invoiceId),
    InvoiceItems.listByInvoice(invoiceId),
    InvoicePayments.listByInvoice(invoiceId),
  ]);
  if (!invoice) return;
  const totals = computeTotals(invoice, items, payments);
  await Teams.setPaid(teamId, totals.balanceCents <= 0 && totals.grandTotalCents > 0);
}

function invoicePaths(tournamentId: string, invoiceId: string): string[] {
  return [
    `/dashboard/tournaments/${tournamentId}/finance`,
    `/dashboard/tournaments/${tournamentId}/finance/invoices/${invoiceId}`,
    `/dashboard/tournaments/${tournamentId}/teams`,
    `/dashboard/tournaments/${tournamentId}`,
  ];
}

// Raises one invoice per entrant that doesn't already have one. Idempotent by
// design — an organizer who adds three teams next week presses the same
// button again and gets three invoices, not a duplicate set.
export async function generateInvoices(tournamentId: string) {
  const { user, tournament } = await requireOwnedTournament(tournamentId);
  requirePermission(user, "FINANCE");
  const [teams, applications, rules, platform] = await Promise.all([
    Teams.listByTournament(tournament.id),
    Applications.listByTournament(tournament.id),
    PaymentSettings.forTournament(tournament.id),
    PlatformFees.get(),
  ]);
  const entrants = teams.filter((t) => t.name);
  const appByTeamId = new Map(applications.filter((a) => a.teamId).map((a) => [a.teamId as string, a]));

  // How many teams each club has entered. The multi-team discount belongs to
  // the club, not the event, so it cannot be read off the entrant count —
  // clubs are matched on the name they applied under, falling back to the
  // team's own name when there is no application behind it.
  const clubOf = (teamId: string, teamName: string) =>
    (appByTeamId.get(teamId)?.clubName || teamName).trim().toLowerCase();
  const teamsPerClub = new Map<string, number>();
  for (const team of entrants) {
    const club = clubOf(team.id, team.name);
    teamsPerClub.set(club, (teamsPerClub.get(club) ?? 0) + 1);
  }

  const year = new Date().getFullYear();
  const issued = new Set(await Invoices.numbersForYear(year));

  for (const team of entrants) {
    if (await Invoices.byTeamId(team.id)) continue;
    const application = appByTeamId.get(team.id);
    const number = nextInvoiceNumber([...issued], year);
    issued.add(number);

    const issuedAt = new Date();
    const clubTeams = teamsPerClub.get(clubOf(team.id, team.name)) ?? 1;
    // One invoice per team, so the club discount is evaluated on the club's
    // full entry count but priced against this team's single fee.
    const quote = quoteRegistration({
      feeCents: tournament.feeCents,
      teamCount: clubTeams,
      rules,
      platform,
      at: issuedAt,
    });
    const perTeam = (cents: number) => Math.round(cents / clubTeams);

    const dueAt = new Date(issuedAt);
    dueAt.setDate(dueAt.getDate() + Math.max(0, rules.balanceDueDays));

    const invoice = await Invoices.create({
      number,
      tournamentId: tournament.id,
      teamId: team.id,
      applicationId: application?.id ?? null,
      billToClub: application?.clubName || team.name,
      billToContact: team.contactName || application?.managerName || "",
      billToEmail: team.contactEmail || application?.managerEmail || "",
      billToPhone: application?.managerPhone ?? null,
      division: application?.division ?? null,
      teamCount: 1,
      issuedAt: issuedAt.toISOString(),
      dueAt: dueAt.toISOString(),
      discountCode: quote.earlyBirdApplied ? "EARLYBIRD" : quote.multiTeamApplied ? "CLUB" : null,
      discountCents: perTeam(quote.discountCents),
      processingFeeCents: perTeam(quote.platformFeeCents),
    });

    await InvoiceItems.create({
      invoiceId: invoice.id,
      description: `Tournament registration fee — ${tournament.name}${application?.division ? ` (${application.division})` : ""}`,
      quantity: 1,
      unitPriceCents: tournament.feeCents,
      discountCents: 0,
      orderIndex: 0,
    });
    if (quote.lateFeeApplied) {
      await InvoiceItems.create({
        invoiceId: invoice.id,
        description: "Late registration fee",
        quantity: 1,
        unitPriceCents: perTeam(quote.lateFeeCents),
        discountCents: 0,
        orderIndex: 1,
      });
    }

    // A deposit rule becomes a real schedule on the invoice rather than a note
    // about one, so the payment-plan panel and the printed copy both show it.
    if (rules.depositMode === "DEPOSIT" && quote.balanceCents > 0) {
      await InvoiceInstallments.replaceForInvoice(invoice.id, [
        { label: "Deposit", amountCents: quote.dueNowCents, dueAt: issuedAt.toISOString() },
        {
          label: "Balance",
          amountCents: quote.balanceCents,
          dueAt: quote.balanceDueAt || dueAt.toISOString(),
        },
      ]);
    }

    // A team already flagged paid before invoicing existed keeps that truth:
    // the ledger opens with a matching recorded payment rather than showing a
    // settled club as newly in arrears.
    if (team.paid && tournament.feeCents > 0) {
      await InvoicePayments.create({
        invoiceId: invoice.id,
        amountCents: tournament.feeCents,
        method: "OTHER",
        reference: null,
        note: "Opening balance — recorded as paid before invoicing was enabled.",
        recordedByName: null,
      });
    }
  }

  revalidatePath(`/dashboard/tournaments/${tournamentId}/finance`);
}

export async function recordInvoicePayment(
  tournamentId: string,
  invoiceId: string,
  formData: FormData
): Promise<ActionResult> {
  return guarded(async () => {
    const { user, invoice } = await requireInvoice(tournamentId, invoiceId);
    const amountCents = parseMoneyToCents(String(formData.get("amount") || ""));
    if (amountCents <= 0) throw new Error("A payment must be greater than zero");
    const methodRaw = String(formData.get("method") || "OTHER");
    const method = (["CASH", "CHECK", "TRANSFER", "CARD", "OTHER"].includes(methodRaw)
      ? methodRaw
      : "OTHER") as PaymentMethod;

    await InvoicePayments.create({
      invoiceId: invoice.id,
      amountCents,
      method,
      reference: String(formData.get("reference") || "").trim() || null,
      note: String(formData.get("note") || "").trim() || null,
      recordedByName: user.name,
    });
    await syncTeamPaidFromLedger(invoice.id, invoice.teamId);
    invoicePaths(tournamentId, invoiceId).forEach((path) => revalidatePath(path));
  });
}

// Refunds and write-offs are the same operation with opposite intent, and
// both are stored as a negative payment so the balance stays one sum over one
// list. Nothing is deleted: the original payment stays in the audit trail
// beside the refund that reversed it.
export async function issueInvoiceRefund(
  tournamentId: string,
  invoiceId: string,
  formData: FormData
): Promise<ActionResult> {
  return guarded(async () => {
    const { user, invoice } = await requireInvoice(tournamentId, invoiceId);
    const amountCents = parseMoneyToCents(String(formData.get("amount") || ""));
    if (amountCents <= 0) throw new Error("A refund must be greater than zero");
    const kind = String(formData.get("kind") || "REFUND") === "ADJUSTMENT" ? "ADJUSTMENT" : "REFUND";

    await InvoicePayments.create({
      invoiceId: invoice.id,
      amountCents: -amountCents,
      method: kind as PaymentMethod,
      reference: String(formData.get("reference") || "").trim() || null,
      note: String(formData.get("note") || "").trim() || null,
      recordedByName: user.name,
    });
    await syncTeamPaidFromLedger(invoice.id, invoice.teamId);
    invoicePaths(tournamentId, invoiceId).forEach((path) => revalidatePath(path));
  });
}

export async function applyInvoiceDiscount(
  tournamentId: string,
  invoiceId: string,
  formData: FormData
): Promise<ActionResult> {
  return guarded(async () => {
    const { invoice } = await requireInvoice(tournamentId, invoiceId);
    const code = String(formData.get("code") || "").trim().toUpperCase() || null;
    const mode = String(formData.get("mode") || "AMOUNT");

    let discountCents: number;
    if (mode === "PERCENT") {
      const percent = Number(String(formData.get("percent") || "0"));
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) throw new Error("Enter a percentage between 0 and 100");
      const items = await InvoiceItems.listByInvoice(invoice.id);
      const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPriceCents, 0);
      discountCents = Math.round((subtotal * percent) / 100);
    } else {
      discountCents = parseMoneyToCents(String(formData.get("amount") || "0"));
    }
    if (discountCents < 0) throw new Error("A discount cannot be negative");

    await Invoices.setDiscount(invoice.id, code, discountCents);
    await syncTeamPaidFromLedger(invoice.id, invoice.teamId);
    invoicePaths(tournamentId, invoiceId).forEach((path) => revalidatePath(path));
  });
}

// Splits the balance into a deposit plus monthly instalments. These are dates
// and amounts to chase, not debits: Jogo has no payment gateway connected, so
// nothing here can take money and the UI says as much rather than implying a
// card is on file.
export async function createInvoicePaymentPlan(
  tournamentId: string,
  invoiceId: string,
  formData: FormData
): Promise<ActionResult> {
  return guarded(async () => {
    const { invoice } = await requireInvoice(tournamentId, invoiceId);
    const [items, payments] = await Promise.all([
      InvoiceItems.listByInvoice(invoice.id),
      InvoicePayments.listByInvoice(invoice.id),
    ]);
    const totals = computeTotals(invoice, items, payments);

    const depositCents = parseMoneyToCents(String(formData.get("deposit") || "0"));
    const count = Number(String(formData.get("installments") || "3"));
    if (!Number.isFinite(count) || count < 1) throw new Error("Choose at least one instalment");

    const firstDueRaw = String(formData.get("firstDue") || "");
    const firstDue = firstDueRaw ? new Date(firstDueRaw) : new Date();
    if (Number.isNaN(firstDue.getTime())) throw new Error("Enter a valid first due date");

    // Built from the outstanding balance, not the grand total: money already
    // banked is not something to schedule again, and a plan whose instalments
    // sum past what is actually owed is a plan an organizer has to mentally
    // correct every time they look at it.
    const plan = buildPaymentPlan(totals.balanceCents, depositCents, count, firstDue);
    await InvoiceInstallments.replaceForInvoice(invoice.id, plan);
    invoicePaths(tournamentId, invoiceId).forEach((path) => revalidatePath(path));
  });
}

export async function setInstallmentPaid(
  tournamentId: string,
  invoiceId: string,
  installmentId: string,
  paid: boolean
) {
  const { invoice } = await requireInvoice(tournamentId, invoiceId);
  const installments = await InvoiceInstallments.listByInvoice(invoice.id);
  if (!installments.some((i) => i.id === installmentId)) throw new Error("Instalment not found");
  await InvoiceInstallments.setPaid(installmentId, paid);
  invoicePaths(tournamentId, invoiceId).forEach((path) => revalidatePath(path));
}

// Emails the club its outstanding balance and records the attempt in the same
// message log the admin inbox already reads, so a reminder is auditable
// alongside every other outbound message. Status is the truth: SENT, FAILED,
// or QUEUED when no provider is configured.
export async function sendInvoiceReminder(
  tournamentId: string,
  invoiceId: string
): Promise<{ status: "SENT" | "QUEUED" | "FAILED"; detail: string }> {
  const { tournament, invoice } = await requireInvoice(tournamentId, invoiceId);
  const [items, payments] = await Promise.all([
    InvoiceItems.listByInvoice(invoice.id),
    InvoicePayments.listByInvoice(invoice.id),
  ]);
  const totals = computeTotals(invoice, items, payments);

  const subject = `${invoice.number} — payment due for ${tournament.name}`;
  const body = [
    `Hello ${invoice.billToContact || invoice.billToClub},`,
    ``,
    `This is a reminder about invoice ${invoice.number} for ${tournament.name}.`,
    ``,
    `Total: ${money(totals.grandTotalCents)}`,
    `Paid to date: ${money(totals.netPaidCents)}`,
    `Balance outstanding: ${money(totals.balanceCents)}`,
    `Due: ${formatDate(invoice.dueAt)}`,
    ``,
    `Please get in touch if you have already sent payment.`,
  ].join("\n");

  const message = await ApplicationMessages.create({
    tournamentId: tournament.id,
    template: "INVOICE_REMINDER",
    audience: `INVOICE:${invoice.number}`,
    subject,
    body,
    recipients: JSON.stringify([invoice.billToEmail]),
    recipientCount: invoice.billToEmail ? 1 : 0,
  });

  const result = await sendBulkEmail([invoice.billToEmail], subject, body);
  if (result.ok) await ApplicationMessages.setStatus(message.id, "SENT");
  else if (result.configured) await ApplicationMessages.setStatus(message.id, "FAILED");

  invoicePaths(tournamentId, invoiceId).forEach((path) => revalidatePath(path));
  revalidatePath("/admin/inbox");

  // The caller is told what actually happened, not that a button was pressed.
  // "Queued" is the honest word when no provider is configured: the reminder
  // is recorded and nothing left the building.
  if (result.ok) return { status: "SENT", detail: `Reminder emailed to ${invoice.billToEmail}.` };
  if (!result.configured) {
    return {
      status: "QUEUED",
      detail: "Recorded, but not sent — no mail provider is configured (set RESEND_API_KEY and MAIL_FROM).",
    };
  }
  return { status: "FAILED", detail: result.reason };
}

// Records that the organizer has the club's paperwork. Jogo does not collect
// or store signed documents, so this is a date-stamped confirmation by a
// named human, not an e-signature — the UI labels it that way.
export async function setTeamWaiverReceived(tournamentId: string, teamId: string, received: boolean) {
  const { tournament } = await requireOwnedTournament(tournamentId);
  const team = await Teams.byId(teamId);
  if (!team || team.tournamentId !== tournament.id) throw new Error("Team not found");
  await Teams.setWaiverReceived(teamId, received);
  revalidatePath(`/dashboard/tournaments/${tournamentId}/finance`);
  const invoice = await Invoices.byTeamId(teamId);
  if (invoice) revalidatePath(`/dashboard/tournaments/${tournamentId}/finance/invoices/${invoice.id}`);
}

export async function saveBusinessIdentity(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  await SiteSettings.setBusiness({
    businessName: String(formData.get("businessName") || "").trim() || null,
    businessAddress: String(formData.get("businessAddress") || "").trim() || null,
    taxId: String(formData.get("taxId") || "").trim() || null,
  });
  revalidatePath("/dashboard/settings");
}

// ---------- Account administration (super admin only) ----------
//
// Every action here is gated on requireAdmin(). The /admin layout already
// redirects non-admins away from the screen, but a screen is not a control:
// server actions are callable directly by anyone who knows their id, so the
// check has to live here too.

function readPermissions(formData: FormData): string {
  const picked = formData
    .getAll("permissions")
    .map((p) => String(p))
    .filter(isPermission);
  return serializePermissions(picked);
}

function readRole(raw: string, fallback: Role = "ORGANIZER"): Role {
  return isRole(raw) ? raw : fallback;
}

export async function inviteUser(formData: FormData): Promise<ActionResult & { inviteUrl?: string }> {
  let inviteUrl: string | undefined;
  const result = await guarded(async () => {
    const admin = await requireAdmin();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const name = String(formData.get("name") || "").trim();
    if (!email || !email.includes("@")) throw new Error("Enter a valid email address");
    if (!name) throw new Error("Enter the person's name");
    if (await Users.byEmail(email)) throw new Error("An account with that email already exists.");

    const role = readRole(String(formData.get("role") || "ORGANIZER"));
    const invite = await UserInvites.create({
      email,
      name,
      phone: String(formData.get("phone") || "").trim() || null,
      organization: String(formData.get("organization") || "").trim() || null,
      role,
      permissions: readPermissions(formData),
      invitedByUserId: admin.id,
      invitedByName: admin.name,
    });

    inviteUrl = `/invite/${invite.token}`;

    // Recorded in the same outbound log the admin inbox reads, and sent if a
    // provider is configured. The link is returned either way so an admin can
    // pass it on by hand when it is not — an invitation nobody can deliver is
    // worse than one you copy into a message yourself.
    const base = process.env.NEXT_PUBLIC_SITE_URL || "";
    const subject = `You have been invited to Jogo as ${ROLE_LABELS[role]}`;
    const body = [
      `Hello ${name},`,
      ``,
      `${admin.name} has invited you to Jogo as ${ROLE_LABELS[role]}.`,
      ``,
      `Set your password to accept: ${base}${inviteUrl}`,
      ``,
      `This link expires on ${formatDate(invite.expiresAt)}.`,
    ].join("\n");

    const message = await ApplicationMessages.create({
      tournamentId: "",
      template: "STAFF_INVITE",
      audience: `INVITE:${role}`,
      subject,
      body,
      recipients: JSON.stringify([email]),
      recipientCount: 1,
    });
    const sent = await sendBulkEmail([email], subject, body);
    if (sent.ok) await ApplicationMessages.setStatus(message.id, "SENT");
    else if (sent.configured) await ApplicationMessages.setStatus(message.id, "FAILED");

    revalidatePath("/admin/users");
  });
  return { ...result, inviteUrl };
}

export async function revokeInvite(inviteId: string): Promise<ActionResult> {
  return guarded(async () => {
    await requireAdmin();
    const invite = await UserInvites.byId(inviteId);
    if (!invite) throw new Error("Invitation not found");
    await UserInvites.revoke(inviteId);
    revalidatePath("/admin/users");
  });
}

export async function updateUserRole(userId: string, formData: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const admin = await requireAdmin();
    const target = await Users.byId(userId);
    if (!target) throw new Error("Account not found");

    const role = readRole(String(formData.get("role") || target.role), target.role);
    // Demoting the last active admin would lock everyone out of this screen
    // with no way back in, so it is refused rather than warned about.
    if (target.role === "ADMIN" && role !== "ADMIN" && (await Users.countActiveAdmins(target.id)) === 0) {
      throw new Error("This is the last active super admin — promote someone else first.");
    }
    if (target.id === admin.id && role !== "ADMIN") {
      throw new Error("You cannot remove your own super admin role.");
    }

    await Users.setRoleAndPermissions(
      userId,
      role,
      readPermissions(formData),
      String(formData.get("organization") || "").trim() || null
    );
    revalidatePath("/admin/users");
  });
}

export async function setUserStatus(userId: string, status: string): Promise<ActionResult> {
  return guarded(async () => {
    const admin = await requireAdmin();
    if (status !== "ACTIVE" && status !== "SUSPENDED") throw new Error("Unknown status");
    const target = await Users.byId(userId);
    if (!target) throw new Error("Account not found");
    if (target.id === admin.id) throw new Error("You cannot suspend your own account.");
    if (status === "SUSPENDED" && target.role === "ADMIN" && (await Users.countActiveAdmins(target.id)) === 0) {
      throw new Error("This is the last active super admin — promote someone else first.");
    }
    await Users.setStatus(userId, status);
    revalidatePath("/admin/users");
  });
}

// A handover: every tournament the outgoing staff member was assigned to
// moves to the incoming one, and their permission grant is copied across.
// This is what makes suspending someone safe — their events do not go dark.
export async function transferPermissions(fromUserId: string, formData: FormData): Promise<ActionResult> {
  return guarded(async () => {
    await requireAdmin();
    const toUserId = String(formData.get("toUserId") || "");
    if (!toUserId) throw new Error("Choose who to transfer to");
    if (toUserId === fromUserId) throw new Error("Pick a different account");

    const [from, to] = await Promise.all([Users.byId(fromUserId), Users.byId(toUserId)]);
    if (!from || !to) throw new Error("Account not found");

    await TournamentStaff.transferAll(fromUserId, toUserId);
    // The recipient ends up with the union of both grants: a handover must not
    // quietly strip powers the recipient already had.
    const merged = Array.from(
      new Set([...effectivePermissions(from.role, from.permissions), ...effectivePermissions(to.role, to.permissions)])
    );
    await Users.setRoleAndPermissions(toUserId, to.role, serializePermissions(merged), to.organization);
    revalidatePath("/admin/users");
  });
}

export async function assignStaffToTournament(userId: string, formData: FormData): Promise<ActionResult> {
  return guarded(async () => {
    await requireAdmin();
    const tournamentId = String(formData.get("tournamentId") || "");
    if (!tournamentId) throw new Error("Choose a tournament");
    if (!(await Tournaments.byId(tournamentId))) throw new Error("Tournament not found");
    if (!(await Users.byId(userId))) throw new Error("Account not found");
    await TournamentStaff.assign(tournamentId, userId);
    revalidatePath("/admin/users");
  });
}

// Public: the invited person setting their own password. Not admin-gated, and
// deliberately so — the bearer token in the URL is the authorisation.
export async function acceptInvite(token: string, formData: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const invite = await UserInvites.byToken(token);
    if (!invite) throw new Error("This invitation link is not valid.");
    if (invite.revokedAt) throw new Error("This invitation has been revoked.");
    if (invite.acceptedAt) throw new Error("This invitation has already been used.");
    if (new Date(invite.expiresAt).getTime() < Date.now()) throw new Error("This invitation has expired.");

    const password = String(formData.get("password") || "");
    if (password.length < 8) throw new Error("Password must be at least 8 characters");

    if (await Users.byEmail(invite.email)) throw new Error("An account with that email already exists.");

    const user = await Users.create(invite.email, await hashPassword(password), invite.name, invite.role, {
      status: "ACTIVE",
      permissions: invite.permissions,
      organization: invite.organization,
      phone: invite.phone,
      invitedByUserId: invite.invitedByUserId,
    });
    // Marked used only after the account exists, so a failure part-way leaves
    // the invitation still claimable rather than burning it.
    await UserInvites.markAccepted(invite.id);
    await Users.touchSignIn(user.id);

    cookies().set(sessionCookieName(), await createSessionToken(user.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    revalidatePath("/admin/users");
  });
}

// ---------- Payment configuration ----------

function readBool(formData: FormData, name: string): boolean {
  return formData.get(name) != null;
}

function readInt(formData: FormData, name: string, fallback: number): number {
  const n = Number(String(formData.get(name) ?? ""));
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

// A date input gives "2026-10-01" with no timezone. Stored as an ISO instant
// at local midnight so lib/pricing.ts's day-granularity comparisons line up
// with what the organizer typed rather than landing a day early west of UTC.
function readDate(formData: FormData, name: string): string | null {
  const raw = String(formData.get(name) || "").trim();
  if (!raw) return null;
  const d = new Date(`${raw}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function saveTournamentPaymentSettings(
  tournamentId: string,
  formData: FormData
): Promise<ActionResult> {
  return guarded(async () => {
    const { user, tournament } = await requireOwnedTournament(tournamentId);
    requirePermission(user, "FINANCE");

    const depositPercent = readInt(formData, "depositPercent", 50);
    if (depositPercent < 1 || depositPercent > 100) throw new Error("Deposit percentage must be between 1 and 100");
    const multiTeamPercent = readInt(formData, "multiTeamPercent", 0);
    if (multiTeamPercent < 0 || multiTeamPercent > 100) throw new Error("Club discount must be between 0 and 100");

    await PaymentSettings.save(tournament.id, {
      depositMode: String(formData.get("depositMode")) === "DEPOSIT" ? "DEPOSIT" : "FULL",
      depositBasis: String(formData.get("depositBasis")) === "PERCENT" ? "PERCENT" : "FLAT",
      depositCents: parseMoneyToCents(String(formData.get("depositAmount") || "0")),
      depositPercent,
      balanceDueDays: Math.max(0, readInt(formData, "balanceDueDays", 30)),
      earlyBirdUntil: readDate(formData, "earlyBirdUntil"),
      earlyBirdDiscountCents: parseMoneyToCents(String(formData.get("earlyBirdDiscount") || "0")),
      lateFeeAfter: readDate(formData, "lateFeeAfter"),
      lateFeeCents: parseMoneyToCents(String(formData.get("lateFee") || "0")),
      multiTeamMinTeams: Math.max(0, readInt(formData, "multiTeamMinTeams", 0)),
      multiTeamPercent,
      acceptCheck: readBool(formData, "acceptCheck"),
      acceptCash: readBool(formData, "acceptCash"),
      acceptZelle: readBool(formData, "acceptZelle"),
      acceptWire: readBool(formData, "acceptWire"),
      offlineInstructions: String(formData.get("offlineInstructions") || "").trim() || null,
      manualApproval: readBool(formData, "manualApproval"),
      reminderDaysBefore: Math.max(0, readInt(formData, "reminderDaysBefore", 7)),
      reminderOnDueDate: readBool(formData, "reminderOnDueDate"),
      reminderDaysAfter: Math.max(0, readInt(formData, "reminderDaysAfter", 3)),
    });

    revalidatePath(`/dashboard/tournaments/${tournamentId}/payments`);
    revalidatePath(`/dashboard/tournaments/${tournamentId}/finance`);
    revalidatePath(`/t/${tournament.slug}/register/pay`);
  });
}

export async function savePlatformFeeSettings(formData: FormData): Promise<ActionResult> {
  return guarded(async () => {
    await requireAdmin();
    const modeRaw = String(formData.get("mode") || "PERCENT");
    const mode = modeRaw === "FLAT" || modeRaw === "TIERED" ? modeRaw : "PERCENT";

    // Entered as a percentage, stored as basis points: 2.5 -> 250. Keeping it
    // an integer means a fee calculation never picks up float drift.
    const percent = Number(String(formData.get("percent") || "0"));
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      throw new Error("Enter a percentage between 0 and 100");
    }

    await PlatformFees.save({
      mode,
      percentBps: Math.round(percent * 100),
      flatCents: parseMoneyToCents(String(formData.get("flat") || "0")),
      tierName: String(formData.get("tierName") || "Starter").trim() || "Starter",
      tierMonthlyCents: parseMoneyToCents(String(formData.get("tierMonthly") || "0")),
      passThrough: readBool(formData, "passThrough"),
    });
    revalidatePath("/admin/finance/platform");
  });
}

export async function recordPlatformPayout(tournamentId: string, formData: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const admin = await requireAdmin();
    if (!(await Tournaments.byId(tournamentId))) throw new Error("Tournament not found");
    const amountCents = parseMoneyToCents(String(formData.get("amount") || ""));
    if (amountCents <= 0) throw new Error("A payout must be greater than zero");
    await PlatformPayouts.create({
      tournamentId,
      amountCents,
      reference: String(formData.get("reference") || "").trim() || null,
      note: String(formData.get("note") || "").trim() || null,
      recordedByName: admin.name,
    });
    revalidatePath("/admin/finance/platform");
  });
}

/**
 * Sends the reminders that are due today under this tournament's schedule.
 *
 * Nothing runs this on a timer — Jogo has no scheduler or background worker —
 * so it is a button an organizer presses, and the UI says so rather than
 * implying a cron is quietly working the overdue list.
 */
export async function sendDueReminders(
  tournamentId: string
): Promise<{ error?: string; checked: number; sent: number; detail: string }> {
  try {
    const { user, tournament } = await requireOwnedTournament(tournamentId);
    requirePermission(user, "FINANCE");
    const [rules, invoices, totals] = await Promise.all([
      PaymentSettings.forTournament(tournament.id),
      Invoices.listByTournament(tournament.id),
      Invoices.totalsByTournament(tournament.id),
    ]);

    let sent = 0;
    const notes: string[] = [];
    for (const invoice of invoices) {
      const roll = totals.get(invoice.id) ?? { chargedCents: 0, paidCents: 0 };
      const balance = Math.max(0, roll.chargedCents - invoice.discountCents + invoice.processingFeeCents) - roll.paidCents;
      if (balance <= 0) continue; // settled invoices are not chased
      const due = dueReminders(invoice.dueAt, rules);
      if (due.length === 0) continue;

      const subject = `${invoice.number} — payment reminder for ${tournament.name}`;
      const body = [
        `Hello ${invoice.billToContact || invoice.billToClub},`,
        ``,
        `A reminder that ${money(balance)} is outstanding on invoice ${invoice.number}.`,
        `Due ${formatDate(invoice.dueAt)} (${due.map((d) => d.label).join(", ")}).`,
      ].join("\n");

      const message = await ApplicationMessages.create({
        tournamentId: tournament.id,
        template: "PAYMENT_REMINDER",
        audience: `INVOICE:${invoice.number}`,
        subject,
        body,
        recipients: JSON.stringify([invoice.billToEmail]),
        recipientCount: invoice.billToEmail ? 1 : 0,
      });
      const result = await sendBulkEmail([invoice.billToEmail], subject, body);
      if (result.ok) await ApplicationMessages.setStatus(message.id, "SENT");
      else if (result.configured) await ApplicationMessages.setStatus(message.id, "FAILED");
      sent++;
      notes.push(`${invoice.number} (${due.map((d) => d.label).join(", ")})`);
    }

    revalidatePath(`/dashboard/tournaments/${tournamentId}/payments`);
    revalidatePath("/admin/inbox");

    if (sent === 0) {
      return { checked: invoices.length, sent: 0, detail: "No invoice falls on a reminder date today." };
    }
    return {
      checked: invoices.length,
      sent,
      detail: mailerConfigured()
        ? `Emailed ${sent} reminder${sent === 1 ? "" : "s"}: ${notes.join(", ")}.`
        : `Recorded ${sent} reminder${sent === 1 ? "" : "s"} but sent nothing — no mail provider is configured.`,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong.", checked: 0, sent: 0, detail: "" };
  }
}

// ---------- Match events, squads, officials ----------
//
// Two authorities act on a match: the organizer who owns the tournament, and
// the official assigned to that specific match. The second is new — the
// scorepad could only ever be a wireframe while a referee had no account and
// no way to prove a match was theirs.

async function requireMatchOfficial(matchId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  const match = await Matches.byId(matchId);
  if (!match) throw new Error("Match not found");
  const tournament = await Tournaments.byId(match.tournamentId);
  if (!tournament) throw new Error("Match not found");

  // The organizer, an assigned staff member, or the platform admin may always
  // act. A referee may act only on a match they are the assigned official for.
  if (tournament.ownerId === user.id || user.role === "ADMIN") return { user, match, tournament };
  if (await TournamentStaff.isAssigned(tournament.id, user.id)) return { user, match, tournament };
  if (match.refereeId) {
    const mine = await Referees.listByUserId(user.id);
    if (mine.some((r) => r.id === match.refereeId)) return { user, match, tournament };
  }
  throw new Error("This match is not assigned to you.");
}

/** The squad a coach manages: their own team, or one they organize. */
async function requireCoachTeam(teamId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  const team = await Teams.byId(teamId);
  if (!team) throw new Error("Team not found");
  if (team.userId === user.id) return { user, team };
  const tournament = await Tournaments.byId(team.tournamentId);
  if (!tournament) throw new Error("Team not found");
  if (tournament.ownerId === user.id || user.role === "ADMIN") return { user, team };
  if (await TournamentStaff.isAssigned(tournament.id, user.id)) return { user, team };
  throw new Error("This team is not yours to manage.");
}

export async function updatePlayerProfile(playerId: string, formData: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const player = await Players.byId(playerId);
    if (!player) throw new Error("Player not found");
    await requireCoachTeam(player.teamId);

    const gradRaw = String(formData.get("graduationYear") || "").trim();
    const graduationYear = gradRaw ? Number(gradRaw) : null;
    if (graduationYear !== null && (!Number.isFinite(graduationYear) || graduationYear < 1900 || graduationYear > 2100)) {
      throw new Error("Enter a graduation year like 2029");
    }

    const url = String(formData.get("videoUrl") || "").trim() || null;
    // Only https, and only a URL — an arbitrary string here ends up in an
    // iframe src, and javascript: in an href is the classic way that goes
    // wrong.
    if (url) {
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        throw new Error("Enter a full video URL starting with https://");
      }
      if (parsed.protocol !== "https:") throw new Error("Video links must start with https://");
    }

    const privacyRaw = String(formData.get("videoPrivacy") || "PRIVATE");
    const videoPrivacy = ["PUBLIC", "SCOUTS", "PRIVATE"].includes(privacyRaw) ? privacyRaw : "PRIVATE";

    await Players.updateProfile(playerId, {
      jerseyNumber: String(formData.get("jerseyNumber") || "").trim() || null,
      position: String(formData.get("position") || "").trim() || null,
      secondaryPosition: String(formData.get("secondaryPosition") || "").trim() || null,
      graduationYear,
      videoUrl: url,
      videoPrivacy,
    });
    revalidatePath(`/player/${playerId}`);
    revalidatePath("/coach/dashboard");
  });
}

export async function recordPlayerMetrics(playerId: string, formData: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const player = await Players.byId(playerId);
    if (!player) throw new Error("Player not found");
    const { user } = await requireCoachTeam(player.teamId);

    // Entered in display units, stored in hundredths so no measurement is
    // ever a float. Blank means "not tested", which is different from zero.
    const hundredths = (name: string): number | null => {
      const raw = String(formData.get(name) || "").trim();
      if (!raw) return null;
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) throw new Error(`Enter a number for ${name}, or leave it blank`);
      return Math.round(n * 100);
    };

    const row = {
      playerId,
      sprint40Hundredths: hundredths("sprint40"),
      verticalJumpHundredths: hundredths("verticalJump"),
      topSpeedHundredths: hundredths("topSpeed"),
      distanceHundredths: hundredths("distance"),
      yoyoHundredths: hundredths("yoyo"),
      recordedByName: user.name,
    };
    if (Object.values(row).every((v) => v === null || typeof v === "string")) {
      throw new Error("Enter at least one measurement");
    }
    await PlayerMetrics.create(row);
    revalidatePath(`/player/${playerId}`);
  });
}

export async function logMatchEvent(matchId: string, formData: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const { user, match } = await requireMatchOfficial(matchId);
    const typeRaw = String(formData.get("type") || "");
    if (!["GOAL", "ASSIST", "YELLOW", "RED"].includes(typeRaw)) throw new Error("Unknown event type");

    const playerId = String(formData.get("playerId") || "").trim() || null;
    // A card must name someone: an unattributed yellow cannot suspend anybody
    // and quietly breaks the eligibility read further down the line.
    if ((typeRaw === "YELLOW" || typeRaw === "RED") && !playerId) {
      throw new Error("Pick the player who was carded");
    }
    if (playerId) {
      const player = await Players.byId(playerId);
      if (!player) throw new Error("Player not found");
    }

    const minuteRaw = String(formData.get("minute") || "").trim();
    const minute = minuteRaw ? Number(minuteRaw) : null;
    if (minute !== null && (!Number.isFinite(minute) || minute < 0 || minute > 200)) {
      throw new Error("Enter a minute between 0 and 200");
    }

    await MatchEvents.create({
      matchId,
      tournamentId: match.tournamentId,
      teamId: String(formData.get("teamId") || "").trim() || null,
      playerId,
      type: typeRaw as MatchEventType,
      minute,
      note: String(formData.get("note") || "").trim() || null,
      recordedByName: user.name,
    });
    revalidatePath(`/referee/${matchId}`);
    revalidatePath(`/dashboard/tournaments/${match.tournamentId}/scores`);
    if (playerId) revalidatePath(`/player/${playerId}`);
  });
}

export async function deleteMatchEvent(matchId: string, eventId: string): Promise<ActionResult> {
  return guarded(async () => {
    const { match } = await requireMatchOfficial(matchId);
    const event = await MatchEvents.byId(eventId);
    if (!event || event.matchId !== match.id) throw new Error("Event not found");
    await MatchEvents.remove(eventId);
    revalidatePath(`/referee/${matchId}`);
    if (event.playerId) revalidatePath(`/player/${event.playerId}`);
  });
}

/** Marks a red card's suspension as served, which is what restores eligibility. */
export async function setRedCardCleared(tournamentId: string, eventId: string, cleared: boolean): Promise<ActionResult> {
  return guarded(async () => {
    const { user } = await requireOwnedTournament(tournamentId);
    requirePermission(user, "ROSTER");
    const event = await MatchEvents.byId(eventId);
    if (!event || event.tournamentId !== tournamentId) throw new Error("Event not found");
    await MatchEvents.setCleared(eventId, cleared);
    if (event.playerId) revalidatePath(`/player/${event.playerId}`);
    revalidatePath("/coach/dashboard");
  });
}

export async function setPlayerAvailability(
  matchId: string,
  playerId: string,
  status: string
): Promise<ActionResult> {
  return guarded(async () => {
    if (!["ATTENDING", "INJURED", "ABSENT", "NO_REPLY"].includes(status)) throw new Error("Unknown status");
    const player = await Players.byId(playerId);
    if (!player) throw new Error("Player not found");
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");
    // The player's own account may answer for themselves; otherwise this has
    // to be someone who manages the squad.
    if (player.userId !== user.id) await requireCoachTeam(player.teamId);
    await Availability.set(matchId, playerId, status as AvailabilityStatus);
    revalidatePath("/coach/dashboard");
    revalidatePath("/me");
  });
}

/**
 * Emails the squad's contacts asking them to confirm availability. Recorded in
 * the same outbound log as every other message, and honest about delivery: the
 * mailer reports SENT, FAILED, or QUEUED when no provider is configured.
 */
export async function sendCallUps(teamId: string, matchId: string): Promise<{ error?: string; detail: string }> {
  try {
    const { user, team } = await requireCoachTeam(teamId);
    const tournament = await Tournaments.byId(team.tournamentId);
    const match = await Matches.byId(matchId);
    if (!tournament || !match) throw new Error("Match not found");

    const when = match.scheduledAt ? formatDate(match.scheduledAt) : "a date to be confirmed";
    const subject = `${team.name} — call-up for ${match.round}`;
    const body = [
      `${team.name} play ${match.round} on ${when}${match.field ? ` at ${match.field}` : ""}.`,
      ``,
      `Please reply to confirm whether your player is available.`,
      ``,
      `— ${user.name}, ${tournament.name}`,
    ].join("\n");

    // One address: the squad contact on the team record. There is no
    // per-parent contact list in the schema, so pretending to reach each
    // family individually would overstate what actually goes out.
    const recipients = [team.contactEmail].filter(Boolean) as string[];
    const message = await ApplicationMessages.create({
      tournamentId: tournament.id,
      template: "CALL_UP",
      audience: `TEAM:${team.name}`,
      subject,
      body,
      recipients: JSON.stringify(recipients),
      recipientCount: recipients.length,
    });
    const result = await sendBulkEmail(recipients, subject, body);
    if (result.ok) await ApplicationMessages.setStatus(message.id, "SENT");
    else if (result.configured) await ApplicationMessages.setStatus(message.id, "FAILED");

    revalidatePath("/coach/dashboard");
    return {
      detail: result.ok
        ? `Call-up emailed to ${recipients.join(", ")}.`
        : result.configured
          ? `Not sent: ${result.reason}`
          : "Recorded, but not sent — no mail provider is configured.",
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong.", detail: "" };
  }
}

export async function saveLineup(teamId: string, matchId: string, formData: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const { team } = await requireCoachTeam(teamId);
    const formation = String(formData.get("formation") || "4-3-3");
    const slotsRaw = String(formData.get("slots") || "{}");
    // Parsed and re-serialised rather than trusted: this string is written by
    // the client and read back as JSON on every render.
    let parsed: unknown;
    try {
      parsed = JSON.parse(slotsRaw);
    } catch {
      throw new Error("Could not read that lineup");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Could not read that lineup");
    const squad = new Set((await Players.listByTeam(team.id)).map((p) => p.id));
    const clean: Record<string, string> = {};
    for (const [slot, pid] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof pid === "string" && squad.has(pid)) clean[slot] = pid;
    }
    // Arrows are coordinate quads in the same 0-100 percentage space as the
    // slots. Clamped rather than trusted: this is client-written JSON that is
    // read straight back into an SVG path on every render.
    let arrows: string | null = null;
    const arrowsRaw = String(formData.get("arrows") || "").trim();
    if (arrowsRaw) {
      let list: unknown;
      try {
        list = JSON.parse(arrowsRaw);
      } catch {
        throw new Error("Could not read those arrows");
      }
      if (!Array.isArray(list)) throw new Error("Could not read those arrows");
      const clamp = (n: unknown) => Math.max(0, Math.min(100, Number(n) || 0));
      arrows = JSON.stringify(
        list
          .filter((a): a is Record<string, unknown> => Boolean(a) && typeof a === "object")
          .slice(0, 40)
          .map((a) => ({ x1: clamp(a.x1), y1: clamp(a.y1), x2: clamp(a.x2), y2: clamp(a.y2) }))
      );
    }

    await Lineups.save(
      matchId,
      team.id,
      formation,
      JSON.stringify(clean),
      arrows,
      String(formData.get("notes") || "").trim() || null
    );
    revalidatePath("/coach/dashboard");
  });
}

export async function submitMatchReport(matchId: string, formData: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const { user, match } = await requireMatchOfficial(matchId);
    const home = Number(String(formData.get("homeScore") || ""));
    const away = Number(String(formData.get("awayScore") || ""));
    if (!Number.isFinite(home) || !Number.isFinite(away) || home < 0 || away < 0) {
      throw new Error("Enter both final scores");
    }

    // A signature is a PNG the official drew on a canvas. Anything else is
    // refused rather than stored and rendered back into an <img>.
    const signature = (name: string): string | null => {
      const raw = String(formData.get(name) || "");
      if (!raw) return null;
      if (!raw.startsWith("data:image/png;base64,")) throw new Error("Signature could not be read");
      if (raw.length > 200_000) throw new Error("Signature image is too large");
      return raw;
    };

    // The referee is the only signatory now. The marshal columns are no longer
    // written by any form, so an older report that carries a countersignature
    // keeps it through a resubmit rather than being blanked by absent fields.
    const existing = await MatchReports.byMatch(matchId);

    await MatchReports.save({
      matchId,
      homeScore: home,
      awayScore: away,
      notes: String(formData.get("notes") || "").trim() || null,
      refereeName: String(formData.get("refereeName") || "").trim() || user.name,
      refereeSignature: signature("refereeSignature"),
      marshalName: existing?.marshalName ?? null,
      marshalSignature: existing?.marshalSignature ?? null,
    });

    // The report is the record of the result, so the match itself is updated
    // to match it — otherwise standings would keep showing the live score a
    // referee has since corrected on the card.
    await Matches.updateScore(matchId, home, away, "FINAL");
    revalidatePath(`/referee/${matchId}`);
    revalidatePath(`/dashboard/tournaments/${match.tournamentId}/scores`);
    revalidatePath(`/dashboard/tournaments/${match.tournamentId}`);
  });
}

export async function updateRefereeProfile(
  tournamentId: string,
  refereeId: string,
  formData: FormData
): Promise<ActionResult> {
  return guarded(async () => {
    const { user } = await requireOwnedTournament(tournamentId);
    requirePermission(user, "ROSTER");
    const referee = await Referees.byId(refereeId);
    if (!referee || referee.tournamentId !== tournamentId) throw new Error("Referee not found");

    const ratingRaw = String(formData.get("ratingPct") || "").trim();
    const ratingPct = ratingRaw ? Number(ratingRaw) : null;
    if (ratingPct !== null && (!Number.isFinite(ratingPct) || ratingPct < 0 || ratingPct > 100)) {
      throw new Error("Rating must be between 0 and 100");
    }

    // Linking an account is what lets this official sign in and score their
    // own matches, so the email has to resolve to a real user.
    const email = String(formData.get("accountEmail") || "").trim().toLowerCase();
    let userId: string | null = referee.userId;
    if (email) {
      const account = await Users.byEmail(email);
      if (!account) throw new Error("No account exists with that email — invite them from Accounts first.");
      userId = account.id;
    } else if (formData.get("unlink")) {
      userId = null;
    }

    await Referees.updateProfile(refereeId, {
      certification: String(formData.get("certification") || "").trim() || null,
      ratingPct,
      contact: String(formData.get("contact") || "").trim() || referee.contact,
      userId,
    });
    revalidatePath(`/admin/referees`);
    revalidatePath(`/referee/profile/${refereeId}`);
    revalidatePath(`/dashboard/tournaments/${tournamentId}/referees`);
  });
}

export async function setRefereeFee(
  tournamentId: string,
  matchId: string,
  refereeId: string,
  formData: FormData
): Promise<ActionResult> {
  return guarded(async () => {
    const { user } = await requireOwnedTournament(tournamentId);
    requirePermission(user, "FINANCE");
    const role = String(formData.get("role") || "CENTER");
    await RefereeFees.set(
      matchId,
      refereeId,
      ["CENTER", "AR1", "AR2", "FOURTH"].includes(role) ? role : "CENTER",
      parseMoneyToCents(String(formData.get("fee") || "0"))
    );
    revalidatePath("/admin/referees");
    revalidatePath(`/referee/profile/${refereeId}`);
  });
}

// ---------- Broadcasts & live event status ----------

/**
 * Sends one message to a resolved audience and records it in the same
 * outbound log every other message in Jogo lands in.
 *
 * Recipients are resolved server-side from the scope, never taken from the
 * form: a client-supplied recipient list on a broadcast endpoint is a way to
 * mail arbitrary strangers through someone else's tournament.
 */
export async function sendBroadcast(
  tournamentId: string,
  formData: FormData
): Promise<{ error?: string; detail: string; count: number }> {
  try {
    const { user, tournament } = await requireOwnedTournament(tournamentId);
    requirePermission(user, "COMMUNICATION");

    const subject = String(formData.get("subject") || "").trim();
    const body = String(formData.get("body") || "").trim();
    if (!subject || !body) throw new Error("Subject and message are both required");

    const scopeRaw = String(formData.get("scope") || "ALL");
    const scope = (["ALL", "DIVISION", "COACHES", "REFEREES"] as const).includes(scopeRaw as any)
      ? (scopeRaw as AudienceScope)
      : "ALL";
    const division = String(formData.get("division") || "").trim() || null;
    const priority = String(formData.get("priority") || "STANDARD") === "URGENT" ? "URGENT" : "STANDARD";

    const [teams, referees, applications] = await Promise.all([
      Teams.listByTournament(tournament.id),
      Referees.listByTournament(tournament.id),
      Applications.listByTournament(tournament.id),
    ]);
    const audience = resolveAudience(scope, division, { teams, referees, applications });

    // Recorded even when it reaches nobody. An organizer who pressed send on a
    // weather alert needs the log to show what happened, not silence.
    const message = await ApplicationMessages.create({
      tournamentId: tournament.id,
      template: String(formData.get("template") || "") || null,
      audience: scope === "DIVISION" && division ? `DIVISION:${division}` : scope,
      subject,
      body,
      recipients: JSON.stringify(audience.emails),
      recipientCount: audience.emails.length,
      priority,
    });

    if (audience.emails.length === 0) {
      revalidatePath("/communication");
      return {
        detail: audience.note || "Nobody in that audience has an email address on file, so nothing was sent.",
        count: 0,
      };
    }

    const result = await sendBulkEmail(audience.emails, subject, body);
    if (result.ok) await ApplicationMessages.setStatus(message.id, "SENT");
    else if (result.configured) await ApplicationMessages.setStatus(message.id, "FAILED");

    revalidatePath("/communication");
    revalidatePath("/admin/inbox");
    revalidatePath(`/t/${tournament.slug}`);

    return {
      count: audience.emails.length,
      detail: result.ok
        ? `Sent to ${audience.emails.length} recipient${audience.emails.length === 1 ? "" : "s"}.${
            priority === "URGENT" ? " It is also showing as a banner on the public event page." : ""
          }`
        : result.configured
          ? `Not sent: ${result.reason}`
          : `Recorded for ${audience.emails.length} recipient${audience.emails.length === 1 ? "" : "s"}, but nothing was emailed — no mail provider is configured.${
              priority === "URGENT" ? " The public banner is live regardless." : ""
            }`,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong.", detail: "", count: 0 };
  }
}

/** The rainout switch. One write, and every public surface says the same thing. */
export async function setEventStatus(tournamentId: string, formData: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const { user, tournament } = await requireOwnedTournament(tournamentId);
    requirePermission(user, "COMMUNICATION");
    const statusRaw = String(formData.get("eventStatus") || "OPEN");
    if (!isEventStatus(statusRaw)) throw new Error("Unknown status");
    await Tournaments.setEventStatus(
      tournament.id,
      statusRaw,
      String(formData.get("eventStatusNote") || "").trim() || null
    );
    revalidatePath("/communication");
    revalidatePath(`/t/${tournament.slug}`);
  });
}
