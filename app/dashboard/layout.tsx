import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { DashboardSidebar } from "@/components/DashboardSidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen flex">
      <DashboardSidebar userName={user.name} />
      <main className="flex-1 min-w-0 px-6 sm:px-10 py-8 max-w-5xl">{children}</main>
    </div>
  );
}
