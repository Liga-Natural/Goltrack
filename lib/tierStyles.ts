// Maps a division string ("U12 Premier") onto its tier accent class. One
// place, so the four tiers can't drift into five different colours across
// the applications table, the drawer, and the public page.
const TIER_CLASS: Record<string, string> = {
  premier: "tier-premier",
  gold: "tier-gold",
  silver: "tier-silver",
  bronze: "tier-bronze",
};

export function tierClass(division: string | null): string {
  if (!division) return "";
  const last = division.trim().split(/\s+/).pop()?.toLowerCase() ?? "";
  return TIER_CLASS[last] ?? "";
}
