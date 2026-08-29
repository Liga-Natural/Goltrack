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
// "Daylight Pitch": light mode is pure white paper (#FFFFFF) on deep pitch
// black ink (#050505) — a deliberately harder, more editorial contrast than
// the earlier off-white/off-black pairing, matching the Nike/Apple-style
// crisp-minimalist direction this site is designed around. Dark mode swaps
// their roles: "ink" (foreground/text/border usage) becomes light, "paper"
// (background/surface usage) becomes that same near-black tone used as the
// dark surface. surface2/hairline are the two secondary tokens the same
// pivot needs: a slightly-off-white section background (surface2, so
// feature sections read as a separate layer without a hard line) and a
// dedicated ultra-thin border color (hairline) distinct from an ink-alpha
// blend, so 1px card/input borders hit an exact, designed color rather
// than whatever percentage of ink happens to compute to.
const THEME_VARS = {
  light: { ink: "5 5 5", paper: "255 255 255", surface2: "247 247 249", hairline: "229 229 234" },
  dark: { ink: "250 249 246", paper: "17 17 17", surface2: "24 24 27", hairline: "42 42 46" },
} as const;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const ramp = generateRamp(await SiteSettings.getAccentColor());
  const theme = await SiteSettings.getTheme();
  const { ink, paper, surface2, hairline } = THEME_VARS[theme];

  const cssVars = [
    ...Object.entries(ramp).map(([shade, rgb]) => `--pitch-${shade}: ${rgb};`),
    `--ink: ${ink};`,
    `--paper: ${paper};`,
    `--surface-2: ${surface2};`,
    `--hairline: ${hairline};`,
  ].join(" ");

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Unbounded:wght@900&display=swap"
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
