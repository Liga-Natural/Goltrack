import type { Player } from "@/lib/models";

// What "verified" means for a player account, in one place, so the badge a
// coach reads and the guard that blocks a matchday roster can never disagree.
//
// Two separate things are being checked and they are not the same strength:
//
//   - The face check runs in the applicant's own browser. It is a real
//     detector (a TinyFaceDetector model, served from this app rather than a
//     third-party API), but it runs on hardware the applicant controls, so
//     it can be lied to. It is treated as a pre-screen: it stops the honest
//     mistake of uploading a team crest or a blurry pocket shot, nothing more.
//   - The age document is decided by a person. An organizer or an admin opens
//     the birth certificate and says yes or no. Nothing here reads a document
//     automatically and nothing pretends to.
//
// So a player is cleared for a matchday roster only once a human has looked.

export type FaceCheck = "PASSED" | "FAILED" | "MISSING";
export type AgeStatus = "VERIFIED" | "PENDING" | "REJECTED" | "MISSING";

export interface VerificationState {
  face: FaceCheck;
  age: AgeStatus;
  /** May this player be placed in a matchday roster? */
  rosterEligible: boolean;
  /** Why not, said plainly enough to show a coach. */
  blockedReason: string | null;
}

export function verificationFor(player: Pick<Player, "photoUpdatedAt" | "faceCheckStatus" | "ageDocUploadedAt" | "ageStatus">): VerificationState {
  const face: FaceCheck = !player.photoUpdatedAt
    ? "MISSING"
    : player.faceCheckStatus === "PASSED"
      ? "PASSED"
      : "FAILED";

  const age: AgeStatus = !player.ageDocUploadedAt
    ? "MISSING"
    : player.ageStatus === "VERIFIED"
      ? "VERIFIED"
      : player.ageStatus === "REJECTED"
        ? "REJECTED"
        : "PENDING";

  const reasons: string[] = [];
  if (face !== "PASSED") reasons.push(face === "MISSING" ? "no headshot on file" : "the headshot failed the face check");
  if (age === "MISSING") reasons.push("no proof-of-age document uploaded");
  else if (age === "PENDING") reasons.push("their document is still waiting on an organizer");
  else if (age === "REJECTED") reasons.push("their document was rejected");

  return {
    face,
    age,
    rosterEligible: face === "PASSED" && age === "VERIFIED",
    blockedReason: reasons.length ? reasons.join(" and ") : null,
  };
}

/**
 * Whether the verification pipeline applies to this player at all.
 *
 * A squad built before this existed is a list of names a coach typed in:
 * no headshot, no document, nobody to chase. Blocking those from a lineup
 * sheet would lock every existing tournament out of its own team sheet on
 * the day this ships, so the guard covers players who came through
 * self-registration — the ones who have an account and uploaded something.
 * A coach can still type a name to sidestep it; that gap closes by an
 * organizer requiring registered accounts, not by breaking live events.
 */
export function isRegisteredAccount(
  player: Pick<Player, "userId" | "photoUpdatedAt" | "ageDocUploadedAt">
): boolean {
  return !!player.userId && (!!player.photoUpdatedAt || !!player.ageDocUploadedAt);
}

export const FACE_LABEL: Record<FaceCheck, string> = {
  PASSED: "PHOTO VERIFIED",
  FAILED: "PHOTO REJECTED",
  MISSING: "NO PHOTO",
};

export const AGE_LABEL: Record<AgeStatus, string> = {
  VERIFIED: "AGE VERIFIED",
  PENDING: "DOCUMENT PENDING VERIFICATION",
  REJECTED: "DOCUMENT REJECTED",
  MISSING: "NO DOCUMENT",
};

// Mint for cleared, amber for waiting on a person, red for refused. The badge
// classes already carry those three tones across both themes.
export const FACE_CLASS: Record<FaceCheck, string> = {
  PASSED: "badge-accepted",
  FAILED: "badge-danger",
  MISSING: "bg-neutralBadge text-ink2 border border-line",
};

export const AGE_CLASS: Record<AgeStatus, string> = {
  VERIFIED: "badge-accepted",
  PENDING: "badge-pending",
  REJECTED: "badge-danger",
  MISSING: "bg-neutralBadge text-ink2 border border-line",
};

export const AGE_DOC_TYPES = [
  { value: "BIRTH_CERTIFICATE", label: "Birth certificate" },
  { value: "PASSPORT", label: "Passport" },
  { value: "GOVERNMENT_ID", label: "State ID / driver’s licence" },
] as const;

export function ageDocLabel(value: string | null): string {
  return AGE_DOC_TYPES.find((d) => d.value === value)?.label ?? "Document";
}

export const POSITIONS = [
  "Goalkeeper",
  "Centre-back",
  "Full-back",
  "Defensive midfield",
  "Central midfield",
  "Attacking midfield",
  "Winger",
  "Striker",
] as const;

export const GENDERS = [
  { value: "FEMALE", label: "Female" },
  { value: "MALE", label: "Male" },
  { value: "OTHER", label: "Other" },
  { value: "UNDISCLOSED", label: "Prefer not to say" },
] as const;

/** Age on a given day, from a yyyy-mm-dd birthdate. */
export function ageFrom(birthdate: string | null, on = new Date()): number | null {
  if (!birthdate) return null;
  const born = new Date(birthdate);
  if (Number.isNaN(born.getTime())) return null;
  let age = on.getFullYear() - born.getFullYear();
  const m = on.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && on.getDate() < born.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}
