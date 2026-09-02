import { NextRequest, NextResponse } from "next/server";
import { Players } from "@/lib/models";
import { getCurrentUser } from "@/lib/auth";

// The proof-of-age document — a birth certificate, passport or government ID.
// This is the most sensitive thing the app stores, so the rule is narrow and
// has no team-level exceptions: admins and organizers only. A coach cannot
// open it, the player's own club cannot open it, and it never appears on any
// public surface. Anyone else gets a 404.
export async function GET(_req: NextRequest, { params }: { params: { playerId: string } }) {
  const notFound = NextResponse.json({ error: "Not found" }, { status: 404 });

  const user = await getCurrentUser();
  if (!user) return notFound;
  if (user.role !== "ADMIN" && user.role !== "ORGANIZER") return notFound;

  const doc = await Players.ageDocBytes(params.playerId);
  if (!doc) return notFound;

  return new NextResponse(Buffer.from(doc.blob), {
    status: 200,
    headers: {
      "Content-Type": doc.mimeType,
      // Never cached anywhere: an identity document should not sit in a disk
      // cache after the reviewer closes the tab.
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Content-Disposition": "inline",
    },
  });
}
