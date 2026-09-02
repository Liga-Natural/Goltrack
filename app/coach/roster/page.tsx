import Link from "next/link";
import { redirect } from "next/navigation";
import { Teams, Players, Tournaments, Users } from "@/lib/models";
import { getCurrentUser } from "@/lib/auth";
import { RosterSearch, type RosterCandidate } from "@/components/RosterSearch";
import { verificationFor } from "@/lib/verification";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function CoachRosterPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const team = await Teams.byUserId(user.id);
  if (!team) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16">
          <div className="card p-8 text-center">
            <h1 className="text-xl font-extrabold text-inkDisplay mb-2">No squad linked to this account</h1>
            <p className="text-sm text-ink2">
              The roster hub manages the team your account owns. Claim a team from a tournament&apos;s registration
              link, or ask the organizer to send you the team invite.
            </p>
            <Link href="/dashboard" className="btn-secondary text-sm inline-block mt-5">
              Back to dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const [tournament, squadRows, unattached] = await Promise.all([
    Tournaments.byId(team.tournamentId),
    Players.listByTeam(team.id),
    Players.unassignedAccounts(),
  ]);

  // Squad members who hold an account get their email shown; the rest are
  // roster entries a coach typed in, which is a real and different thing.
  const accountEmails = new Map<string, string>();
  for (const p of squadRows) {
    if (p.userId) {
      const account = await Users.byId(p.userId);
      if (account) accountEmails.set(p.id, account.email);
    }
  }

  const toCandidate = (p: (typeof squadRows)[number], email: string | null, teamName: string | null): RosterCandidate => ({
    id: p.id,
    name: p.name,
    email,
    birthdate: p.birthdate,
    position: p.position,
    passportId: p.passportId,
    photoUpdatedAt: p.photoUpdatedAt,
    faceCheckStatus: p.faceCheckStatus,
    ageDocUploadedAt: p.ageDocUploadedAt,
    ageStatus: p.ageStatus,
    teamId: p.teamId,
    teamName,
  });

  const squad = squadRows.map((p) => toCandidate(p, accountEmails.get(p.id) ?? null, team.name));
  const candidates = unattached.map((p) => toCandidate(p, p.email, null));

  const cleared = squad.filter((p) => verificationFor(p).rosterEligible).length;
  const requested = unattached.filter((p) => p.requestedTeamId === team.id).length;

  return (
    <main className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <Link href="/">
            <Logo />
          </Link>
          <Link href="/coach/dashboard" className="text-sm text-ink2 hover:text-inkDisplay transition-colors">
            Coach dashboard →
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-display-sm mb-1.5">Roster</h1>
          <p className="text-ink2">
            {team.name}
            {tournament ? ` · ${tournament.name}` : ""} — {cleared} of {squad.length} cleared for matchday
            {requested > 0 ? ` · ${requested} player${requested === 1 ? "" : "s"} asked to join` : ""}
          </p>
        </div>

        <div className="card p-4 sm:p-5">
          <p className="text-[11px] text-ink2">
            <span className="text-inkDisplay font-semibold">Compliance guard.</span> A player needs a headshot that
            passed the face check and a proof-of-age document an organizer has approved before they can be named in a
            matchday squad. You can add anyone to your roster here; the lineup sheet is where the block bites, and it
            says which of the two is missing.
          </p>
        </div>

        <RosterSearch teamId={team.id} squad={squad} initialCandidates={candidates} />
      </div>
    </main>
  );
}
