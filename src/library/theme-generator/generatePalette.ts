import {
  contrast,
  ensureContrast,
  hexToOklch,
  normalizeHex,
  oklchToHex,
  withAlpha,
  type Oklch,
} from "./color";

/**
 * A complete, semantic colour palette derived from ONE primary colour.
 * It is not tied to any infographic; adapters (e.g. `paletteToWheelTheme`)
 * map these roles onto a specific component's theme.
 */
export interface ThemePalette {
  /** The normalised primary colour the palette was generated from. */
  source: string;
  /** Primary as used for selected/emphasised areas (may be adjusted for contrast). */
  primary: string;
  /** Readable text/icon colour on `primary`. */
  onPrimary: string;
  primaryDark: string;
  primaryDarker: string;
  primaryLight: string;
  primaryLighter: string;
  /** Muted fill (e.g. wheel segments), its hover variant and a softer disabled variant. */
  muted: string;
  mutedStrong: string;
  mutedSoft: string;
  /** Readable text/icon colour on `muted` and `mutedStrong`. */
  onMuted: string;
  /** Deep tone for rings/frames. */
  ink: string;
  /** Page/stage background (gradient from canvas to canvasAlt) and its text colours. */
  canvas: string;
  canvasAlt: string;
  onCanvas: string;
  onCanvasMuted: string;
  /** Panel surfaces on the canvas. */
  surface: string;
  surfaceRaised: string;
  border: string;
  text: string;
  textMuted: string;
  /** Analogous accent for links, numbers and highlights; `accentStrong` for markers. */
  accent: string;
  accentStrong: string;
  focus: string;
  /** Dark text and icon colours for light surfaces (e.g. the white hub). */
  inkOnLight: string;
  inkOnLightSoft: string;
  /** Light surface colour (hub). */
  paper: string;
}

/** The approved default primary colour (deep navy). */
export const DEFAULT_PRIMARY = "#1f4670";

/**
 * The approved default palette, kept verbatim so the default theme renders
 * exactly as before. Generated palettes are calibrated against these values.
 */
export const DEFAULT_PALETTE: ThemePalette = {
  source: DEFAULT_PRIMARY,
  primary: "#1f4670",
  onPrimary: "#ffffff",
  primaryDark: "#173d63",
  primaryDarker: "#0b2a4a",
  primaryLight: "#6a8199",
  primaryLighter: "#a3b0bc",
  muted: "#8598aa",
  mutedStrong: "#6a8199",
  mutedSoft: "#a3b0bc",
  onMuted: "#ffffff",
  ink: "#0b2a4a",
  canvas: "#0b1f36",
  canvasAlt: "#11304f",
  onCanvas: "#eef3f8",
  onCanvasMuted: "#c4d0dc",
  surface: "#0f2740",
  surfaceRaised: "#15324f",
  border: "rgba(120, 170, 205, 0.32)",
  text: "#e9f1f7",
  textMuted: "#a9bccb",
  accent: "#5cc0ec",
  accentStrong: "#3bb4ea",
  focus: "#29a8e0",
  inkOnLight: "#122f4d",
  inkOnLightSoft: "#173d63",
  paper: "#ffffff",
};

// Calibration from the approved palette (OKLCH lightness / chroma per role).
const REF_CHROMA = 0.084; // chroma of the default primary
const ACCENT_HUE_SHIFT = -20; // the default accent sits ~20° from the primary hue (analogous)
const WHITE = "#ffffff";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Generates a harmonious palette from any primary colour.
 *
 * Method: convert the primary to OKLCH and keep the *lightness structure* of the
 * approved design (dark canvas and surfaces, mid-tone segments, light text) while
 * adopting the primary's hue and scaling chroma by how colourful the primary is.
 * Every foreground is then checked against its background with WCAG contrast
 * and nudged lighter/darker until it passes.
 */
