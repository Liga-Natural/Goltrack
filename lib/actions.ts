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
  slugify,
  Format,
} from "@/lib/models";
import { cookies } from "next/headers";
import { getCurrentUser, hashPassword, verifyPassword, createSessionToken, sessionCookieName } from "@/lib/auth";
import { generateGroupStage, generateRoundRobinOnly, generateKnockoutBracket } from "@/lib/bracket";
import { computeStandings, groupNames } from "@/lib/standings";
import { getSportTheme } from "@/lib/sportTheme";
import { isValidHex } from "@/lib/colorRamp";

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

async function requireOwnedTournament(tournamentId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  const tournament = await Tournaments.byId(tournamentId);
  if (!tournament || tournament.ownerId !== user.id) throw new Error("Not found");
  return { user, tournament };
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
    ownerId: user.id,
  });

  redirect(`/dashboard/tournaments/${tournament.id}`);
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
  await requireOwnedTournament(tournamentId);
  await Teams.setPaid(teamId, paid);
  revalidatePath(`/dashboard/tournaments/${tournamentId}/teams`);
}

export async function setTeamCheckedIn(tournamentId: string, teamId: string, checkedIn: boolean) {
  await requireOwnedTournament(tournamentId);
  await Teams.setCheckedIn(teamId, checkedIn);
  revalidatePath(`/dashboard/tournaments/${tournamentId}/checkin`);
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
  const { tournament } = await requireOwnedTournament(tournamentId);
  const allTeams = await Teams.listByTournament(tournamentId);
  const teams = allTeams.filter((t) => t.name); // skip unclaimed invite slots
  if (teams.length < 2) throw new Error("Add at least two teams first");

  await Matches.deleteByTournament(tournamentId);

  const startTime = new Date(tournament.startDate);
  const surfaceWord = getSportTheme(tournament.sport).surfaceWord;
  let generated;
  if (tournament.format === "ROUND_ROBIN") {
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
  const { tournament } = await requireOwnedTournament(tournamentId);
  const teams = await Teams.listByTournament(tournamentId);
  const matches = await Matches.listByTournament(tournamentId);

  // Remove any previously generated knockout matches (keep group stage).
  const groupMatches = matches.filter((m) => m.stage === "GROUP");
  const toDelete = matches.filter((m) => m.stage === "KNOCKOUT");
  for (const m of toDelete) {
    await dbRun(`DELETE FROM matches WHERE id = $id`, { $id: m.id } as any);
  }

  const qualifiers: string[] = [];
  if (tournament.format === "ROUND_ROBIN") {
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
