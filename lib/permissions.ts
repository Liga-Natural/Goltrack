import type { Role, User } from "@/lib/models";

// Access control, in one place, so a permission check can never disagree with
// itself between the UI that hides a button and the action that must refuse
// the request. The UI is a convenience; the server-side check is the control.

export type Permission = "FINANCE" | "SCHEDULE_OVERRIDE" | "ROSTER" | "COMMUNICATION" | "SETTINGS";
export type AccountStatus = "ACTIVE" | "INVITED" | "SUSPENDED";

export const ALL_PERMISSIONS: Permission[] = ["FINANCE", "SCHEDULE_OVERRIDE", "ROSTER", "COMMUNICATION", "SETTINGS"];

export const PERMISSION_LABELS: Record<Permission, { label: string; detail: string }> = {
  FINANCE: {
    label: "Financial access",
    detail: "View and edit invoices, the payment ledger, and discounts.",
  },
  SCHEDULE_OVERRIDE: {
    label: "Schedule override",
    detail: "Generate and modify brackets, and override scheduling conflicts.",
  },
  ROSTER: {
    label: "Roster & eligibility",
    detail: "Accept or decline applications and change team rosters.",
  },
  COMMUNICATION: {
    label: "Communication",
    detail: "Send broadcast messages to applicants and managers.",
  },
  // Added with the optional modules. ADMIN and ORGANIZER spread
  // ALL_PERMISSIONS, so both pick this up without another edit, and a stored
  // null still means "role defaults" — no existing account loses anything by
  // the set growing.
  SETTINGS: {
    label: "Event settings",
    detail: "Switch optional modules on or off, and configure sponsors, the venue map and fair-play rules.",
  },
};

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Super admin",
  ORGANIZER: "Director",
  REFEREE: "Referee",
  TEAM_MANAGER: "Team manager",
  PLAYER: "Player / parent",
};

// Colour is semantic here, not decorative: a role tag has to be identifiable
// at a glance in a long table, so each role keeps one hue everywhere.
export const ROLE_BADGE_CLASS: Record<Role, string> = {
  ADMIN: "role-admin",
  ORGANIZER: "role-director",
  REFEREE: "role-referee",
  TEAM_MANAGER: "role-manager",
  PLAYER: "role-player",
};

export const STATUS_BADGE_CLASS: Record<AccountStatus, string> = {
  ACTIVE: "badge-accepted",
  INVITED: "badge-pending",
  SUSPENDED: "badge-danger",
};

// What a role can do when nobody has said otherwise.
//
// ORGANIZER gets the full set deliberately: a director owns the tournaments
// they created, and narrowing that would take away powers accounts already
// have — a regression dressed up as a security improvement. The toggles exist
// to *restrict* staff invited onto someone else's event, which is the case
// where a narrower grant is genuinely meaningful.
export const ROLE_DEFAULT_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [...ALL_PERMISSIONS],
  ORGANIZER: [...ALL_PERMISSIONS],
  REFEREE: [],
  TEAM_MANAGER: [],
  PLAYER: [],
};

export function isPermission(value: string): value is Permission {
  return (ALL_PERMISSIONS as string[]).includes(value);
}

/**
 * A stored `null` means "whatever this role gets by default" rather than
 * "nothing". Every account that predates this column has null, so reading it
 * as an empty grant would silently strip working accounts of their access on
 * deploy.
 */
export function effectivePermissions(role: Role, stored: string | null | undefined): Permission[] {
  if (stored == null || stored === "") return ROLE_DEFAULT_PERMISSIONS[role] ?? [];
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return ROLE_DEFAULT_PERMISSIONS[role] ?? [];
    return parsed.filter((p): p is Permission => typeof p === "string" && isPermission(p));
  } catch {
    return ROLE_DEFAULT_PERMISSIONS[role] ?? [];
  }
}

export function serializePermissions(list: Permission[]): string {
  return JSON.stringify(ALL_PERMISSIONS.filter((p) => list.includes(p)));
}

type PermissionSubject = Pick<User, "role" | "permissions" | "status">;

/**
 * The single question every gated action asks. A suspended account can do
 * nothing at all, whatever its role or grants — that is what makes "revoke
 * access" mean something before the session expires.
 */
export function can(user: PermissionSubject | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  if (user.status === "SUSPENDED") return false;
  if (user.role === "ADMIN") return true; // the platform owner is not gated by delegated grants
  return effectivePermissions(user.role, user.permissions).includes(permission);
}

export function isActive(user: Pick<User, "status"> | null | undefined): boolean {
  return Boolean(user) && user!.status !== "SUSPENDED";
}
