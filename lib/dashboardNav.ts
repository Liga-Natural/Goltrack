// Shared between DashboardSidebar (nav links) and TournamentBreadcrumb
// (current-section label) so the two can't silently drift apart — adding a
// tournament sub-page here updates both places at once.
export const tournamentNav = [
  { href: "", label: "Overview" },
  { href: "/teams", label: "Teams" },
  { href: "/schedule", label: "Schedule & bracket" },
  { href: "/scores", label: "Live scores" },
  { href: "/referees", label: "Referees" },
  { href: "/checkin", label: "Check-in" },
];
