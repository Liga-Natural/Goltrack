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
  slugify,
  Format,
} from "@/lib/models";
import { getCurrentUser } from "@/lib/auth";
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
  const tournament = Tournaments.byId(tournamentId);
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
  while (Tournaments.slugExists(slug)) {
    n++;
    slug = `${baseSlug}-${n}`;
  }

  const tournament = Tournaments.create({
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
  Teams.create({ tournamentId: tournament.id, name, contactName, contactEmail, logoUrl });
  revalidatePath(`/dashboard/tournaments/${tournamentId}/teams`);
}

export async function removeTeam(tournamentId: string, teamId: string) {
  await requireOwnedTournament(tournamentId);
  Teams.remove(teamId);
  revalidatePath(`/dashboard/tournaments/${tournamentId}/teams`);
}

export async function createTeamInvite(tournamentId: string) {
  await requireOwnedTournament(tournamentId);
  Teams.createInvite(tournamentId);
  revalidatePath(`/dashboard/tournaments/${tournamentId}/teams`);
}

// Organizer-side crest upload, from the tournament's Teams management page.
export async function uploadTeamCrest(tournamentId: string, teamId: string, formData: FormData) {
  const { tournament } = await requireOwnedTournament(tournamentId);
  const team = Teams.byId(teamId);
  if (!team || team.tournamentId !== tournament.id) throw new Error("Team not found");
  const file = formData.get("crest");
  if (!(file instanceof File)) throw new Error("No file uploaded");
  const { bytes, mimeType } = await validateCrestFile(file);
  Teams.setCrest(teamId, bytes, mimeType);
  revalidatePath(`/dashboard/tournaments/${tournamentId}/teams`);
  revalidatePath(`/t/${tournament.slug}`);
  revalidatePath(`/t/${tournament.slug}/teams/${teamId}`);
}

// No-login, token-based self-service crest upload for a team's own
// manager/coach — same trust model as the existing invite-link token
// (long random, unguessable), except this one is never consumed, so it can
// be reused to replace the crest later.
export async function uploadTeamCrestPublic(token: string, formData: FormData) {
  const team = Teams.byLogoToken(token);
  if (!team) throw new Error("This crest upload link is invalid.");
  const file = formData.get("crest");
  if (!(file instanceof File)) throw new Error("No file uploaded");
  const { bytes, mimeType } = await validateCrestFile(file);
  Teams.setCrest(team.id, bytes, mimeType);
  const tournament = Tournaments.byId(team.tournamentId);
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
  Players.create({ teamId, name, jerseyNumber });
  revalidatePath(`/dashboard/tournaments/${tournamentId}/teams`);
}

export async function setTeamPaid(tournamentId: string, teamId: string, paid: boolean) {
  await requireOwnedTournament(tournamentId);
  Teams.setPaid(teamId, paid);
  revalidatePath(`/dashboard/tournaments/${tournamentId}/teams`);
}

export async function setTeamCheckedIn(tournamentId: string, teamId: string, checkedIn: boolean) {
  await requireOwnedTournament(tournamentId);
  Teams.setCheckedIn(teamId, checkedIn);
  revalidatePath(`/dashboard/tournaments/${tournamentId}/checkin`);
}

export async function checkInPlayerByPassport(tournamentId: string, passportId: string) {
  await requireOwnedTournament(tournamentId);
  const player = Players.byPassportId(passportId.trim());
  if (!player) return { ok: false, message: "No player found with that passport ID." };
  const team = Teams.byId(player.teamId);
  if (!team || team.tournamentId !== tournamentId) {
    return { ok: false, message: "That passport belongs to a different tournament." };
  }
  CheckIns.create(tournamentId, player.id);
  revalidatePath(`/dashboard/tournaments/${tournamentId}/checkin`);
  return { ok: true, message: `${player.name} (${team.name}) checked in.` };
}

export async function addReferee(tournamentId: string, formData: FormData) {
  await requireOwnedTournament(tournamentId);
  const name = String(formData.get("name") || "").trim();
  const contact = String(formData.get("contact") || "").trim() || null;
  if (!name) throw new Error("Referee name required");
  Referees.create({ tournamentId, name, contact });
  revalidatePath(`/dashboard/tournaments/${tournamentId}/referees`);
}

export async function assignReferee(tournamentId: string, matchId: string, refereeId: string) {
  await requireOwnedTournament(tournamentId);
  Matches.assignReferee(matchId, refereeId || null);
  revalidatePath(`/dashboard/tournaments/${tournamentId}/referees`);
  revalidatePath(`/dashboard/tournaments/${tournamentId}/scores`);
}

export async function setMatchMotm(tournamentId: string, matchId: string, playerId: string) {
  await requireOwnedTournament(tournamentId);
  Matches.setMotm(matchId, playerId || null);
  revalidatePath(`/dashboard/tournaments/${tournamentId}/scores`);
}

export async function generateSchedule(tournamentId: string) {
  const { tournament } = await requireOwnedTournament(tournamentId);
  const teams = Teams.listByTournament(tournamentId).filter((t) => t.name); // skip unclaimed invite slots
  if (teams.length < 2) throw new Error("Add at least two teams first");

  Matches.deleteByTournament(tournamentId);

  const startTime = new Date(tournament.startDate);
  const surfaceWord = getSportTheme(tournament.sport).surfaceWord;
  let generated;
  if (tournament.format === "ROUND_ROBIN") {
    generated = generateRoundRobinOnly(teams, { fieldsCount: tournament.fieldsCount, startTime, surfaceWord });
    teams.forEach((t) => Teams.setGroup(t.id, null));
  } else {
    generated = generateGroupStage(teams, {
      groupsCount: tournament.groupsCount,
      fieldsCount: tournament.fieldsCount,
      startTime,
      surfaceWord,
    });
    // Persist group assignments back onto the teams.
    const byId = new Map(teams.map((t) => [t.id, t]));
    for (const m of generated) {
      if (m.homeTeamId && m.groupName) Teams.setGroup(m.homeTeamId, m.groupName);
      if (m.awayTeamId && m.groupName) Teams.setGroup(m.awayTeamId, m.groupName);
    }
  }

  for (const m of generated) {
    Matches.create({
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

  Tournaments.updateStatus(tournamentId, "SCHEDULED");
  revalidatePath(`/dashboard/tournaments/${tournamentId}`);
  revalidatePath(`/dashboard/tournaments/${tournamentId}/schedule`);
}

export async function generateKnockout(tournamentId: string) {
  const { tournament } = await requireOwnedTournament(tournamentId);
  const teams = Teams.listByTournament(tournamentId);
  const matches = Matches.listByTournament(tournamentId);

  // Remove any previously generated knockout matches (keep group stage).
  const groupMatches = matches.filter((m) => m.stage === "GROUP");
  const toDelete = matches.filter((m) => m.stage === "KNOCKOUT");
  for (const m of toDelete) {
    dbRun(`DELETE FROM matches WHERE id = $id`, { $id: m.id } as any);
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
    Matches.create({
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
  Matches.updateScore(matchId, homeScore, awayScore, status);
  revalidatePath(`/dashboard/tournaments/${tournamentId}/scores`);
  revalidatePath(`/dashboard/tournaments/${tournamentId}/schedule`);
}

export async function setTournamentStatus(tournamentId: string, status: "DRAFT" | "REGISTRATION_OPEN" | "SCHEDULED" | "LIVE" | "COMPLETED") {
  await requireOwnedTournament(tournamentId);
  Tournaments.updateStatus(tournamentId, status);
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
  SiteSettings.setAccentColor(hex);
  // The accent color reaches every route, not just one tournament's pages,
  // so revalidate the whole tree rather than a single path.
  revalidatePath("/", "layout");
}

// ---------- Public actions (registration + demo payment) ----------

export async function registerTeamPublic(slug: string, formData: FormData) {
  const tournament = Tournaments.bySlug(slug);
  if (!tournament) throw new Error("Tournament not found");

  const name = String(formData.get("name") || "").trim();
  const contactName = String(formData.get("contactName") || "").trim();
  const contactEmail = String(formData.get("contactEmail") || "").trim();
  const logoUrl = String(formData.get("logoUrl") || "").trim() || null;
  if (!name || !contactName || !contactEmail) throw new Error("All team fields are required");

  const team = Teams.create({ tournamentId: tournament.id, name, contactName, contactEmail, logoUrl });

  const playerNames = formData.getAll("playerName") as string[];
  const playerJerseys = formData.getAll("playerJersey") as string[];
  playerNames.forEach((pname, i) => {
    const trimmed = pname.trim();
    if (!trimmed) return;
    Players.create({ teamId: team.id, name: trimmed, jerseyNumber: playerJerseys[i]?.trim() || null });
  });

  redirect(`/t/${slug}/register/pay?team=${team.id}`);
}

export async function claimTeamInvite(token: string, formData: FormData) {
  const team = Teams.byInviteToken(token);
  if (!team) throw new Error("This invite link is invalid or has already been used.");
  const tournament = Tournaments.byId(team.tournamentId);
  if (!tournament) throw new Error("Tournament not found");

  const name = String(formData.get("name") || "").trim();
  const contactName = String(formData.get("contactName") || "").trim();
  const contactEmail = String(formData.get("contactEmail") || "").trim();
  const logoUrl = String(formData.get("logoUrl") || "").trim() || null;
  if (!name || !contactName || !contactEmail) throw new Error("All team fields are required");

  const claimed = Teams.claimInvite(team.id, { name, contactName, contactEmail, logoUrl });
  if (!claimed) throw new Error("Could not claim this invite");

  const playerNames = formData.getAll("playerName") as string[];
  const playerJerseys = formData.getAll("playerJersey") as string[];
  playerNames.forEach((pname, i) => {
    const trimmed = pname.trim();
    if (!trimmed) return;
    Players.create({ teamId: claimed.id, name: trimmed, jerseyNumber: playerJerseys[i]?.trim() || null });
  });

  redirect(`/t/${tournament.slug}/register/pay?team=${claimed.id}`);
}

export async function markTeamPaidDemo(teamId: string) {
  const team = Teams.byId(teamId);
  if (!team) throw new Error("Team not found");
  Teams.setPaid(teamId, true);
  const tournament = Tournaments.byId(team.tournamentId);
  redirect(`/t/${tournament?.slug}?paid=1`);
}
