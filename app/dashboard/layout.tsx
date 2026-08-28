import { redirect } from "next/navigation";
import { getCurrentUser, roleHome } from "@/lib/auth";
import { DashboardSidebar } from "@/components/DashboardSidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // This is the organizer area. ADMIN is allowed through too — a
  // superadmin still needs the same tournament-building tools any
  // organizer has — but TEAM_MANAGER/PLAYER accounts that wander in via a
  // typed URL get sent back to the dashboard that's actually theirs
  // instead of landing on an empty "no tournaments" screen.
  if (user.role === "TEAM_MANAGER" || user.role === "PLAYER") redirect(roleHome(user.role));

  return <DashboardSidebar userName={user.name}>{children}</DashboardSidebar>;
}
