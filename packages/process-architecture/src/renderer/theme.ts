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
import type { ColorScheme, ProcessOverrides, ProcessTheme } from "./types";

const FONT = '"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';

export interface ProcessThemeOptions {
  /** Secondary colour: accents, connectors and the last core group; null/omitted = derived from the primary. */
  secondary?: string | null;
  scheme?: ColorScheme;
  overrides?: ProcessOverrides;
}

/**
 * Maps a generated palette (see @agile-infographics/core) onto the Process
 * Architecture Map in a dark or light scheme. Text colours that were not
 * overridden are re-checked for contrast against their (possibly overridden)
 * backgrounds; text on coloured nodes is chosen per node with `readableOn`.
 */
export function paletteToProcessTheme(p: ThemePalette, options: ProcessThemeOptions = {}): ProcessTheme {
  const scheme = options.scheme ?? "dark";
  const o = Object.fromEntries(
    Object.entries(options.overrides ?? {})
      .map(([k, v]) => [k, normalizeHex(v ?? "")])
      .filter(([, v]) => v),
  ) as ProcessOverrides;
  const base = hexToOklch(p.primary);
  const secondary = (options.secondary && normalizeHex(options.secondary)) || null;
  const second = secondary ?? (scheme === "light" ? oklchToHex({ l: 0.52, c: Math.max(base.c, 0.09), h: (base.h + 340) % 360 }) : p.accentStrong);

  const light = scheme === "light";
  const background = o.background ?? (light ? oklchToHex({ l: 0.965, c: Math.min(base.c * 0.18, 0.014), h: base.h }) : p.canvas);
  const panel = o.panel ?? (light ? oklchToHex({ l: 0.988, c: Math.min(base.c * 0.08, 0.006), h: base.h }) : p.surface);
  const surface = o.surface ?? (light ? "#ffffff" : p.surfaceRaised);
  const lightSurface = isLightColor(surface);
  const lightPanel = isLightColor(panel);
  const lightBg = isLightColor(background);
  const ink = lightSurface ? p.inkOnLight : p.text;

  const valueChain = o.valueChain ?? p.primary;
  const valueChainText = readableOn(valueChain, "#ffffff", p.inkOnLight, 4.5).fg;

  return {
    background,
    headingOnBackground: o.heading && contrast(o.heading, background) >= 4.5 ? o.heading : ensureReadable(lightBg ? p.inkOnLight : p.onCanvas, background, 7),
    subtitleOnBackground: ensureReadable(lightBg ? mixOklch(p.inkOnLight, background, 0.25) : p.onCanvasMuted, background, 4.5),
    panel,
    panelBorder: withAlpha(lightPanel ? p.inkOnLight : p.text, lightPanel ? 0.12 : 0.14),
    surface,
    surfaceBorder: withAlpha(ink, lightSurface ? 0.16 : 0.18),
    heading: o.heading ?? ensureReadable(ink, surface, 7),
    text: o.text ?? ensureReadable(ink, surface, 7),
    textMuted: ensureReadable(lightSurface ? mixOklch(p.inkOnLight, surface, 0.28) : p.textMuted, surface, 4.5),
    accent: ensureReadable(o.accent ?? second, surface, 4.5),
    valueChain,
    valueChainText,
    valueChainMuted: ensureReadable(mixOklch(valueChainText, valueChain, 0.25), valueChain, 4.5),
    // Core groups: the main flow, from the primary towards the secondary colour.
    coreFrom: o.coreFrom ?? (light ? p.primary : mixOklch(p.primary, p.primaryLight, 0.35)),
    coreTo: o.coreTo ?? ensureReadable(light ? second : mixOklch(second, p.primary, 0.35), panel, 2),
    management: o.management ?? (light ? mixOklch(p.primary, "#ffffff", 0.78) : mixOklch(p.mutedStrong, panel, 0.35)),
    support: o.support ?? (light ? mixOklch(p.inkOnLightSoft, "#ffffff", 0.86) : mixOklch(p.muted, panel, 0.55)),
    // Number circles: like group nodes, darkened just enough for a 4.5:1 label.
    step: groupNodeColors(ensureReadable(second, surface, 3)).bg,
    stepText: groupNodeColors(ensureReadable(second, surface, 3)).fg,
    connector: ensureReadable(lightPanel ? mixOklch(p.primary, panel, 0.45) : mixOklch(second, panel, 0.4), panel, 1.8),
    selected: ensureReadable(second, panel, 3),
    focus: ensureReadable(lightPanel ? p.primary : p.focus, panel, 3),
    fontFamily: FONT,
  };
}

