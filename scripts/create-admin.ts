import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { Users } from "../lib/models";

// One-off local helper: creates (or reports the existing) admin account
// against whichever database this runs against (dev.db locally, the
// production DB if run with that env). Never wires into the app's request
// path — this is meant to be run by hand, once, by the person who should
// hold the credentials.
//
// Usage: npx tsx scripts/create-admin.ts <email> [name]
// A random password is generated and printed once — it is not stored
// anywhere in plaintext, so save it immediately (a password manager, not a
// commit).

function genPassword(): string {
  return randomBytes(12).toString("base64url");
}

async function main() {
  const email = process.argv[2];
  const name = process.argv[3] || "Admin";
  if (!email) {
    console.error("Usage: npx tsx scripts/create-admin.ts <email> [name]");
    process.exit(1);
  }

  const existing = await Users.byEmail(email.toLowerCase());
  if (existing) {
    console.log(`An account for ${email} already exists (id: ${existing.id}).`);
    console.log("Use the normal login form — this script doesn't reset passwords.");
    return;
  }

  const password = genPassword();
  const user = await Users.create(email.toLowerCase(), await bcrypt.hash(password, 10), name, "ADMIN");

  console.log("Admin account created:");
  console.log(`  email:    ${user.email}`);
  console.log(`  password: ${password}`);
  console.log("Save this password now — it will not be shown again.");
}

// The Postgres pool keeps a connection open, which would otherwise leave
// this one-off script hanging instead of exiting after main() finishes.
main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
