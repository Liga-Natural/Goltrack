import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Users } from "@/lib/models";
import { hashPassword, createSessionToken, sessionCookieName } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }
  const { name, email, password } = parsed.data;
  if (await Users.byEmail(email.toLowerCase())) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }
  const passwordHash = await hashPassword(password);
  // This is the public /signup page — the paying-customer flow — so it
  // always creates an organizer account. Team managers and players get
  // their accounts through team registration and passport claim instead
  // (see lib/actions.ts), not through this form.
  const user = await Users.create(email.toLowerCase(), passwordHash, name, "ORGANIZER");
  const token = await createSessionToken(user.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
