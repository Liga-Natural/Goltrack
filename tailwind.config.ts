import type { Config } from "tailwindcss";

const config: Config = {
  // lib/ is included because lib/sportTheme.ts holds the literal Tailwind
  // class strings for each sport's badge/soft/dot/text/ring — those are
  // referenced via property access (theme.badge) everywhere else, so the
  // JIT scanner only ever sees the real class names if it reads this file
  // too. Dropping this silently produces unstyled sport badges.
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // "pitch" is the general brand accent, chosen by whoever runs the
        // site from /dashboard/settings (defaults to "Sideline Red",
        // #F2545C). Every shade below reads from a CSS variable — set at
        // request time in app/layout.tsx from the saved color in
        // SiteSettings, via lib/colorRamp.ts — rather than a fixed hex, so
        // picking a new color in Settings doesn't require a rebuild.
        // "volt" (LIVE-status indicators) intentionally tracks the same
        // variables: the earlier "red is reserved for live only" split was
        // retired as part of the Jogo identity, so a live badge and a
        // primary button always read as one consistent brand color.
        pitch: {
          50: "rgb(var(--pitch-50) / <alpha-value>)",
          100: "rgb(var(--pitch-100) / <alpha-value>)",
          400: "rgb(var(--pitch-400) / <alpha-value>)",
          500: "rgb(var(--pitch-500) / <alpha-value>)",
          600: "rgb(var(--pitch-600) / <alpha-value>)",
          700: "rgb(var(--pitch-700) / <alpha-value>)",
          900: "rgb(var(--pitch-900) / <alpha-value>)",
        },
        navy: {
          50: "#f2f2f2",
          400: "#3a3a3a",
          600: "#242424",
          700: "#1a1a1a",
          800: "#141414",
          900: "#121212",
        },
        volt: {
          400: "rgb(var(--pitch-400) / <alpha-value>)",
          500: "rgb(var(--pitch-500) / <alpha-value>)",
        },
        soccer: {
          50: "#e6faf1",
          400: "#16C172",
          500: "#0fa35f",
          600: "#0c8a50",
        },
        basketball: {
          50: "#fff4e6",
          400: "#FF8A00",
          500: "#e67a00",
          600: "#cc6d00",
        },
        futsal: {
          50: "#e6f9fc",
          400: "#00B8D9",
          500: "#00a2c0",
          600: "#008aa3",
        },
        flag: {
          50: "#ffe9f0",
          400: "#FF3D71",
          500: "#e62f60",
          600: "#cc2854",
        },
      },
      fontFamily: {
        // Archivo Black carries every piece of lettering site-wide now —
        // headings and body alike — as part of the Sideline Red identity.
        display: ["'Archivo Black'", "system-ui", "sans-serif"],
        body: ["'Archivo Black'", "system-ui", "sans-serif"],
        // Scoped to the wordmark only (Logo.tsx) — the rest of the site
        // stays in Archivo Black above.
        logo: ["'Unbounded'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(10,15,26,0.04), 0 8px 24px -8px rgba(10,15,26,0.12)",
        glow: "0 0 60px -10px rgb(var(--pitch-400) / 0.35)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        drift: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(-3%, 4%) scale(1.06)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s ease-out both",
        drift: "drift 14s ease-in-out infinite",
        "drift-slow": "drift 22s ease-in-out infinite reverse",
      },
    },
  },
  plugins: [],
};

export default config;
