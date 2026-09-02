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
// "Warm Clay" — the palette both themes are built from.
//
// Clay is a lighting model before it is a colour scheme: every surface is
// meant to read as a soft solid extruded out of the canvas, lit from the
// top-left. That only works if the canvas and the card are close in value —
// a card that is much lighter than the page reads as paper floating over it,
// which is the glass model this replaces. So the tokens below sit close
// together and the separation is carried by the dual shadows in globals.css
// instead of by contrast.
//
// Both palettes are warm on purpose. The dark theme is a charcoal with red
// in it rather than a neutral black, and the light theme is a sand cream
// rather than a porcelain white, so the terracotta accents and the athletic
// red belong to the same family as the surfaces they sit on.
const THEME_VARS = {
  // Warm sand canvas with a cream card one step lighter, and a slate-brown
  // ink ramp. Kept off pure white and off pure black at both ends: clay has
  // no hard edges, and neither should its type.
  light: {
    ink: "44 39 36",
    inkDisplay: "29 25 23",
    // Measured against the *worst* light surface in the system (surface2,
    // the recessed sand), which is the one that decides whether a hint on a
    // pressed field is readable: 9.7:1 and 7.0:1.
    //
    // ink3 used to sit at 4.8:1 — AA but not AAA — on the argument that two
    // tokens both at 7:1 are really one token and the hierarchy is what
    // makes a dense table scannable. That argument was right about the
    // hierarchy and wrong about the fix: 155 of the 188 remaining AAA
    // failures in the light theme were this single token, and it is used for
    // real content (form hints, the sentence under a toggle explaining what
    // it does), not just decoration. So instead of flattening ink3 up into
    // ink2, the whole scale moved down — ink2 darkened to 9.7:1 to open the
    // gap back up. Three levels, all AAA, and the steps are smaller than
    // they were but they are still steps.
    ink2: "58 53 49",
    ink3: "80 74 69",
    paper: "244 241 234",
    surface: "252 250 246",
    surface2: "235 230 220",
    sidebar: "252 250 246",
    line: "222 213 200",
    lineSoft: "235 228 217",
    neutralBadge: "234 226 213",
    // The emerald stays the emerald: it is the fill and the tint, the thing
    // that makes LIVE findable down a long list. The *ink* is a separate
    // token because #10B981 as text measures 1.9:1 on its own 20% tint —
    // the most important status in the product was also its least legible.
    // 7.8:1 on the tint, 9.4:1 on a card.
    statusLive: "16 185 129",
    statusLiveInk: "6 78 54",
    statusWarning: "217 119 6",
    // amber-800 measured 6.8:1 as .text-warning-500 on a card; amber-900
    // takes it to 9.0:1.
    statusWarningInk: "120 53 15",
    brandHover: "201 69 44",
  },
  // Warm charcoal clay. The canvas is #141416 and the card is a few points
  // lighter with the same warmth, so a panel reads as raised rather than as
  // a lighter rectangle. Secondary text is a warm grey rather than a neutral
  // one — a cool grey on warm charcoal looks like a rendering mistake.
  dark: {
    ink: "246 241 236",
    inkDisplay: "253 250 247",
    // Same measurement on charcoal, same move: 10.1:1 and 7.1:1 against
    // surface2, where ink3 was 4.8:1.
    ink2: "214 207 201",
    ink3: "190 182 176",
    paper: "20 20 22",
    surface: "30 28 30",
    surface2: "38 35 38",
    sidebar: "25 23 25",
    line: "52 48 47",
    lineSoft: "38 35 36",
    neutralBadge: "42 38 40",
    // Same fill, and the ink swings the other way: on charcoal the emerald
    // needs to be lighter than the fill, not darker. 8.0:1 on the tint.
    statusLive: "16 185 129",
    statusLiveInk: "110 231 183",
    statusWarning: "234 152 62",
    statusWarningInk: "253 196 128",
    brandHover: "201 69 44",
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
    `--status-live-ink: ${v.statusLiveInk};`,
    `--status-warning: ${v.statusWarning};`,
    `--status-warning-ink: ${v.statusWarningInk};`,
    `--brand-hover: ${v.brandHover};`,
  ].join(" ");

  return (
    // data-theme mirrors the saved setting onto the document so CSS can
    // branch on it. The token vars alone can't express everything this
    // aesthetic needs — translucency + backdrop-blur reads as premium glass
    // on carbon but as smeared haze on a light page — so the genuinely
    // theme-specific treatments live in [data-theme="dark"] rules in
    // globals.css rather than being forced on both themes.
    <html lang="en" data-theme={theme}>
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
