export interface SportTheme {
  label: string;
  emoji: string;
  surfaceWord: string; // "Pitch" vs "Court" vs "Field" — used in copy
  formats: string[]; // valid team-size formats for this sport, first is the default
}

export const SPORTS: Record<string, SportTheme> = {
  Soccer: { label: "Soccer", emoji: "⚽", surfaceWord: "Pitch", formats: ["7v7", "9v9", "11v11"] },
  Futsal: { label: "Futsal", emoji: "🥅", surfaceWord: "Court", formats: ["5v5"] },
  Basketball: { label: "Basketball", emoji: "🏀", surfaceWord: "Court", formats: ["3v3", "5v5"] },
  "Flag Football": { label: "Flag Football", emoji: "🏈", surfaceWord: "Field", formats: ["5v5", "7v7"] },
};

export const SPORT_NAMES = Object.keys(SPORTS);

export function getSportTheme(sport: string): SportTheme {
  return SPORTS[sport] || SPORTS.Soccer;
}
