import type { Metadata } from "next";
import { SiteSettings } from "@/lib/models";
import { generateRamp } from "@/lib/colorRamp";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jogo — Soccer & Futsal Tournament Software",
  description: "Organize, run, and grow soccer and futsal tournaments: registration, scheduling, brackets, live scores, and digital player passports.",
};

// Several pages under this layout (/, /tour, /tournaments, /login, /signup)
// are otherwise fully static, generated once at build time. Without a
// revalidate window here, a new accent color chosen in /dashboard/settings
// would only reach those pages on the next deploy — this keeps the whole
// site in sync with whatever's actually saved within a minute, no redeploy
// needed. Pages that already set their own (shorter) revalidate, or that
// are forced dynamic by reading cookies (all of /dashboard), are unaffected.
export const revalidate = 60;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const ramp = generateRamp(SiteSettings.getAccentColor());
  const cssVars = Object.entries(ramp)
    .map(([shade, rgb]) => `--pitch-${shade}: ${rgb};`)
    .join(" ");

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Unbounded:wght@900&display=swap"
          rel="stylesheet"
        />
        <style>{`:root { ${cssVars} }`}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
