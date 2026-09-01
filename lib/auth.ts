import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { Users, User, Role } from "./models";

const SESSION_COOKIE = "jogo_session";
const secretKey = new TextEncoder().encode(process.env.SESSION_SECRET || "dev-only-secret-change-me-32chars");

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey);
}

export async function verifySessionToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (typeof payload.userId === "string") return { userId: payload.userId };
    return null;
  } catch {
    return null;
  }
}

export function sessionCookieName() {
  return SESSION_COOKIE;
}

export async function getCurrentUser(): Promise<User | null> {
  const store = cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  const user = await Users.byId(payload.userId);
  if (!user) return null;
  // A suspended account is treated as signed out everywhere, immediately.
  // Checking only at sign-in would leave a revoked staff member working
  // normally until their 30-day session expired, which is the opposite of
  // what "revoke access" has to mean.
  if (user.status === "SUSPENDED") return null;
  return user;
}

// The one place that decides where each account type lands — used by the
// login form's post-submit redirect and by every role-gated layout's
// wrong-role redirect, so the mapping can't drift between the two.
export function roleHome(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "REFEREE":
      // Referees have no desk view of their own — the scorepad is reached
      // per-match from the link an organizer shares, so the tournament list
      // is the only honest landing place until one exists.
      return "/dashboard";
    case "TEAM_MANAGER":
      return "/team";
    case "PLAYER":
      return "/me";
    default:
      return "/dashboard";
  }
}
