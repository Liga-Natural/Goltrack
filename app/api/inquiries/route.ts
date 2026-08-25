import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Inquiries } from "@/lib/models";

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  tournamentType: z.string().max(60).optional(),
  message: z.string().min(1).max(2000),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }
  Inquiries.create(parsed.data);
  return NextResponse.json({ ok: true });
}
