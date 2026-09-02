import { redirect } from "next/navigation";
import { Users, UserInvites, TournamentStaff, Tournaments } from "@/lib/models";
import { getCurrentUser } from "@/lib/auth";
import { UserAdminWorkspace } from "@/components/UserAdminWorkspace";

function Kpi({ label, value, detail }: { label: string; value: number; detail?: string }) {
  return (
    <div className="card p-5 min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-1.5 truncate">{label}</p>
      <p className="font-score text-3xl text-inkDisplay leading-none">{value}</p>
      {detail && <p className="text-[11px] text-ink3 mt-2">{detail}</p>}
    </div>
  );
}

export default async function AdminUsersPage() {
  // The layout already gates this route, but a page that lists every account
  // on the platform is worth checking twice — a layout is one refactor away
  // from not running.
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (current.role !== "ADMIN") redirect("/dashboard");

  const [users, invites, assignmentCounts, tournaments] = await Promise.all([
    Users.listAll(),
    UserInvites.listPending(),
    TournamentStaff.countsByUser(),
    Tournaments.listAll(),
  ]);

  const directors = users.filter((u) => u.role === "ORGANIZER" && u.status === "ACTIVE").length;
  // "On duty" means assigned to a tournament, not merely holding the role —
  // a referee with no event is not on duty, and a tile that counts them as
  // such would misreport matchday cover.
  const refereesOnDuty = users.filter(
    (u) => u.role === "REFEREE" && u.status === "ACTIVE" && (assignmentCounts.get(u.id) ?? 0) > 0
  ).length;
  const refereesTotal = users.filter((u) => u.role === "REFEREE" && u.status === "ACTIVE").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-inkDisplay mb-1">Accounts</h1>
        <p className="text-ink2 text-sm font-medium">
          Who can sign in, what they are allowed to do, and which events they work.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Total accounts" value={users.length} detail={`${users.filter((u) => u.status === "SUSPENDED").length} suspended`} />
        <Kpi label="Active directors" value={directors} />
        <Kpi
          label="Referees on duty"
          value={refereesOnDuty}
          detail={refereesTotal !== refereesOnDuty ? `${refereesTotal - refereesOnDuty} unassigned` : undefined}
        />
        <Kpi label="Pending invitations" value={invites.length} />
      </div>

      <UserAdminWorkspace
        users={users}
        invites={invites}
        tournaments={tournaments.map((t) => ({ id: t.id, name: t.name }))}
        assignmentCounts={Object.fromEntries(assignmentCounts)}
        currentUserId={current.id}
      />
    </div>
  );
}
