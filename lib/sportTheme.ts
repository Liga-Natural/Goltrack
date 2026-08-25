export interface SportTheme {
  label: string;
  emoji: string;
  surfaceWord: string; // "Pitch" vs "Court" — used in copy
  periodWord: string; // "Half" vs "Half" (kept distinct in case new sports need it)
}

const THEMES: Record<string, SportTheme> = {
  Soccer: { label: "Soccer", emoji: "⚽", surfaceWord: "Pitch", periodWord: "Half" },
  Futsal: { label: "Futsal", emoji: "🥅", surfaceWord: "Court", periodWord: "Half" },
};

export function getSportTheme(sport: string): SportTheme {
  return THEMES[sport] || THEMES.Soccer;
}
