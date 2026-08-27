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
// Light mode is a soft off-black on warm off-white (#121212 / #FAFAF8) —
// the brand's actual ink/paper pairing — not pure #000/#FFF, which reads
// harsher and flatter than the rest of the identity. Dark mode swaps their
// roles: "ink" (foreground/text/border usage) becomes light, "paper"
// (background/surface usage) becomes that same #121212 ink tone used as
// the dark surface.
const THEME_VARS = {
  light: { ink: "18 18 18", paper: "250 250 248" },
  dark: { ink: "250 250 249", paper: "18 18 18" },
} as const;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const ramp = generateRamp(SiteSettings.getAccentColor());
  const theme = SiteSettings.getTheme();
  const { ink, paper } = THEME_VARS[theme];

  const cssVars = [
    ...Object.entries(ramp).map(([shade, rgb]) => `--pitch-${shade}: ${rgb};`),
    `--ink: ${ink};`,
    `--paper: ${paper};`,
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
