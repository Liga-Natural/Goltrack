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
        // Pure elevated-card white (surface) is now a genuinely different
        // color from the page canvas (white/paper, which is a warm cream in
        // light mode) — that's the whole point of the "Premium Cream & Ink"
        // two-layer system: a white card only reads as "floating" if the
        // page behind it isn't also white. surface2 is one step further:
        // a slightly-tinted hover/section shade between canvas and surface.
        surface: "rgb(var(--surface) / <alpha-value>)",
        surface2: "rgb(var(--surface-2) / <alpha-value>)",
        // hairline (the exact 1px card/input border) is defined as ink at a
        // fixed 8% — not its own CSS variable — so it's always exactly
        // "8% of whatever ink currently is" in either theme, matching the
        // design system's literal --color-border-subtle: rgba(ink, 0.08)
        // rather than a separately-designed grey that could drift from it.
        hairline: "rgb(var(--ink) / 0.06)",
        // The washed-out "grey badge" fix: a designed neutral fill distinct
        // from an ink-alpha blend (which read muddy against the cream
        // canvas) paired with ink2 for text — used for SCHEDULED/Unpaid/
        // "Not checked in"-style neutral status badges site-wide.
        neutralBadge: "rgb(var(--neutral-badge) / <alpha-value>)",
        // inkDisplay (#050505) is reserved for h1/h2 display headers — one
        // step deeper than body ink, so a page title reads as a genuine
        // anchor rather than the same weight as the paragraph under it.
        // Deliberately NOT applied as a global `h1,h2 { color }` rule: the
        // homepage's inverted CTA band puts an h2 on a near-black surface
        // and relies on inheriting text-white, so an element-level color
        // here would render that heading black-on-black. Applied as an
        // explicit class on the (enumerable) dashboard headings instead.
        inkDisplay: "rgb(var(--ink-display) / <alpha-value>)",
        // ink2 (#71717A, "slate") / ink3 are the exact secondary/tertiary
        // text greys the design system specifies for meta-data, dates,
        // table headers, and disabled/placeholder text — distinct, designed
        // colors rather than an ink-alpha blend (which reads warmer and
        // lighter than these on the cream canvas).
        ink2: "rgb(var(--ink-2) / <alpha-value>)",
        ink3: "rgb(var(--ink-3) / <alpha-value>)",
        // Two structural line weights: `line` (#E4E4E7, zinc-200) is the
        // crisp border on inputs and the sidebar's edge; `lineSoft`
        // (#F4F4F5) is the lighter rule that separates rows inside a data
        // table, where a full-strength border would read as a grid.
        line: "rgb(var(--line) / <alpha-value>)",
        lineSoft: "rgb(var(--line-soft) / <alpha-value>)",
        // The sidebar's own off-white (#FDFDFC) — a hair lighter than the
        // cream canvas so the rail separates from the page without going
        // to full card-white and competing with the content cards.
        sidebar: "rgb(var(--sidebar) / <alpha-value>)",
        // "pitch" is the general brand accent, chosen by whoever runs the
        // site from /dashboard/settings (defaults to "Sideline Red",
        // #F2545C). Every shade below reads from a CSS variable — set at
        // request time in app/layout.tsx from the saved color in
        // SiteSettings, via lib/colorRamp.ts — rather than a fixed hex, so
        // picking a new color in Settings doesn't require a rebuild.
        // brandHover is the one deliberate exception to that rule: an exact,
        // non-ramp-derived hover shade for the primary button. The ramp's
        // own 500 stop is generated by a generic HSL-lightness shift (see
        // lib/colorRamp.ts) and lands nowhere near the design system's
        // specified #E63E3E for the default red — precision was explicitly
        // asked for here, so this bypasses the ramp for that one role. It's
        // tuned for the default accent color; a custom accent picked in
        // Settings still gets *a* reasonable hover via the ramp elsewhere,
        // just not this exact literal shade.
        brandHover: "rgb(var(--brand-hover) / <alpha-value>)",
        pitch: {
          50: "rgb(var(--pitch-50) / <alpha-value>)",
          100: "rgb(var(--pitch-100) / <alpha-value>)",
          300: "rgb(var(--pitch-300) / <alpha-value>)",
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
        // Reintroduces a dedicated LIVE-status color (Emerald, #10B981) —
        // a direct, explicit reversal of the earlier "volt tracks the brand
        // red" decision, per an exact hex from the design system spec.
        // The two stops are deliberately *different* vars, reversing the
        // earlier "one exact emerald" decision. Sharing one var meant the
        // text colour and the tint it sits on were the same hue at the same
        // lightness, which is the definition of an unreadable badge —
        // text-volt-500 on bg-volt-400/20 measured 1.9:1. So 400 is the fill
        // (the emerald the spec names, unchanged) and 500 is the ink, which
        // each theme sets to whatever clears 7:1 on that fill: near-black
        // green on cream, pale mint on charcoal. Same split for warning.
        volt: {
          400: "rgb(var(--status-live) / <alpha-value>)",
          500: "rgb(var(--status-live-ink) / <alpha-value>)",
        },
        warning: {
          400: "rgb(var(--status-warning) / <alpha-value>)",
          500: "rgb(var(--status-warning-ink) / <alpha-value>)",
        },
        // Tailwind's stock emerald-500 is the only emerald stop this codebase
        // uses, and every one of its 13 uses is success *text* — "Collected",
        // "Saved", a negative discount line. Stock #10B981 measured 2.4:1 on
        // cream, so it is pointed at the same ink token as volt-500 rather
        // than left as a second, unthemed green that happens to look right on
        // one background.
        emerald: {
          500: "rgb(var(--status-live-ink) / <alpha-value>)",
        },
        // The 600 stop of each sport is the badge *text* on its own 50
        // background. Every one measured below WCAG AA at 12px before this;
        // these values clear AAA on that pairing.
        soccer: {
          50: "#e6faf1",
          400: "#16C172",
          500: "#0fa35f",
          600: "#085f37",  // 7.15:1 on soccer-50
        },
        basketball: {
          50: "#fff4e6",
          400: "#FF8A00",
          500: "#e67a00",
          600: "#7e4400",  // 7.12:1 on basketball-50
        },
        futsal: {
          50: "#e6f9fc",
          400: "#00B8D9",
          500: "#00a2c0",
          600: "#005c6d",  // 7.02:1 on futsal-50
        },
        flag: {
          50: "#ffe9f0",
          400: "#FF3D71",
          500: "#e62f60",
          600: "#971e3e",  // 7.07:1 on flag-50
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
        // Plus Jakarta Sans: a premium geometric sans carrying every piece
        // of lettering site-wide — headings and body alike. Replaces
        // Bricolage Grotesque, whose rounder, softer letterforms were
        // reading "generic/weak" for anchor headings even at extrabold
        // weight; Jakarta's geometric construction holds up better at both
        // heavy display weights and small uppercase labels. A real
        // variable family (200-800 plus italics), so headings still get an
        // explicit heavy weight in globals.css rather than relying on the
        // font shipping only one weight.
        display: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
        body: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
        // Scoped to the wordmark only (Logo.tsx) — deliberately untouched,
        // the rest of the site is Plus Jakarta Sans above.
        logo: ["'Unbounded'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // Three-tier "optical" elevation system, keyed to the design
        // system's exact rgba(17,17,17, x) values — since --ink is exactly
        // 17 17 17 in light mode, rgb(var(--ink) / x) computes to those
        // literal values there, while still adapting sanely in dark mode
        // instead of a hardcoded rgba baking in a light-mode-only black.
        // form = elevation-1 (inputs), card = elevation-2 (default cards),
        // elevated = elevation-3 (hover states & modals). ticket is
        // unrelated — a hard, confident offset shadow for the
        // sports-ticket-styled elements, not soft/diffuse like the rest.
        form: "0 2px 8px rgb(var(--ink) / 0.04), 0 1px 2px rgb(var(--ink) / 0.02)",
        // "Editorial Cream & Ink" elevation physics. --ink is exactly
        // 17 17 17 in light mode, so rgb(var(--ink) / x) resolves to the
        // spec's literal rgba(17,17,17,x) values while still adapting in
        // dark mode instead of baking in a light-mode-only black.
        // card = resting surface, cardHover = the lifted/interactive state
        // (paired with a -2px translate on .card-interactive).
        card: "0 8px 24px rgb(var(--ink) / 0.04), 0 2px 8px rgb(var(--ink) / 0.02)",
        cardHover: "0 20px 40px rgb(var(--ink) / 0.08), 0 4px 12px rgb(var(--ink) / 0.04)",
        elevated: "0 24px 48px rgb(var(--ink) / 0.08), 0 8px 16px rgb(var(--ink) / 0.04)",
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
