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
  // "Frosted White Glass": a porcelain off-white canvas with a slate ink
  // ramp, replacing the earlier warm-cream palette. Values are the spec's
  // literals — #f8fafc canvas, slate-900 headlines, slate-500/400 subtext,
  // slate-200 rules — converted to the space-separated RGB triples these
  // tokens use so the alpha modifier (`text-ink2/70`) keeps working.
  light: {
    ink: "15 23 42",
    inkDisplay: "15 23 42",
    ink2: "100 116 139",
    ink3: "148 163 184",
    paper: "248 250 252",
    surface: "255 255 255",
    surface2: "241 245 249",
    sidebar: "255 255 255",
    line: "226 232 240",
    lineSoft: "241 245 249",
    neutralBadge: "241 245 249",
    statusLive: "16 185 129",
    statusWarning: "245 158 11",
    brandHover: "230 62 62",
  },
  // "True Black Glass": a pure #000000 abyss with frosted white-sheer
  // panels floating over it. Every surface token here is white — the actual
  // translucency (white at 3%, 6% on hover) is applied in the dark-scoped
  // rules in globals.css, because a token can only carry a colour, not the
  // alpha + backdrop-blur pair that makes a panel read as glass.
  // Secondary text is white-at-opacity rather than a zinc ramp so it
  // blends into the glass layers instead of sitting on top of them as its
  // own grey.
  // Values are the *composited* result of the spec's white-at-opacity over
  // the black canvas (e.g. line = white/10 on #000 = #1A1A1A). They have to
  // be flat colours because most call sites use these tokens bare
  // (`text-ink2`, `border-line`) with no alpha modifier, so a token set to
  // pure white would render fully opaque. The genuinely translucent
  // surfaces — the glass panels themselves, where the alpha has to stay
  // live so the blur can refract through it — are handled by the
  // dark-scoped rules in globals.css instead.
  dark: {
    ink: "255 255 255",
    inkDisplay: "255 255 255",
    ink2: "138 138 138",
    ink3: "102 102 102",
    paper: "0 0 0",
    surface: "10 10 10",
    surface2: "10 10 10",
    sidebar: "0 0 0",
    line: "38 38 38",
    lineSoft: "20 20 20",
    neutralBadge: "26 26 26",
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
