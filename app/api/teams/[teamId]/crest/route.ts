import { NextRequest, NextResponse } from "next/server";
import { Teams } from "@/lib/models";

// Serves an uploaded team crest straight out of the SQLite BLOB column.
// Two headers matter for safety, not just correctness:
// - X-Content-Type-Options: nosniff stops a browser from re-interpreting an
//   SVG served as image/svg+xml as something it isn't.
// - Content-Security-Policy locks the response down to a static image even
//   for an SVG payload, so a crafted <script> inside one can't execute if
//   someone opens this URL directly instead of going through an <img> tag.
export async function GET(_req: NextRequest, { params }: { params: { teamId: string } }) {
  const crest = await Teams.crestBytes(params.teamId);
  if (!crest) {
    return NextResponse.json({ error: "No crest uploaded for this team" }, { status: 404 });
  }

  return new NextResponse(Buffer.from(crest.blob), {
    status: 200,
    headers: {
      "Content-Type": crest.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
