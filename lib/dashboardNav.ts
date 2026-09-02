// Shared between DashboardSidebar (nav links) and TournamentBreadcrumb
// (current-section label) so the two can't silently drift apart — adding a
// tournament sub-page here updates both places at once.
export const tournamentNav = [
  { href: "", label: "Overview" },
  { href: "/applications", label: "Communication" },
  { href: "/teams", label: "Teams" },
  { href: "/schedule", label: "Schedule & bracket" },
  { href: "/scores", label: "Live scores" },
  { href: "/finance", label: "Finance" },
  { href: "/payments", label: "Payment rules" },
  { href: "/referees", label: "Referees" },
  { href: "/gamecards", label: "Game cards" },
  { href: "/checkin", label: "Check-in" },
];

// One nav array per account type, all consumed by the same DashboardSidebar
// shell (see components/DashboardSidebar.tsx) — same chrome, different
// links, rather than four bespoke layouts.
export const adminNav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/inbox", label: "Inbox" },
  { href: "/admin/users", label: "Accounts" },
  { href: "/admin/finance/platform", label: "Platform finance" },
  { href: "/admin/referees", label: "Referees" },
  { href: "/admin/verification", label: "Verification" },
  { href: "/communication", label: "Broadcasts" },
  { href: "/admin/tournaments", label: "All tournaments" },
];

export const teamNav = [{ href: "/team", label: "My team" }];

export const playerNav = [{ href: "/me", label: "My passport" }];
