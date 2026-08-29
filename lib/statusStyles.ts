// One source of truth for tournament-status badge styling. This map used to
// be copy-pasted verbatim into four separate files (TournamentsGrid,
// TournamentHeader, /admin/tournaments, /dashboard) with a fifth place —
// /admin's "Recent tournaments" list — having drifted to a single flat grey
// for every status, so a LIVE tournament rendered there with no live
// treatment at all. Keeping the classes here means a status recolor happens
// once instead of five times, and the drift can't silently reappear.
//
// Deliberately plain class strings rather than computed values: Tailwind's
// JIT scanner only emits a class it can see as a literal in a scanned file,
// and lib/ is in tailwind.config.ts's content globs precisely so maps like
// this one keep working.
export const tournamentStatusStyles: Record<string, string> = {
  DRAFT: "bg-neutralBadge text-ink2",
  REGISTRATION_OPEN: "bg-pitch-400/15 text-pitch-600",
  SCHEDULED: "bg-neutralBadge text-ink2",
  LIVE: "bg-volt-400/20 text-volt-500",
  COMPLETED: "bg-neutralBadge text-ink3",
};

export function tournamentStatusClass(status: string): string {
  return tournamentStatusStyles[status] || tournamentStatusStyles.DRAFT;
}
