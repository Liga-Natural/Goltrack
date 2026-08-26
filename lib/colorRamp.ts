// Turns a single hex color into the same {50,100,400,500,600,700,900} shape
// as the hand-picked "pitch" ramps this app has used before, so a user can
// pick one color in Settings and get a full usable palette instead of just
// one flat swatch. Deliberately simple (HSL lightness steps around the
// input's own hue/saturation) rather than perceptually-tuned — good enough
// for buttons/badges/tints, not meant to replace real design judgment.

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

export type ColorRamp = Record<"50" | "100" | "400" | "500" | "600" | "700" | "900", string>;

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

  return {
    "50": stop(96, s * 0.5),
    "100": stop(90, s * 0.65),
    "400": `${r} ${g} ${b}`,
    "500": stop(l - 10),
    "600": stop(l - 18),
    "700": stop(l - 26),
    "900": stop(Math.max(l - 42, 10)),
  };
}
