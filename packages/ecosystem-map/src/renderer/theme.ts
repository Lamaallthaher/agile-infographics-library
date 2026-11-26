import type { CSSProperties } from "react";
import {
  contrast,
  ensureReadable,
  hexToOklch,
  isLightColor,
  mixOklch,
  normalizeHex,
  oklchToHex,
  readableOn,
  withAlpha,
  type ThemePalette,
} from "@agile-infographics/core";
import type { ColorScheme, EcosystemOverrides, EcosystemTheme } from "./types";

const FONT = '"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';

export interface EcosystemThemeOptions {
  /** Secondary colour for accents, connectors and the last group colour; null/omitted = derived. */
  secondary?: string | null;
  scheme?: ColorScheme;
  overrides?: EcosystemOverrides;
}

/**
 * Maps a generated palette (see @agile-infographics/core) onto the Ecosystem
 * Map, in a dark or light scheme, with an optional secondary colour and
 * per-colour overrides. Text colours that were not overridden are re-checked
 * against the (possibly overridden) backgrounds and adjusted for contrast.
 */
export function paletteToEcosystemTheme(p: ThemePalette, options: EcosystemThemeOptions = {}): EcosystemTheme {
  const scheme = options.scheme ?? "dark";
  const o = Object.fromEntries(
    Object.entries(options.overrides ?? {})
      .map(([k, v]) => [k, normalizeHex(v ?? "")])
      .filter(([, v]) => v),
  ) as EcosystemOverrides;
  const secondary = (options.secondary && normalizeHex(options.secondary)) || null;
  const base = hexToOklch(p.primary);

  let background: string;
  let panel: string;
  let surface: string;
  if (scheme === "light") {
    background = o.background ?? oklchToHex({ l: 0.965, c: Math.min(base.c * 0.18, 0.014), h: base.h });
    panel = o.panel ?? oklchToHex({ l: 0.988, c: Math.min(base.c * 0.08, 0.006), h: base.h });
    surface = o.surface ?? "#ffffff";
  } else {
    background = o.background ?? p.canvas;
    panel = o.panel ?? p.surface;
    surface = o.surface ?? p.surfaceRaised;
  }
  const lightSurface = isLightColor(surface);
  const lightPanel = isLightColor(panel);
  const lightBg = isLightColor(background);
  const ink = lightSurface ? p.inkOnLight : p.text;

  // Secondary: the user's colour, or an analogous accent of the primary.
  const second = secondary ?? (scheme === "light" ? oklchToHex({ l: 0.5, c: Math.max(base.c, 0.09), h: (base.h + 340) % 360 }) : p.accentStrong);

  const heading = o.heading ?? ensureReadable(lightSurface ? p.inkOnLight : p.text, surface, 7);
  const text = o.text ?? ensureReadable(lightSurface ? p.inkOnLight : p.text, surface, 7);
  const textMuted = ensureReadable(lightSurface ? mixOklch(p.inkOnLight, surface, 0.28) : p.textMuted, surface, 4.5);
  const accent = ensureReadable(o.accent ?? second, surface, 4.5);

  const groupFrom = o.groupFrom ?? ensureReadable(scheme === "light" ? p.primary : second, surface, 3);
  const groupTo = o.groupTo ?? ensureReadable(scheme === "light" ? second : p.primaryLighter, surface, 3);

  const centerFill = o.centerFill ?? p.primary;
  const centerText = readableOn(centerFill, "#ffffff", p.inkOnLight, 4.5).fg;
  const centerSubtitle = ensureReadable(mixOklch(centerText, centerFill, 0.22), centerFill, 4.5);

  const connectorBase = o.connector ?? (lightPanel ? mixOklch(p.primary, panel, 0.35) : mixOklch(second, panel, 0.3));

  return {
    background,
    headingOnBackground:
      o.heading && contrast(o.heading, background) >= 4.5 ? o.heading : ensureReadable(lightBg ? p.inkOnLight : p.onCanvas, background, 7),
    subtitleOnBackground: ensureReadable(lightBg ? mixOklch(p.inkOnLight, background, 0.25) : p.onCanvasMuted, background, 4.5),
    panel,
    panelBorder: withAlpha(lightPanel ? p.inkOnLight : p.text, lightPanel ? 0.12 : 0.14),
    surface,
    surfaceBorder: withAlpha(ink, lightSurface ? 0.16 : 0.18),
    heading,
    text,
    textMuted,
    accent,
    itemFill: withAlpha(ink, lightSurface ? 0.045 : 0.06),
    connector: ensureReadable(connectorBase, panel, 1.8),
    connectorActive: ensureReadable(o.connector ?? second, panel, 3),
    centerFill,
    centerRing: withAlpha(lightPanel ? centerFill : second, lightPanel ? 0.16 : 0.3),
    centerText,
    centerSubtitle,
    groupFrom,
    groupTo,
    labelFill: surface,
    labelText: textMuted,
    focus: ensureReadable(lightPanel ? p.primary : p.focus, panel, 3),
    fontFamily: FONT,
  };
}

const VAR_NAMES: Record<keyof EcosystemTheme, string> = {
  background: "--em-background",
  headingOnBackground: "--em-heading-on-bg",
  subtitleOnBackground: "--em-subtitle-on-bg",
  panel: "--em-panel",
  panelBorder: "--em-panel-border",
  surface: "--em-surface",
  surfaceBorder: "--em-surface-border",
  heading: "--em-heading",
  text: "--em-text",
  textMuted: "--em-text-muted",
  accent: "--em-accent",
  itemFill: "--em-item-fill",
  connector: "--em-connector",
  connectorActive: "--em-connector-active",
  centerFill: "--em-center-fill",
  centerRing: "--em-center-ring",
  centerText: "--em-center-text",
  centerSubtitle: "--em-center-subtitle",
  groupFrom: "--em-group-from",
  groupTo: "--em-group-to",
  labelFill: "--em-label-fill",
  labelText: "--em-label-text",
  focus: "--em-focus",
  fontFamily: "--em-font",
};

export function ecosystemThemeToCssVars(theme: EcosystemTheme): CSSProperties {
  const style: Record<string, string> = {};
  for (const key of Object.keys(VAR_NAMES) as (keyof EcosystemTheme)[]) style[VAR_NAMES[key]] = theme[key];
  return style as CSSProperties;
}

export interface ContrastCheck {
  name: string;
  ratio: number;
  min: number;
  passes: boolean;
}

/** Key text/background pairs of the theme, for warnings in an editor. */
export function checkEcosystemContrast(t: EcosystemTheme): ContrastCheck[] {
  const pairs: [string, string, string, number][] = [
    ["Heading on background", t.headingOnBackground, t.background, 4.5],
    ["Subtitle on background", t.subtitleOnBackground, t.background, 4.5],
    ["Group titles on cards", t.heading, t.surface, 4.5],
    ["Body text on cards", t.text, t.surface, 4.5],
    ["Secondary text on cards", t.textMuted, t.surface, 4.5],
    ["Accent text on cards", t.accent, t.surface, 4.5],
    ["Centre title", t.centerText, t.centerFill, 4.5],
    ["Centre subtitle", t.centerSubtitle, t.centerFill, 4.5],
    ["Connector labels", t.labelText, t.labelFill, 4.5],
  ];
  return pairs.map(([name, fg, bg, min]) => {
    const ratio = Math.round(contrast(fg, bg) * 100) / 100;
    return { name, ratio, min, passes: ratio >= min };
  });
}
