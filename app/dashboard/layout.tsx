import { redirect } from "next/navigation";
import { getCurrentUser, roleHome } from "@/lib/auth";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { DashboardTopBar } from "@/components/DashboardTopBar";
import { Tournaments, Applications } from "@/lib/models";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // This is the organizer area. ADMIN is allowed through too — a
  // superadmin still needs the same tournament-building tools any
  // organizer has — but TEAM_MANAGER/PLAYER accounts that wander in via a
  // typed URL get sent back to the dashboard that's actually theirs
  // instead of landing on an empty "no tournaments" screen.
  if (user.role === "TEAM_MANAGER" || user.role === "PLAYER") redirect(roleHome(user.role));

  // Fetched once in the layout and shared by the header: the quick-jump
  // list and the pending badge are the same data every dashboard page would
  // otherwise refetch for itself.
  const tournaments = await Tournaments.listByOwner(user.id);
  const pendingLists = await Promise.all(tournaments.map((t) => Applications.listByTournament(t.id)));
  const pendingCount = pendingLists.flat().filter((a) => a.status === "PENDING").length;

  return (
    <DashboardSidebar
      userName={user.name}
      topBar={
        <DashboardTopBar
          userName={user.name}
          role={user.role}
          pendingCount={pendingCount}
          tournaments={tournaments.map((t) => ({ id: t.id, name: t.name, sport: t.sport, status: t.status }))}
        />
      }
    >
      {children}
    </DashboardSidebar>
  );
}
