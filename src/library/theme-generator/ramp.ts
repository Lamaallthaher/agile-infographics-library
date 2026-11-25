import { contrast, ensureContrast, hexToOklch, luminance, normalizeHex, oklchToHex } from "./color";

/**
 * Helpers shared by every infographic theme: colour ramps (progressive shades
 * for sequences of items) and readable-foreground selection.
 */

/** Interpolates two colours in OKLCH (hue takes the shortest way round). */
export function mixOklch(fromHex: string, toHex: string, t: number): string {
  const a = hexToOklch(fromHex);
  const b = hexToOklch(toHex);
  // Achromatic ends borrow the other end's hue so greys do not swing through red.
  const ha = a.c < 0.01 ? b.h : a.h;
  const hb = b.c < 0.01 ? a.h : b.h;
  const dh = ((((hb - ha) % 360) + 540) % 360) - 180;
  return oklchToHex({ l: a.l + (b.l - a.l) * t, c: a.c + (b.c - a.c) * t, h: (ha + dh * t + 360) % 360 });
}

/** `n` evenly spaced shades from `fromHex` to `toHex` (inclusive). */
export function colorRamp(fromHex: string, toHex: string, n: number): string[] {
  if (n <= 0) return [];
  if (n === 1) return [normalizeHex(fromHex) ?? fromHex];
  return Array.from({ length: n }, (_, i) => mixOklch(fromHex, toHex, i / (n - 1)));
}

/** True when dark text reads better than white text on `bg`. */
export function isLightColor(bg: string): boolean {
  return luminance(bg) > 0.179;
}

/**
 * Picks the more readable of `light` / `dark` on `bg` and reports the ratio.
 * Use `min` to decide whether the pair passes (e.g. 4.5 text, 3 icons).
 */
export function readableOn(bg: string, light = "#ffffff", dark = "#10202f", min = 4.5) {
  const cl = contrast(light, bg);
  const cd = contrast(dark, bg);
  // Prefer the light colour whenever it passes (keeps the design's white-on-colour look).
  const fg = cl >= min || cl >= cd ? light : dark;
  const ratio = fg === light ? cl : cd;
  return { fg, ratio, passes: ratio >= min };
}

/** Adjusts `fg` lightness (keeping its hue) until it reaches `min` contrast on `bg`. */
export function ensureReadable(fg: string, bg: string, min: number): string {
  if (contrast(fg, bg) >= min) return normalizeHex(fg) ?? fg;
  const toward = isLightColor(bg) ? "darker" : "lighter";
  return oklchToHex(ensureContrast(hexToOklch(fg), bg, min, toward));
}
