import { NextRequest, NextResponse } from "next/server";
import { MediaItems, Tournaments, TournamentStaff } from "@/lib/models";
import { getCurrentUser } from "@/lib/auth";
import { moduleSettings } from "@/lib/actions";

// A gallery photo. An approved one is public, because the gallery it belongs
// to is; anything still in the queue or rejected is visible only to the
// people who moderate it. A 404 rather than a 403 throughout, so an outsider
// cannot probe for the existence of a photo an organizer turned down.
export async function GET(_req: NextRequest, { params }: { params: { mediaId: string } }) {
  const notFound = NextResponse.json({ error: "Not found" }, { status: 404 });

  const item = await MediaItems.byId(params.mediaId);
  if (!item) return notFound;

  const settings = await moduleSettings(item.tournamentId);
  let allowed = settings.mediaEnabled && item.status === "APPROVED";

  if (!allowed) {
    const user = await getCurrentUser();
    if (!user) return notFound;
    const tournament = await Tournaments.byId(item.tournamentId);
    allowed =
      user.role === "ADMIN" ||
      item.uploadedByUserId === user.id ||
      tournament?.ownerId === user.id ||
      (tournament ? await TournamentStaff.isAssigned(tournament.id, user.id) : false);
  }
  if (!allowed) return notFound;

  const image = await MediaItems.imageBytes(params.mediaId);
  if (!image) return notFound;

  return new NextResponse(Buffer.from(image.blob), {
    status: 200,
    headers: {
      "Content-Type": image.mimeType,
      // Private while it is still under review; a moderator's browser must
      // not leave an unapproved photo in a shared cache.
      "Cache-Control": item.status === "APPROVED" ? "public, max-age=3600" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
