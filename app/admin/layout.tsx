import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { SimpleDashboardHeader } from "@/components/SimpleDashboardHeader";
import { adminNav } from "@/lib/dashboardNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Not an admin: send them to whatever dashboard is actually theirs
  // instead of a dead end or a login loop on an account that's already
  // logged in.
  if (user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="min-h-screen">
      <SimpleDashboardHeader label="Admin" userName={user.name} />
      <div className="border-b border-black/5 bg-black/[0.02]">
        <nav className="mx-auto max-w-5xl px-4 sm:px-6 flex items-center gap-1 py-2">
          {adminNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-black/60 hover:text-black hover:bg-black/5 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
