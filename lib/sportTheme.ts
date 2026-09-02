export interface SportTheme {
  label: string;
  emoji: string;
  surfaceWord: string; // "Pitch" / "Court" / "Field" — used in copy and match labels
  formats: string[]; // valid team-size formats for this sport, first is the default
  hex: string; // raw color, for inline styles (SVG patterns, swatches)
  // Filled badge/chip. The fill is the 600 stop, not the bright 400: white on
  // any of the 400s measures 2.4:1 or worse, so a filled chip in the sport's
  // headline colour cannot carry legible text at all. The 600s clear AAA
  // (7.6-8.2:1) with white on them. The white is written literally because
  // Tailwind's `white` key is remapped onto --paper so the theme toggle works,
  // which makes `text-white` cream in light mode and near-black in dark.
  badge: string;
  soft: string; // tailwind classes for a low-contrast tinted badge
  dot: string; // tailwind bg class for a small indicator dot
  text: string; // tailwind text color class
  ring: string; // tailwind border color class for card accents
}

export const SPORTS: Record<string, SportTheme> = {
  Soccer: {
    label: "Soccer",
    emoji: "⚽",
    surfaceWord: "Pitch",
    formats: ["7v7", "9v9", "11v11"],
    hex: "#16C172",
    badge: "bg-soccer-600 text-[#ffffff]",
    soft: "bg-soccer-50 text-soccer-600 border border-soccer-400/30",
    dot: "bg-soccer-400",
    text: "text-soccer-600",
    ring: "border-soccer-400",
  },
  Futsal: {
    label: "Futsal",
    emoji: "🥅",
    surfaceWord: "Court",
    formats: ["5v5"],
    hex: "#00B8D9",
    badge: "bg-futsal-600 text-[#ffffff]",
    soft: "bg-futsal-50 text-futsal-600 border border-futsal-400/30",
    dot: "bg-futsal-400",
    text: "text-futsal-600",
    ring: "border-futsal-400",
  },
  Basketball: {
    label: "Basketball",
    emoji: "🏀",
    surfaceWord: "Court",
    formats: ["3v3", "5v5"],
    hex: "#FF8A00",
    badge: "bg-basketball-600 text-[#ffffff]",
    soft: "bg-basketball-50 text-basketball-600 border border-basketball-400/30",
    dot: "bg-basketball-400",
    text: "text-basketball-600",
    ring: "border-basketball-400",
  },
  "Flag Football": {
    label: "Flag Football",
    emoji: "🏈",
    surfaceWord: "Field",
    formats: ["5v5", "7v7"],
    hex: "#FF3D71",
    badge: "bg-flag-600 text-[#ffffff]",
    soft: "bg-flag-50 text-flag-600 border border-flag-400/30",
    dot: "bg-flag-400",
    text: "text-flag-600",
    ring: "border-flag-400",
  },
};

export const SPORT_NAMES = Object.keys(SPORTS);

export function getSportTheme(sport: string): SportTheme {
  return SPORTS[sport] || SPORTS.Soccer;
}