export function generatePalette(primaryInput: string): ThemePalette {
  const source = normalizeHex(primaryInput) ?? DEFAULT_PRIMARY;
  if (source === DEFAULT_PRIMARY) return DEFAULT_PALETTE;

  const p = hexToOklch(source);
  const h = p.h;
  // How colourful the palette should be relative to the approved navy (greys stay grey).
  const k = clamp(p.c / REF_CHROMA, 0, 1.8);
  const tone = (l: number, refC: number, cap: number, hue = h): Oklch => ({ l, c: Math.min(refC * k, cap), h: hue });
  const hex = oklchToHex;
  const accentHue = (h + ACCENT_HUE_SHIFT + 360) % 360;

  // --- Dark structure (canvas, surfaces, ring) ---
  const canvas = hex(tone(0.236, 0.052, 0.07));
  const canvasAlt = hex(tone(0.303, 0.067, 0.09));
  const surface = hex(tone(0.268, 0.056, 0.075));
  const surfaceRaised = hex(tone(0.31, 0.063, 0.085));
  const ink = hex(tone(0.281, 0.069, 0.09));

  // --- Text on dark surfaces (checked against the lightest dark surface) ---
  const text = hex(ensureContrast(tone(0.954, 0.012, 0.02), surfaceRaised, 7, "lighter"));
  const textMuted = hex(ensureContrast(tone(0.785, 0.03, 0.045), surfaceRaised, 4.5, "lighter"));
  const onCanvas = hex(ensureContrast(tone(0.962, 0.009, 0.02), canvasAlt, 7, "lighter"));
  const onCanvasMuted = hex(ensureContrast(tone(0.86, 0.02, 0.035), canvasAlt, 4.5, "lighter"));

  // --- Accents (analogous hue, bright enough for dark surfaces) ---
  const accent = hex(ensureContrast(tone(0.765, 0.112, 0.15, accentHue), surfaceRaised, 4.5, "lighter"));
  const accentStrong = hex(ensureContrast(tone(0.727, 0.13, 0.17, accentHue), ink, 3, "lighter"));
  const focus = hex(ensureContrast(tone(0.69, 0.132, 0.17, accentHue), surface, 3, "lighter"));
  const border = withAlpha(hex(tone(0.716, 0.074, 0.1, accentHue)), 0.32);

  // --- Segment fills: muted tones of the hue; white labels at least as readable as the default ---
  const mutedT = ensureContrast(tone(0.671, 0.034, 0.055), WHITE, 3, "darker");
  const mutedStrongT = ensureContrast({ ...tone(0.594, 0.046, 0.075), l: Math.min(0.594, mutedT.l - 0.07) }, WHITE, 4, "darker");
  const muted = hex(mutedT);
  const mutedStrong = hex(mutedStrongT);
  const mutedSoft = hex(tone(0.751, 0.023, 0.04));

  // --- Primary (selected state): keep the user's colour when it works ---
  const inkOnLight = hex(ensureContrast(tone(0.3, 0.065, 0.09), WHITE, 7, "darker"));
  const inkOnLightSoft = hex(ensureContrast(tone(0.353, 0.079, 0.11), WHITE, 4.5, "darker"));
  let primaryT: Oklch = { ...p };
  let onPrimary = WHITE;
  // Selected must stand out from normal and hover fills: perceptual distance (ΔE in
  // OKLab) counts lightness AND colourfulness, so a vivid orange next to muted
  // segments is distinct even at a similar lightness.
  const deltaE = (a: Oklch, b: Oklch) => {
    const ab = (t: Oklch) => [t.c * Math.cos((t.h * Math.PI) / 180), t.c * Math.sin((t.h * Math.PI) / 180)];
    const [a1, b1] = ab(a);
    const [a2, b2] = ab(b);
    return Math.hypot(a.l - b.l, a1 - a2, b1 - b2);
  };
  const distinct = (t: Oklch) => deltaE(t, mutedT) >= 0.12 && deltaE(t, mutedStrongT) >= 0.1;
  if (contrast(source, WHITE) >= 4.5 && distinct(p)) {
    onPrimary = WHITE;
  } else if (p.l > mutedT.l && contrast(source, inkOnLight) >= 4.5 && distinct(p)) {
    // Light, vivid primaries (yellow, orange, light green…) stay as chosen with dark labels.
    onPrimary = inkOnLight;
  } else {
    // Mid-tone primaries are darkened until white labels pass AA and the state is distinct.
    primaryT = ensureContrast({ ...p, l: Math.min(p.l, mutedStrongT.l - 0.08) }, WHITE, 4.5, "darker");
    onPrimary = WHITE;
  }
  const primary = hex(primaryT);

  return {
    source,
    primary,
    onPrimary,
    primaryDark: hex({ ...primaryT, l: clamp(primaryT.l - 0.1, 0, 1) }),
    primaryDarker: hex({ ...primaryT, l: clamp(primaryT.l - 0.2, 0, 1) }),
    primaryLight: hex({ ...primaryT, l: clamp(primaryT.l + 0.12, 0, 1) }),
    primaryLighter: hex({ ...primaryT, l: clamp(primaryT.l + 0.25, 0, 1) }),
    muted,
    mutedStrong,
    mutedSoft,
    onMuted: WHITE,
    ink,
    canvas,
    canvasAlt,
    onCanvas,
    onCanvasMuted,
    surface,
    surfaceRaised,
    border,
    text,
    textMuted,
    accent,
    accentStrong,
    focus,
    inkOnLight,
    inkOnLightSoft,
    paper: WHITE,
  };
}
