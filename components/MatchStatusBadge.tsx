export function MatchStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    SCHEDULED: "bg-black/10 text-black/50",
    LIVE: "bg-volt-400/20 text-volt-500",
    FINAL: "bg-pitch-400/15 text-pitch-600",
  };
  if (status === "LIVE") {
    return (
      <span className={`badge ${styles.LIVE} inline-flex items-center gap-1.5`}>
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-volt-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-volt-400" />
        </span>
        LIVE
      </span>
    );
  }
  return <span className={`badge ${styles[status] || styles.SCHEDULED}`}>{status}</span>;
}