/**
 * Colour and label colour of a process group node. Theme-generated colours
 * (ramp shades, management and support tones) are darkened just enough for
 * white labels to reach 4.5:1; a custom colour is kept as chosen and gets the
 * more readable of white and dark text.
 */
export function groupNodeColors(bg: string, custom = false): { bg: string; fg: string } {
  const best = readableOn(bg, "#ffffff", DARK_INK, 4.5);
  if (best.passes || custom) return { bg, fg: best.fg };
  return { bg: ensureReadable(bg, "#ffffff", 4.5), fg: "#ffffff" };
}

const DARK_INK = "#10202f";

const VAR_NAMES: Record<keyof ProcessTheme, string> = {
  background: "--pa-background",
  headingOnBackground: "--pa-heading-on-bg",
  subtitleOnBackground: "--pa-subtitle-on-bg",
  panel: "--pa-panel",
  panelBorder: "--pa-panel-border",
  surface: "--pa-surface",
  surfaceBorder: "--pa-surface-border",
  heading: "--pa-heading",
  text: "--pa-text",
  textMuted: "--pa-text-muted",
  accent: "--pa-accent",
  valueChain: "--pa-l0",
  valueChainText: "--pa-l0-text",
  valueChainMuted: "--pa-l0-muted",
  coreFrom: "--pa-core-from",
  coreTo: "--pa-core-to",
  management: "--pa-management",
  support: "--pa-support",
  step: "--pa-step",
  stepText: "--pa-step-text",
  connector: "--pa-connector",
  selected: "--pa-selected",
  focus: "--pa-focus",
  fontFamily: "--pa-font",
};

export function processThemeToCssVars(theme: ProcessTheme): CSSProperties {
  const style: Record<string, string> = {};
  for (const key of Object.keys(VAR_NAMES) as (keyof ProcessTheme)[]) style[VAR_NAMES[key]] = theme[key];
  return style as CSSProperties;
}

export interface ContrastCheck {
  name: string;
  ratio: number;
  min: number;
  passes: boolean;
}

/** Key text/background pairs of the theme, for warnings in an editor. */
export function checkProcessContrast(t: ProcessTheme): ContrastCheck[] {
  const group = (bg: string) => groupNodeColors(bg);
  const pairs: [string, string, string, number][] = [
    ["Heading on background", t.headingOnBackground, t.background, 4.5],
    ["Subtitle on background", t.subtitleOnBackground, t.background, 4.5],
    ["Titles on cards", t.heading, t.surface, 4.5],
    ["Body text on cards", t.text, t.surface, 4.5],
    ["Secondary text on cards", t.textMuted, t.surface, 4.5],
    ["Accent text on cards", t.accent, t.surface, 4.5],
    ["Value chain title", t.valueChainText, t.valueChain, 4.5],
    ["Value chain details", t.valueChainMuted, t.valueChain, 4.5],
    ["First core group", group(t.coreFrom).fg, group(t.coreFrom).bg, 4.5],
    ["Last core group", group(t.coreTo).fg, group(t.coreTo).bg, 4.5],
    ["Management groups", group(t.management).fg, group(t.management).bg, 4.5],
    ["Support groups", group(t.support).fg, group(t.support).bg, 4.5],
    ["Activity numbers", t.stepText, t.step, 4.5],
  ];
  return pairs.map(([name, fg, bg, min]) => {
    const ratio = Math.round(contrast(fg, bg) * 100) / 100;
    return { name, ratio, min, passes: ratio >= min };
  });
}
