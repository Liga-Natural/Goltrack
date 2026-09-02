import { NextRequest, NextResponse } from "next/server";
import { Sponsors } from "@/lib/models";

// A sponsor's logo, straight out of the blob column. Public by nature — it is
// advertising on a public page — with the same nosniff and sandbox headers
// the team crest route uses, because an SVG is a document that can carry
// script if a browser is talked into treating it as one.
export async function GET(_req: NextRequest, { params }: { params: { sponsorId: string } }) {
  const logo = await Sponsors.logoBytes(params.sponsorId);
  if (!logo) return NextResponse.json({ error: "No logo" }, { status: 404 });
  return new NextResponse(Buffer.from(logo.blob), {
    status: 200,
    headers: {
      "Content-Type": logo.mimeType,
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
