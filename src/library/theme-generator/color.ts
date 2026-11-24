/**
 * Small, dependency-free colour toolkit: HEX parsing, sRGB ⇄ OKLCH conversion
 * (perceptually uniform, so lightness steps look even across hues), gamut
 * mapping and WCAG 2.x contrast.
 */

export interface Rgb {
  /** 0..1 */
  r: number;
  g: number;
  b: number;
}

export interface Oklch {
  /** Perceptual lightness 0..1 */
  l: number;
  /** Chroma (colourfulness), ~0..0.37 */
  c: number;
  /** Hue in degrees 0..360 */
  h: number;
}

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

/** Accepts "#rgb", "#rrggbb", "rgb" or "rrggbb" (any case). Returns "#rrggbb" or null. */
export function normalizeHex(input: string): string | null {
  const m = input.trim().replace(/^#/, "").toLowerCase();
  if (/^[0-9a-f]{3}$/.test(m)) return `#${m[0]}${m[0]}${m[1]}${m[1]}${m[2]}${m[2]}`;
  if (/^[0-9a-f]{6}$/.test(m)) return `#${m}`;
  return null;
}

export function hexToRgb(hex: string): Rgb | null {
  const n = normalizeHex(hex);
  if (!n) return null;
  return {
    r: parseInt(n.slice(1, 3), 16) / 255,
    g: parseInt(n.slice(3, 5), 16) / 255,
    b: parseInt(n.slice(5, 7), 16) / 255,
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const h = (v: number) => Math.round(clamp(v) * 255).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toGamma = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

export function rgbToOklch(rgb: Rgb): Oklch {
  const r = toLinear(rgb.r);
  const g = toLinear(rgb.g);
  const b = toLinear(rgb.b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const c = Math.hypot(A, B);
  const h = c < 1e-4 ? 0 : ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return { l: L, c, h };
}

/** OKLCH → linear-free sRGB, possibly out of gamut (components outside 0..1). */
function oklchToRgbRaw({ l: L, c, h }: Oklch): Rgb {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return {
    r: toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  };
}

const inGamut = ({ r, g, b }: Rgb) => [r, g, b].every((v) => v >= -0.0005 && v <= 1.0005);

/** OKLCH → sRGB, reducing chroma (keeping lightness and hue) until the colour is displayable. */
export function oklchToRgb(color: Oklch): Rgb {
  const l = clamp(color.l);
  let rgb = oklchToRgbRaw({ ...color, l });
  if (inGamut(rgb)) return rgb;
  let lo = 0;
  let hi = color.c;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklchToRgbRaw({ l, c: mid, h: color.h }))) lo = mid;
    else hi = mid;
  }
  rgb = oklchToRgbRaw({ l, c: lo, h: color.h });
  return { r: clamp(rgb.r), g: clamp(rgb.g), b: clamp(rgb.b) };
}

export const oklchToHex = (color: Oklch) => rgbToHex(oklchToRgb(color));
export const hexToOklch = (hex: string) => rgbToOklch(hexToRgb(hex) ?? { r: 0, g: 0, b: 0 });

/** WCAG 2.x relative luminance. */
export function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b);
}

/** WCAG 2.x contrast ratio between two colours (1..21). */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Moves `color`'s lightness (keeping hue/chroma) in `direction` until it reaches
 * `min` contrast against `against`. Returns the closest result if impossible.
 */
export function ensureContrast(
  color: Oklch,
  against: string,
  min: number,
  direction: "lighter" | "darker",
): Oklch {
  if (contrast(oklchToHex(color), against) >= min) return color;
  const step = direction === "lighter" ? 0.01 : -0.01;
  let c = { ...color };
  for (let i = 0; i < 100; i++) {
    c = { ...c, l: clamp(c.l + step) };
    if (contrast(oklchToHex(c), against) >= min || c.l === 0 || c.l === 1) break;
  }
  return c;
}

/** Hex colour with alpha as an rgba() string. */
export function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex) ?? { r: 0, g: 0, b: 0 };
  const v = (x: number) => Math.round(x * 255);
  return `rgba(${v(rgb.r)}, ${v(rgb.g)}, ${v(rgb.b)}, ${alpha})`;
}
