export function MatchStatusBadge({ status }: { status: string }) {
  // Utility-type pills: 10px, extrabold, uppercase, wide-tracked.
  //
  // The colour here is the *light-theme* styling. In dark mode the
  // `.badge` rule in globals.css flattens every badge to a ghost outline
  // (transparent fill, white/15 edge, white/50 text) and these fills are
  // overridden — except LIVE, which opts back into its colour via the
  // `badge-live` hook so a live match stays findable in a long list.
  const base = "badge text-[10px] font-extrabold uppercase tracking-wide border";
  const styles: Record<string, string> = {
    SCHEDULED: "bg-neutralBadge text-ink2 border-line",
    LIVE: "badge-live bg-volt-400/20 text-volt-500 border-volt-400/50",
    FINAL: "bg-neutralBadge text-ink2 border-line",
  };
  if (status === "LIVE") {
    return (
      <span className={`${base} ${styles.LIVE} inline-flex items-center gap-1.5`}>
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-volt-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-volt-400" />
        </span>
        LIVE
      </span>
    );
  }
  return <span className={`${base} ${styles[status] || styles.SCHEDULED}`}>{status}</span>;
}
