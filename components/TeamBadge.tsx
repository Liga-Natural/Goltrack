import { getSportTheme } from "@/lib/sportTheme";

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function TeamBadge({
  id,
  name,
  hasCrest,
  crestUpdatedAt,
  logoUrl,
  sport,
  size = "md",
}: {
  id: string;
  name: string;
  hasCrest?: number | boolean;
  crestUpdatedAt?: string | null;
  logoUrl?: string | null; // legacy paste-a-URL fallback, used only when no uploaded crest exists
  sport: string;
  size?: "sm" | "md" | "lg";
}) {
  const dims = size === "sm" ? "h-6 w-6 text-[10px]" : size === "lg" ? "h-16 w-16 text-xl" : "h-10 w-10 text-sm";

  const src = hasCrest
    ? `/api/teams/${id}/crest${crestUpdatedAt ? `?v=${encodeURIComponent(crestUpdatedAt)}` : ""}`
    : logoUrl || null;

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`${name} crest`}
        className={`${dims} rounded-full object-cover border border-black/10 shrink-0 bg-surface`}
      />
    );
  }

  const theme = getSportTheme(sport);
  return (
    <div
      className={`${dims} ${theme.badge} rounded-full flex items-center justify-center font-display shrink-0`}
      aria-label={`${name} (no crest)`}
    >
      {initials(name)}
    </div>
  );
}
