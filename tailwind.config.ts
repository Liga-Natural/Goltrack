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
        // "pitch" is the general brand accent — "Sideline Red". Kept the
        // name (rather than renaming every call site) since its role
        // hasn't changed: primary buttons, links, general CTAs. "volt"
        // (LIVE-status indicators) is deliberately the same red family now
        // — the earlier "red is reserved for live only" split was retired
        // as part of this identity, so a live badge and a primary button
        // read as one consistent brand color instead of two different reds.
        pitch: {
          50: "#fef0f1",
          100: "#fbd2d5",
          400: "#F2545C",
          500: "#E23A43",
          600: "#C22D35",
          700: "#A12329",
          900: "#4D0F12",
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
          400: "#F2545C",
          500: "#E23A43",
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
        glow: "0 0 60px -10px rgba(242,84,92,0.35)",
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
