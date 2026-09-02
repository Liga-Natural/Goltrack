import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SimpleDashboardHeader } from "@/components/SimpleDashboardHeader";

const NAV = [
  { href: "/organizer/settings/match-center", label: "Match centre" },
  { href: "/organizer/sponsors", label: "Sponsors" },
  { href: "/organizer/analytics", label: "Analytics" },
  { href: "/organizer/settings/fair-play", label: "Fair play" },
  { href: "/organizer/media", label: "Media" },
];

// The optional modules an organizer turns on for an event. Kept as its own
// section rather than folded into the tournament dashboard because these are
// settings for the event as a whole, chosen once, rather than the day-to-day
// screens the dashboard is built around.
export default async function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/organizer/sponsors");

  return (
    <div className="min-h-screen">
      <SimpleDashboardHeader label="Event modules" userName={user.name} />
      <div className="border-b border-line bg-surface2">
        {/* Scrolls sideways on a phone: five tabs do not fit in 390px, and a
            plain flex row pushes the last two off the screen. */}
        <nav className="mx-auto max-w-5xl px-4 sm:px-6 flex items-center gap-1 py-2 overflow-x-auto">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium text-ink2 hover:text-inkDisplay hover:bg-surface transition-colors"
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
