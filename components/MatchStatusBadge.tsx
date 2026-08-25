export function MatchStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    SCHEDULED: "bg-white/10 text-white/50",
    LIVE: "bg-volt-400/20 text-volt-400",
    FINAL: "bg-pitch-400/15 text-pitch-400",
  };
  return <span className={`badge ${styles[status] || styles.SCHEDULED}`}>{status === "LIVE" ? "● LIVE" : status}</span>;
}
