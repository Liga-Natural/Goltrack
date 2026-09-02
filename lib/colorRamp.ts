// Turns a single hex color into the same {50,100,300,400,500,600,700,900} shape
// as the hand-picked "pitch" ramps this app has used before, so a user can
// pick one color in Settings and get a full usable palette instead of just
// one flat swatch. Deliberately simple (HSL lightness steps around the
// input's own hue/saturation) rather than perceptually-tuned — good enough
// for buttons/badges/tints, not meant to replace real design judgment.
//
// The three stops that carry *text* (300 on dark, 600 on light, 700 as the
// primary button's fill) are the exception: those are not lightness offsets
// but are walked until they measure 7:1 against the ground they land on, so
// a custom accent cannot produce an illegible button or eyebrow.

export function isValidHex(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex.trim());
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function relLuminance([r, g, b]: [number, number, number]): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [hi, lo] = [relLuminance(a), relLuminance(b)].sort((m, n) => n - m);
  return (hi + 0.05) / (lo + 0.05);
}

// The lightest surface in the light theme, and the white that sits on the
// primary button. Both are fixed points the accent has to work against.
const LIGHT_SURFACE: [number, number, number] = [252, 250, 246];
const DARK_SURFACE: [number, number, number] = [30, 28, 30];
const WHITE: [number, number, number] = [255, 255, 255];

export type ColorRamp = Record<"50" | "100" | "300" | "400" | "500" | "600" | "700" | "900", string>;

// Returns each stop as a "R G B" space-separated string — the format
// Tailwind's `rgb(var(--x) / <alpha-value>)` color syntax expects so
// utilities like `bg-pitch-400/15` keep working with a runtime-chosen color.
export function generateRamp(hex: string): ColorRamp {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);

  const stop = (lightness: number, saturation = s) => {
    const [sr, sg, sb] = hslToRgb(h, clamp(saturation, 0, 100), clamp(lightness, 0, 100));
    return `${sr} ${sg} ${sb}`;
  };

  // 600 and 700 are not decorative stops — 600 is the accent as *text* on a
  // light surface, and 700 is the primary button's fill under white text.
  // A fixed lightness offset cannot guarantee either: a bright accent at
  // l=65 gives a 600 of rgb(240,0,0), which is 3.5:1 on cream, so the
  // marketing eyebrows and every .text-accent label failed WCAG AA while
  // the ramp looked perfectly reasonable as a row of swatches.
  //
  // So these two walk down in lightness from their nominal offset until they
  // actually clear 7:1 against the thing they will sit against, and stop at
  // the first value that does. A dark accent already passes and is left
  // exactly where it was; only a too-light one is pulled down, and only as
  // far as it has to go.
  const darkenUntil = (
    from: number,
    passes: (rgb: [number, number, number]) => boolean
  ): [number, number, number] => {
    let lightness = clamp(from, 0, 100);
    let rgb = hslToRgb(h, clamp(s, 0, 100), lightness);
    while (!passes(rgb) && lightness > 0) {
      lightness = Math.max(0, lightness - 1);
      rgb = hslToRgb(h, clamp(s, 0, 100), lightness);
    }
    return rgb;
  };

  // Measured against the accent's own 20% tint, not against the bare card.
  // .text-accent almost never sits on plain surface — it is the eyebrow
  // inside a `bg-pitch-400/10` pill and the label on a `/20` chip. Targeting
  // the bare surface produced a 600 that measured exactly 7:1 in theory and
  // 5.9:1 everywhere it was actually used.
  const tinted: [number, number, number] = [
    Math.round(r * 0.2 + LIGHT_SURFACE[0] * 0.8),
    Math.round(g * 0.2 + LIGHT_SURFACE[1] * 0.8),
    Math.round(b * 0.2 + LIGHT_SURFACE[2] * 0.8),
  ];
  const ink600 = darkenUntil(l - 18, (c) => contrast(c, tinted) >= 7);

  // The mirror of 600, for the dark theme. .text-accent there used the raw
  // 400, which is 4.8:1 on charcoal — the accent has no stop light enough to
  // be read against a dark ground, so one is derived rather than borrowing
  // the 100 (a washed pink that stops looking like the brand colour).
  const tintedDark: [number, number, number] = [
    Math.round(r * 0.2 + DARK_SURFACE[0] * 0.8),
    Math.round(g * 0.2 + DARK_SURFACE[1] * 0.8),
    Math.round(b * 0.2 + DARK_SURFACE[2] * 0.8),
  ];
  let lightness300 = clamp(l, 0, 100);
  let ink300 = hslToRgb(h, clamp(s, 0, 100), lightness300);
  while (contrast(ink300, tintedDark) < 7 && lightness300 < 100) {
    lightness300 = Math.min(100, lightness300 + 1);
    ink300 = hslToRgb(h, clamp(s, 0, 100), lightness300);
  }
  const fill700 = darkenUntil(l - 26, (c) => contrast(WHITE, c) >= 7);
  // 900 is the hover state of 700 and has to stay visibly darker than it,
  // which the nominal offset no longer guarantees once 700 has been pulled.
  const [, , l700] = rgbToHsl(...fill700);
  const dark900 = hslToRgb(h, clamp(s, 0, 100), clamp(Math.min(l - 42, l700 - 8), 0, 100));

  const asVar = ([cr, cg, cb]: [number, number, number]) => `${cr} ${cg} ${cb}`;

  return {
    "50": stop(96, s * 0.5),
    "100": stop(90, s * 0.65),
    "300": asVar(ink300),
    "400": `${r} ${g} ${b}`,
    "500": stop(l - 10),
    "600": asVar(ink600),
    "700": asVar(fill700),
    "900": asVar(dark900),
  };
}
