"use client";

import { useMemo, useState, useTransition } from "react";
import { Portal } from "./Portal";
import {
  inviteUser,
  updateUserRole,
  setUserStatus,
  transferPermissions,
  assignStaffToTournament,
  revokeInvite,
} from "@/lib/actions";
import {
  ALL_PERMISSIONS,
  PERMISSION_LABELS,
  ROLE_BADGE_CLASS,
  ROLE_LABELS,
  STATUS_BADGE_CLASS,
  effectivePermissions,
} from "@/lib/permissions";
import type { AccountStatus, Permission } from "@/lib/permissions";
import type { Role, UserSummary, UserInvite } from "@/lib/models";
import { formatDate } from "@/lib/invoices";

// Roles an admin can hand out from this screen. Player accounts are created by
// claiming a passport, not by invitation, so offering it here would produce an
// account that never links to a player.
const ASSIGNABLE_ROLES: Role[] = ["ADMIN", "ORGANIZER", "REFEREE", "TEAM_MANAGER"];

type Dialog =
  | { kind: "invite" }
  | { kind: "edit"; user: UserSummary }
  | { kind: "transfer"; user: UserSummary }
  | { kind: "assign"; user: UserSummary }
  | null;

export function UserAdminWorkspace({
  users,
  invites,
  tournaments,
  assignmentCounts,
  currentUserId,
}: {
  users: UserSummary[];
  invites: UserInvite[];
  tournaments: { id: string; name: string }[];
  assignmentCounts: Record<string, number>;
  currentUserId: string;
}) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | Role>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | AccountStatus>("ALL");
  const [assignedFilter, setAssignedFilter] = useState<"ALL" | "ASSIGNED" | "UNASSIGNED">("ALL");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
      if (statusFilter !== "ALL" && u.status !== statusFilter) return false;
      const assigned = (assignmentCounts[u.id] ?? 0) > 0;
      if (assignedFilter === "ASSIGNED" && !assigned) return false;
      if (assignedFilter === "UNASSIGNED" && assigned) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.organization || "").toLowerCase().includes(q)
      );
    });
  }, [users, query, roleFilter, statusFilter, assignedFilter, assignmentCounts]);

  function run(action: () => Promise<{ error?: string } | void>, onDone?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = (await action()) as { error?: string } | undefined;
      if (result?.error) setError(result.error);
      else {
        onDone?.();
        setDialog(null);
      }
    });
  }

  const close = () => {
    setDialog(null);
    setError(null);
    setInviteLink(null);
  };

  return (
    <div className="space-y-5">
      <div className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <input
            className="input flex-1 min-w-[12rem]"
            placeholder="Search name, email, or club"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search users"
          />
          <Select label="Role" value={roleFilter} onChange={(v) => setRoleFilter(v as "ALL" | Role)}>
            <option value="ALL">All roles</option>
            {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
          <Select label="Status" value={statusFilter} onChange={(v) => setStatusFilter(v as "ALL" | AccountStatus)}>
            <option value="ALL">Any status</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </Select>
          <Select
            label="Assignment"
            value={assignedFilter}
            onChange={(v) => setAssignedFilter(v as "ALL" | "ASSIGNED" | "UNASSIGNED")}
          >
            <option value="ALL">Any assignment</option>
            <option value="ASSIGNED">On a tournament</option>
            <option value="UNASSIGNED">Unassigned</option>
          </Select>
          <button type="button" className="btn-primary text-sm shrink-0" onClick={() => setDialog({ kind: "invite" })}>
            + Invite user / assign role
          </button>
        </div>
        <p className="text-[11px] text-ink3 mt-3">
          {filtered.length} of {users.length} account{users.length === 1 ? "" : "s"}
        </p>
      </div>

      {error && !dialog && (
        <p className="text-sm text-warning-500" role="alert">
          {error}
        </p>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[52rem]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-ink3 border-b border-lineSoft">
                <th className="text-left font-semibold px-5 py-3">User</th>
                <th className="text-left font-semibold px-3 py-3">Role</th>
                <th className="text-left font-semibold px-3 py-3">Organization</th>
                <th className="text-left font-semibold px-3 py-3">Last sign-in</th>
                <th className="text-left font-semibold px-3 py-3">Status</th>
                <th className="text-right font-semibold px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lineSoft">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-ink2">
                    No accounts match those filters.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const assigned = assignmentCounts[u.id] ?? 0;
                  const suspended = u.status === "SUSPENDED";
                  return (
                    <tr key={u.id} className={suspended ? "opacity-60" : ""}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar name={u.name} />
                          <div className="min-w-0">
                            <p className="font-semibold truncate">
                              {u.name}
                              {u.id === currentUserId && <span className="text-ink3 font-normal"> · you</span>}
                            </p>
                            <p className="text-xs text-ink3 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`badge ${ROLE_BADGE_CLASS[u.role]} text-[10px] whitespace-nowrap`}>
                          {ROLE_LABELS[u.role].toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-ink2">
                        <span className="block truncate max-w-[10rem]">{u.organization || "—"}</span>
                        {assigned > 0 && (
                          <span className="text-[11px] text-ink3">
                            {assigned} tournament{assigned === 1 ? "" : "s"}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-ink2 whitespace-nowrap">
                        {u.lastSignInAt ? formatDate(u.lastSignInAt) : "Never"}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`badge ${STATUS_BADGE_CLASS[(u.status as AccountStatus) ?? "ACTIVE"] ?? "badge-pending"} text-[10px]`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <RowActions
                          disabled={pending}
                          isSelf={u.id === currentUserId}
                          suspended={suspended}
                          onEdit={() => setDialog({ kind: "edit", user: u })}
                          onTransfer={() => setDialog({ kind: "transfer", user: u })}
                          onAssign={() => setDialog({ kind: "assign", user: u })}
                          onToggleStatus={() =>
                            run(() => setUserStatus(u.id, suspended ? "ACTIVE" : "SUSPENDED"))
                          }
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending invitations are accounts-in-waiting, not accounts, so they sit
          in their own list rather than being faked as rows in the table above
          with an INVITED badge and no user behind them. */}
      <div className="card p-5">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-3">Pending invitations</h2>
        {invites.length === 0 ? (
          <p className="text-sm text-ink2 py-4 text-center">No invitations outstanding.</p>
        ) : (
          <ul className="divide-y divide-lineSoft">
            {invites.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 py-3">
                <Avatar name={inv.name} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{inv.name}</p>
                  <p className="text-xs text-ink3 truncate">
                    {inv.email} · invited by {inv.invitedByName || "—"} · expires {formatDate(inv.expiresAt)}
                  </p>
                </div>
                <span className={`badge ${ROLE_BADGE_CLASS[inv.role]} text-[10px] shrink-0`}>
                  {ROLE_LABELS[inv.role].toUpperCase()}
                </span>
                <span className="badge badge-pending text-[10px] shrink-0">INVITED</span>
                <button
                  type="button"
                  className="btn-ghost text-[11px] px-2.5 py-1.5 shrink-0"
                  disabled={pending}
                  onClick={() => run(() => revokeInvite(inv.id))}
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {dialog && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <button
              type="button"
              aria-label="Close"
              className="absolute inset-0 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm"
              onClick={close}
            />
            <div className="relative modal-panel rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              {dialog.kind === "invite" &&
                (inviteLink ? (
                  <InviteResult link={inviteLink} onClose={close} />
                ) : (
                  <InviteForm
                    pending={pending}
                    error={error}
                    onCancel={close}
                    onSubmit={(fd) =>
                      startTransition(async () => {
                        setError(null);
                        const result = await inviteUser(fd);
                        if (result.error) setError(result.error);
                        else setInviteLink(result.inviteUrl ?? null);
                      })
                    }
                  />
                ))}

              {dialog.kind === "edit" && (
                <EditForm
                  user={dialog.user}
                  pending={pending}
                  error={error}
                  onCancel={close}
                  onSubmit={(fd) => run(() => updateUserRole(dialog.user.id, fd))}
                />
              )}

              {dialog.kind === "transfer" && (
                <TransferForm
                  user={dialog.user}
                  candidates={users.filter((u) => u.id !== dialog.user.id && u.status !== "SUSPENDED")}
                  assigned={assignmentCounts[dialog.user.id] ?? 0}
                  pending={pending}
                  error={error}
                  onCancel={close}
                  onSubmit={(fd) => run(() => transferPermissions(dialog.user.id, fd))}
                />
              )}

              {dialog.kind === "assign" && (
                <AssignForm
                  user={dialog.user}
                  tournaments={tournaments}
                  pending={pending}
                  error={error}
                  onCancel={close}
                  onSubmit={(fd) => run(() => assignStaffToTournament(dialog.user.id, fd))}
                />
              )}
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span className="h-8 w-8 shrink-0 rounded-full bg-black/10 flex items-center justify-center text-[11px] font-display text-inkDisplay">
      {initials || "?"}
    </span>
  );
}

function RowActions({
  disabled,
  isSelf,
  suspended,
  onEdit,
  onTransfer,
  onAssign,
  onToggleStatus,
}: {
  disabled: boolean;
  isSelf: boolean;
  suspended: boolean;
  onEdit: () => void;
  onTransfer: () => void;
  onAssign: () => void;
  onToggleStatus: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex justify-end">
      <button
        type="button"
        className="btn-ghost text-[11px] px-2.5 py-1.5"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Manage ▾
      </button>
      {open && (
        <>
          {/* A full-screen catcher rather than a blur listener: clicking any
              other row's menu button should close this one and open that one
              in a single click, which a blur handler swallows. */}
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 top-full mt-1 z-20 modal-panel rounded-xl py-1 w-52 text-left shadow-xl"
          >
            <MenuItem onClick={() => { setOpen(false); onEdit(); }} disabled={disabled}>
              Edit role &amp; permissions
            </MenuItem>
            <MenuItem onClick={() => { setOpen(false); onAssign(); }} disabled={disabled}>
              Assign to tournament
            </MenuItem>
            <MenuItem onClick={() => { setOpen(false); onTransfer(); }} disabled={disabled}>
              Transfer permissions
            </MenuItem>
            <MenuItem
              onClick={() => { setOpen(false); onToggleStatus(); }}
              disabled={disabled || isSelf}
              tone="danger"
            >
              {suspended ? "Restore access" : "Revoke access"}
            </MenuItem>
            {isSelf && (
              <p className="text-[10px] text-ink3 px-3 pt-1 pb-1.5">
                You cannot revoke your own access.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  disabled,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "danger";
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`block w-full text-left px-3 py-2 text-xs hover:bg-black/[0.06] disabled:opacity-40 disabled:cursor-not-allowed ${
        tone === "danger" ? "text-warning-500" : "text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    // w-auto overrides the w-full baked into .input, which otherwise makes
    // each filter claim its own row and turns the toolbar into a stack.
    <select
      className="input text-xs shrink-0 w-auto"
      value={value}
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
    >
      {children}
    </select>
  );
}

function RoleTiles({ name, defaultValue }: { name: string; defaultValue: Role }) {
  const [selected, setSelected] = useState<Role>(defaultValue);
  return (
    <fieldset>
      <legend className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-2">Role</legend>
      <div className="grid grid-cols-2 gap-2">
        {ASSIGNABLE_ROLES.map((role) => (
          <label
            key={role}
            className={`cursor-pointer rounded-xl border p-3 transition-colors ${
              selected === role ? "border-pitch-400 bg-pitch-400/10" : "border-line hover:border-black/25"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={role}
              checked={selected === role}
              onChange={() => setSelected(role)}
              className="sr-only"
            />
            <span className={`badge ${ROLE_BADGE_CLASS[role]} text-[10px]`}>{ROLE_LABELS[role].toUpperCase()}</span>
            <span className="block text-[11px] text-ink3 mt-1.5">{ROLE_SCOPES[role]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const ROLE_SCOPES: Record<Role, string> = {
  ADMIN: "Everything, everywhere, including this screen.",
  ORGANIZER: "Tournaments they own or are assigned to.",
  REFEREE: "Matchday scoring on assigned events.",
  TEAM_MANAGER: "One club's roster and payments.",
  PLAYER: "Their own passport and calendar.",
};

function PermissionToggles({ defaults }: { defaults: Permission[] }) {
  return (
    <fieldset>
      <legend className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-2">Permissions</legend>
      <div className="space-y-2">
        {ALL_PERMISSIONS.map((p) => (
          <label key={p} className="flex items-start gap-3 rounded-xl border border-line p-3 cursor-pointer">
            <input
              type="checkbox"
              name="permissions"
              value={p}
              defaultChecked={defaults.includes(p)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-pitch-400"
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{PERMISSION_LABELS[p].label}</span>
              <span className="block text-[11px] text-ink3">{PERMISSION_LABELS[p].detail}</span>
            </span>
          </label>
        ))}
      </div>
      <p className="text-[11px] text-ink3 mt-2">
        A super admin is never restricted by these — the role carries full access by definition.
      </p>
    </fieldset>
  );
}

function Shell({
  title,
  hint,
  children,
  submitLabel,
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
  submitLabel: string;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (fd: FormData) => void;
}) {
  return (
    <form action={onSubmit} className="space-y-4">
      <div>
        <h3 className="text-lg font-extrabold text-inkDisplay">{title}</h3>
        <p className="text-xs text-ink3 mt-1">{hint}</p>
      </div>
      {children}
      {error && (
        <p className="text-xs text-warning-500" role="alert">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2 pt-1">
        <button type="submit" className="btn-primary text-sm flex-1" disabled={pending}>
          {pending ? "Working…" : submitLabel}
        </button>
        <button type="button" className="btn-ghost text-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({ label, children, optional }: { label: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">
        {label}
        {optional && <span className="text-ink3 normal-case tracking-normal font-normal"> · optional</span>}
      </span>
      {children}
    </label>
  );
}

function InviteForm({
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (fd: FormData) => void;
}) {
  return (
    <Shell
      title="Invite a user"
      hint="Creates a one-time link that lets them set a password and claim the role. No account exists until they do."
      submitLabel="Send glass invite link"
      pending={pending}
      error={error}
      onCancel={onCancel}
      onSubmit={onSubmit}
    >
      <Field label="Email">
        <input name="email" type="email" className="input w-full" required />
      </Field>
      <Field label="Full name">
        <input name="name" className="input w-full" required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone" optional>
          <input name="phone" className="input w-full" />
        </Field>
        <Field label="Club / org" optional>
          <input name="organization" className="input w-full" />
        </Field>
      </div>
      <RoleTiles name="role" defaultValue="ORGANIZER" />
      <PermissionToggles defaults={[]} />
    </Shell>
  );
}

function InviteResult({ link, onClose }: { link: string; onClose: () => void }) {
  const absolute = typeof window === "undefined" ? link : `${window.location.origin}${link}`;
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-extrabold text-inkDisplay">Invitation created</h3>
        <p className="text-xs text-ink3 mt-1">
          Emailed if a mail provider is configured. Either way this link works — copy it if you would rather send it
          yourself.
        </p>
      </div>
      <code className="block break-all bg-black/[0.05] rounded-lg px-3 py-2 text-xs text-ink2">{absolute}</code>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn-secondary text-sm flex-1"
          onClick={() => navigator.clipboard?.writeText(absolute).catch(() => {})}
        >
          Copy link
        </button>
        <button type="button" className="btn-ghost text-sm" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

function EditForm({
  user,
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  user: UserSummary;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (fd: FormData) => void;
}) {
  return (
    <Shell
      title={`Edit ${user.name}`}
      hint="Takes effect on their next request — there is no need for them to sign out and back in."
      submitLabel="Save changes"
      pending={pending}
      error={error}
      onCancel={onCancel}
      onSubmit={onSubmit}
    >
      <Field label="Club / org" optional>
        <input name="organization" className="input w-full" defaultValue={user.organization ?? ""} />
      </Field>
      <RoleTiles name="role" defaultValue={user.role} />
      <PermissionToggles defaults={effectivePermissions(user.role, user.permissions)} />
    </Shell>
  );
}

function TransferForm({
  user,
  candidates,
  assigned,
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  user: UserSummary;
  candidates: UserSummary[];
  assigned: number;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (fd: FormData) => void;
}) {
  return (
    <Shell
      title={`Transfer from ${user.name}`}
      hint={`Moves ${assigned} tournament assignment${assigned === 1 ? "" : "s"} to another account and adds this user's permissions to theirs. Use before revoking access, so their events do not go unattended.`}
      submitLabel="Transfer"
      pending={pending}
      error={error}
      onCancel={onCancel}
      onSubmit={onSubmit}
    >
      <Field label="Transfer to">
        <select name="toUserId" className="input w-full" required defaultValue="">
          <option value="" disabled>
            Choose an account
          </option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {ROLE_LABELS[c.role]}
            </option>
          ))}
        </select>
      </Field>
      <p className="text-[11px] text-ink3">
        The recipient keeps everything they already had; this only adds. Nothing is taken away from them by a handover.
      </p>
    </Shell>
  );
}

function AssignForm({
  user,
  tournaments,
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  user: UserSummary;
  tournaments: { id: string; name: string }[];
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (fd: FormData) => void;
}) {
  return (
    <Shell
      title={`Assign ${user.name}`}
      hint="Gives this account access to a tournament it does not own. Without an assignment, staff are refused every action on someone else's event."
      submitLabel="Assign"
      pending={pending}
      error={error}
      onCancel={onCancel}
      onSubmit={onSubmit}
    >
      <Field label="Tournament">
        <select name="tournamentId" className="input w-full" required defaultValue="">
          <option value="" disabled>
            Choose a tournament
          </option>
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>
    </Shell>
  );
}
