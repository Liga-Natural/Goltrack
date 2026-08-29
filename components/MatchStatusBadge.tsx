export function MatchStatusBadge({ status }: { status: string }) {
  // Utility-type pills: 10px, extrabold, uppercase, wide-tracked. FINAL is
  // deliberately neutral zinc rather than the brand red it used to be — a
  // finished match is the resting state of most rows on a schedule, so
  // painting them all red made a page of results read as a page of alerts
  // and left nothing for LIVE (the one genuinely urgent state) to stand
  // out against.
  const base = "badge text-[10px] font-extrabold uppercase tracking-wide";
  const styles: Record<string, string> = {
    SCHEDULED: "bg-neutralBadge text-ink2",
    LIVE: "bg-volt-400/10 text-volt-500",
    FINAL: "bg-neutralBadge text-ink2",
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
