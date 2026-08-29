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
        // Redefining Tailwind's own "black" and "white" keys (not adding a
        // new color family) is the whole trick behind the light/dark theme
        // toggle: every bg-white, text-black, border-black/10 etc. already
        // used across ~30 files automatically becomes theme-aware with zero
        // per-file changes, because they're all reading these two CSS
        // variables rather than fixed hex. app/layout.tsx sets --ink/--paper
        // per request from SiteSettings.getTheme(). In light mode the
        // values match Tailwind's real black/white exactly (so light mode
        // is pixel-identical to before this existed); in dark mode the two
        // swap roles — "black" (ink: used for text/foreground/borders)
        // becomes the light color, "white" (paper: used for
        // backgrounds/surfaces) becomes the dark one. This only holds
        // together because the app consistently uses black for
        // ink/foreground purposes and white for paper/surface purposes —
        // which is exactly what "ink/paper" has meant throughout this
        // project's own identity language.
        black: "rgb(var(--ink) / <alpha-value>)",
        white: "rgb(var(--paper) / <alpha-value>)",
        // Two more theme-aware surface tokens, same trick: "Ultra-light
        // Athletic Grey" for secondary/feature-section backgrounds
        // (surface2) and "Cool Slate" for the exact 1px hairline border
        // cards and inputs want (hairline) — both exact designed colors in
        // light mode rather than an ink-alpha approximation, and still
        // theme-aware since app/layout.tsx defines a dark-mode pair too.
        surface2: "rgb(var(--surface-2) / <alpha-value>)",
        hairline: "rgb(var(--hairline) / <alpha-value>)",
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
          900: "#111111",
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
      fontSize: {
        // Named tokens for the oversized display sizes that kept getting
        // reinvented as one-off arbitrary values (text-[2.75rem] etc.) —
        // pulling them into the scale means every hero/display headline
        // shares the same handful of sizes instead of a new size per page.
        "display-sm": ["2.25rem", { lineHeight: "0.98", letterSpacing: "-0.01em" }],
        "display-md": ["3rem", { lineHeight: "0.96", letterSpacing: "-0.015em" }],
        "display-lg": ["4.5rem", { lineHeight: "0.94", letterSpacing: "-0.02em" }],
        "display-xl": ["6rem", { lineHeight: "0.92", letterSpacing: "-0.025em" }],
      },
      fontFamily: {
        // Bricolage Grotesque carries every piece of lettering site-wide —
        // headings and body alike — as part of the Sideline Red identity.
        // Unlike Archivo Black it's a real variable family (400-800), so
        // headings get an explicit heavy weight in globals.css instead of
        // relying on a font that only ships one weight.
        display: ["'Bricolage Grotesque'", "system-ui", "sans-serif"],
        body: ["'Bricolage Grotesque'", "system-ui", "sans-serif"],
        // Scoped to the wordmark only (Logo.tsx) — the rest of the site
        // stays in Bricolage Grotesque above.
        logo: ["'Unbounded'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // Three deliberate weights instead of one shadow reused everywhere:
        // card = default (list rows, secondary content), elevated = for
        // content that should visibly sit above the page (stat panels,
        // featured cards), ticket = a hard, confident offset shadow for
        // the sports-ticket-styled elements — not soft/diffuse, closer to
        // a printed stub sitting on the page.
        // rgb(var(--ink) / alpha) rather than a fixed dark rgba: in dark
        // mode --ink is the light color, so these correctly become a soft
        // light halo / a light hard-edge shadow instead of a literally
        // invisible dark-on-dark shadow.
        // Two-layer "Pro Max" elevation: a tight, dark contact shadow (what
        // actually grounds the card to the page) plus a wide, soft,
        // accent-tinted glow (what gives it presence instead of reading as
        // a flat outline) — replaces the single flat shadow this token
        // used to be.
        card: "0 1px 3px rgb(var(--ink) / 0.06), 0 20px 40px -12px rgb(var(--pitch-400) / 0.08)",
        elevated: "0 2px 4px rgb(var(--ink) / 0.06), 0 20px 40px -14px rgb(var(--ink) / 0.22)",
        ticket: "3px 3px 0 rgb(var(--ink) / 0.92)",
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
        // A mechanical scoreboard-digit flip — for a live score reveal,
        // not a fake "continuous real-time push" (this app updates scores
        // on page load/revalidation, not a live socket), so this plays
        // once when the number enters the page rather than looping.
        "score-flip": {
          "0%": { transform: "rotateX(90deg)", opacity: "0" },
          "60%": { transform: "rotateX(-12deg)", opacity: "1" },
          "100%": { transform: "rotateX(0deg)", opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s ease-out both",
        drift: "drift 14s ease-in-out infinite",
        "drift-slow": "drift 22s ease-in-out infinite reverse",
        "score-flip": "score-flip 0.5s cubic-bezier(0.22,1,0.36,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
