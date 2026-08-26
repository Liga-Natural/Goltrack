import { getSportTheme } from "@/lib/sportTheme";

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function TeamBadge({
  name,
  logoUrl,
  sport,
  size = "md",
}: {
  name: string;
  logoUrl?: string | null;
  sport: string;
  size?: "sm" | "md" | "lg";
}) {
  const dims = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-16 w-16 text-xl" : "h-10 w-10 text-sm";

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={`${name} logo`}
        className={`${dims} rounded-full object-cover border border-black/10 shrink-0 bg-white`}
      />
    );
  }

  const theme = getSportTheme(sport);
  return (
    <div
      className={`${dims} ${theme.badge} rounded-full flex items-center justify-center font-display shrink-0`}
      aria-label={`${name} (no logo)`}
    >
      {initials(name)}
    </div>
  );
}
