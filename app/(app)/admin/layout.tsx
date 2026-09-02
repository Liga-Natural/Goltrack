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
      <div className="border-b border-black/5 bg-surface2">
        {/* Scrolls sideways inside itself on a phone. Seven tabs do not fit in
            390px, and a plain flex row pushed the last three off the screen
            with no way to reach them. */}
        <nav className="mx-auto max-w-5xl px-4 sm:px-6 flex items-center gap-1 py-2 overflow-x-auto">
          {adminNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 whitespace-nowrap rounded-full px-4 py-2 min-h-[48px] inline-flex items-center text-sm font-medium text-ink2 hover:text-inkDisplay hover:bg-surface transition-colors"
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
