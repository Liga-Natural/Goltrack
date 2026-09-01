import Link from "next/link";
import { UserInvites, Users } from "@/lib/models";
import { ROLE_LABELS, PERMISSION_LABELS, effectivePermissions, ROLE_BADGE_CLASS } from "@/lib/permissions";
import { formatDate } from "@/lib/invoices";
import { AcceptInviteForm } from "@/components/AcceptInviteForm";

// Public: the bearer token in the URL is the authorisation. Every reason an
// invitation might not be usable is reported as itself rather than as one
// generic failure — "expired" and "already used" need different responses from
// the person holding the link.
export default async function AcceptInvitePage({ params }: { params: { token: string } }) {
  const invite = await UserInvites.byToken(params.token);

  const problem = !invite
    ? "This invitation link is not valid."
    : invite.revokedAt
      ? "This invitation was revoked by an administrator."
      : invite.acceptedAt
        ? "This invitation has already been used. Sign in instead."
        : new Date(invite.expiresAt).getTime() < Date.now()
          ? `This invitation expired on ${formatDate(invite.expiresAt)}. Ask for a new one.`
          : (await Users.byEmail(invite.email))
            ? "An account already exists for this email. Sign in instead."
            : null;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="card p-6 sm:p-8 w-full max-w-md">
        {problem || !invite ? (
          <>
            <h1 className="text-2xl font-extrabold text-inkDisplay mb-2">Invitation unavailable</h1>
            <p className="text-sm text-ink2 mb-6">{problem}</p>
            <Link href="/login" className="btn-primary text-sm inline-block">
              Go to sign in
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold text-inkDisplay mb-1">Welcome, {invite.name}</h1>
            <p className="text-sm text-ink2">
              {invite.invitedByName || "An administrator"} invited you to Jogo. Set a password to accept.
            </p>

            <div className="my-5 rounded-xl border border-line p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className={`badge ${ROLE_BADGE_CLASS[invite.role]} text-[10px]`}>
                  {ROLE_LABELS[invite.role].toUpperCase()}
                </span>
                <span className="text-xs text-ink3">{invite.email}</span>
              </div>
              <p className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-1.5">You will be able to</p>
              {(() => {
                const granted = effectivePermissions(invite.role, invite.permissions);
                if (invite.role === "ADMIN")
                  return <p className="text-xs text-ink2">Everything, including managing other accounts.</p>;
                if (granted.length === 0)
                  return (
                    <p className="text-xs text-ink2">
                      Work the events you are assigned to. No finance, scheduling, roster or messaging permissions were
                      granted.
                    </p>
                  );
                return (
                  <ul className="text-xs text-ink2 space-y-1">
                    {granted.map((p) => (
                      <li key={p}>· {PERMISSION_LABELS[p].label}</li>
                    ))}
                  </ul>
                );
              })()}
            </div>

            <AcceptInviteForm token={invite.token} />
          </>
        )}
      </div>
    </main>
  );
}
