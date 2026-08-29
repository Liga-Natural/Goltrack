import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SimpleDashboardHeader } from "@/components/SimpleDashboardHeader";

export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "PLAYER") redirect("/dashboard");

  return (
    <div className="min-h-screen stadium-glow">
      <SimpleDashboardHeader label="Player" userName={user.name} />
      <main className="mx-auto max-w-md px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
