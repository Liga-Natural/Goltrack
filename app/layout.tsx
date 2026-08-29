import type { Metadata } from "next";
import { SiteSettings } from "@/lib/models";
import { generateRamp } from "@/lib/colorRamp";
import { ScrollReveal } from "@/components/ScrollReveal";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jogo — Soccer & Futsal Tournament Software",
  description: "Organize, run, and grow soccer and futsal tournaments: registration, scheduling, brackets, live scores, and digital player passports.",
};

// Several pages under this layout (/, /tour, /tournaments, /login, /signup)
// are otherwise fully static, generated once at build time. Without a
// revalidate window here, a new accent color or theme chosen in
// /dashboard/settings would only reach those pages on the next deploy —
// this keeps the whole site in sync with whatever's actually saved within
// a minute, no redeploy needed. Pages that already set their own (shorter)
// revalidate, or that are forced dynamic by reading cookies (all of
// /dashboard), are unaffected.
export const revalidate = 60;

// Tailwind's "black" and "white" read from these (see tailwind.config.ts).
// "Premium Cream & Ink": light mode's paper is a warm cream canvas
// (#F7F6F2), not pure white — pure white is now its own separate token
// (surface) reserved for elevated cards, which is what lets a white card
// actually pop off the page instead of blending into an equally-white
// background. Ink is a deep off-black (#111111), not a harder near-black,
// for the same "editorial, not stark" reason. Dark mode swaps ink/paper's
// roles as before: "ink" becomes the light color, "paper" becomes the dark
// surface. surface/surface2 are secondary tokens: surface is the pure
// elevated-card white (light) / a lightened card tone (dark); surface2 is
// the slightly-tinted hover/section shade one step off the canvas.
// statusLive/statusWarning/brandHover are exact, non-ramp-derived brand
// colors — statusLive in particular deliberately reintroduces a dedicated
// green for LIVE badges (see tailwind.config.ts's volt definition), a
// direct, explicit reversal of an earlier "unified brand red" decision.
const THEME_VARS = {
  light: {
    ink: "17 17 17",
    inkDisplay: "5 5 5",
    ink2: "113 113 122",
    ink3: "161 161 170",
    paper: "247 246 242",
    surface: "255 255 255",
    surface2: "242 240 233",
    sidebar: "253 253 252",
    line: "228 228 231",
    lineSoft: "244 244 245",
    neutralBadge: "244 244 245",
    statusLive: "16 185 129",
    statusWarning: "245 158 11",
    brandHover: "230 62 62",
  },
  dark: {
    ink: "250 249 246",
    inkDisplay: "255 255 255",
    ink2: "161 161 170",
    ink3: "113 113 122",
    paper: "17 17 17",
    surface: "26 26 30",
    surface2: "34 34 38",
    sidebar: "22 22 25",
    line: "48 48 54",
    lineSoft: "38 38 42",
    neutralBadge: "39 39 42",
    statusLive: "16 185 129",
    statusWarning: "245 158 11",
    brandHover: "230 62 62",
  },
} as const;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const ramp = generateRamp(await SiteSettings.getAccentColor());
  const theme = await SiteSettings.getTheme();
  const v = THEME_VARS[theme];

  const cssVars = [
    ...Object.entries(ramp).map(([shade, rgb]) => `--pitch-${shade}: ${rgb};`),
    `--ink: ${v.ink};`,
    `--ink-display: ${v.inkDisplay};`,
    `--ink-2: ${v.ink2};`,
    `--ink-3: ${v.ink3};`,
    `--paper: ${v.paper};`,
    `--surface: ${v.surface};`,
    `--surface-2: ${v.surface2};`,
    `--sidebar: ${v.sidebar};`,
    `--line: ${v.line};`,
    `--line-soft: ${v.lineSoft};`,
    `--neutral-badge: ${v.neutralBadge};`,
    `--status-live: ${v.statusLive};`,
    `--status-warning: ${v.statusWarning};`,
    `--brand-hover: ${v.brandHover};`,
  ].join(" ");

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Unbounded:wght@900&display=swap"
          rel="stylesheet"
        />
        <style>{`:root { ${cssVars} }`}</style>
      </head>
      <body>
        {children}
        <ScrollReveal />
      </body>
    </html>
  );
}
