import { NextRequest, NextResponse } from "next/server";
import { Players, Teams, Tournaments, TournamentStaff } from "@/lib/models";
import { getCurrentUser } from "@/lib/auth";

// A player's headshot. Not public: these are photographs of children, so the
// only people who can fetch one are the player themselves, a coach of their
// squad, the organizer of the event that squad plays in, assigned staff, and
// an admin. Everyone else gets a 404 rather than a 403 — an unauthorized
// viewer learns nothing about whether a photo exists.
export async function GET(_req: NextRequest, { params }: { params: { playerId: string } }) {
  const notFound = NextResponse.json({ error: "Not found" }, { status: 404 });

  const user = await getCurrentUser();
  if (!user) return notFound;

  const player = await Players.byId(params.playerId);
  if (!player) return notFound;

  let allowed = user.role === "ADMIN" || player.userId === user.id;
  if (!allowed && player.teamId) {
    const team = await Teams.byId(player.teamId);
    if (team) {
      if (team.userId === user.id) allowed = true;
      else {
        const tournament = await Tournaments.byId(team.tournamentId);
        if (tournament?.ownerId === user.id) allowed = true;
        else if (tournament && (await TournamentStaff.isAssigned(tournament.id, user.id))) allowed = true;
      }
    }
  }
  // A self-registered player with no squad yet is only visible to admins and
  // organizers, who are the people reviewing them.
  if (!allowed && !player.teamId && user.role === "ORGANIZER") allowed = true;
  if (!allowed) return notFound;

  const photo = await Players.photoBytes(params.playerId);
  if (!photo) return notFound;

  return new NextResponse(Buffer.from(photo.blob), {
    status: 200,
    headers: {
      "Content-Type": photo.mimeType,
      // Private: a shared cache must never hand this to the next viewer.
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
