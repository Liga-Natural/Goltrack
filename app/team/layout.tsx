import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SimpleDashboardHeader } from "@/components/SimpleDashboardHeader";

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "TEAM_MANAGER") redirect("/dashboard");

  return (
    <div className="min-h-screen">
      <SimpleDashboardHeader label="Team manager" userName={user.name} />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
