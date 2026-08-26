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
        // "pitch" is the general brand accent — signal coral. Kept the name
        // (rather than renaming every call site) since its role hasn't
        // changed: primary buttons, links, general CTAs.
        pitch: {
          50: "#fff1ee",
          100: "#ffd9ce",
          400: "#FF5A36",
          500: "#F5431D",
          600: "#D93613",
          700: "#B32D10",
          900: "#5C1708",
        },
        navy: {
          50: "#f2f2f2",
          400: "#3a3a3a",
          600: "#242424",
          700: "#1a1a1a",
          800: "#141414",
          900: "#0a0a0a",
        },
        // "volt" is reserved for LIVE-status indicators only — never a sport
        // color, so it can't collide with the sport palette below.
        volt: {
          400: "#FF3B30",
          500: "#E0281D",
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
        display: ["'Archivo Black'", "system-ui", "sans-serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(10,15,26,0.04), 0 8px 24px -8px rgba(10,15,26,0.12)",
        glow: "0 0 60px -10px rgba(255,90,54,0.35)",
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
