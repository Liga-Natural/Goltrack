import Link from "next/link";
import { Logo } from "./Logo";
import { LogoutButton } from "./LogoutButton";

// The organizer area's DashboardSidebar earns a full sidebar shell because
// it nests a whole tournament's worth of sub-pages under one account. The
// admin/team/player areas built around this component are each one or two
// pages deep, so a plain header (logo, account-type label, sign out) reads
// as "your dashboard" without borrowing a sidebar built for a different
// account type's navigation depth.
export function SimpleDashboardHeader({ label, userName }: { label: string; userName: string }) {
  return (
    <header className="border-b border-black/10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <Link href="/">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-xs font-semibold uppercase tracking-wide text-ink2">{label}</span>
          <span className="text-sm text-ink2 truncate max-w-[10rem]">{userName}</span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
