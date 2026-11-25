import type { CSSProperties } from "react";
import {
  contrast,
  ensureReadable,
  hexToOklch,
  isLightColor,
  normalizeHex,
  oklchToHex,
  withAlpha,
  type ThemePalette,
} from "@agile-infographics/core";
import type { MethodologyTheme } from "./types";

const FONT = '"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';

/** Colours a user may override individually ("advanced colours"). */
export const OVERRIDE_KEYS = [
  "background",
  "panel",
  "heading",
  "text",
  "kicker",
  "connector",
  "stepFrom",
  "stepTo",
  "dimFrom",
  "dimTo",
] as const;
export type OverrideKey = (typeof OVERRIDE_KEYS)[number];
export type ThemeOverrides = Partial<Record<OverrideKey, string>>;

export const OVERRIDE_LABELS: Record<OverrideKey, string> = {
  background: "Background",
  panel: "Panel",
  heading: "Headings",
  text: "Body text",
  kicker: "Accent text",
  connector: "Connector",
  stepFrom: "First step",
  stepTo: "Last step",
  dimFrom: "First dimension",
  dimTo: "Last dimension",
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Maps a generated palette (see @agile-infographics/core) onto the Methodology
 * Flow, then applies optional per-colour overrides. Text colours that were not
 * overridden are re-checked against the (possibly overridden) backgrounds and
 * adjusted for contrast, so a light panel automatically gets dark text.
 */
export function paletteToMethodologyTheme(p: ThemePalette, overrides: ThemeOverrides = {}): MethodologyTheme {
  const o = Object.fromEntries(
    Object.entries(overrides)
      .map(([k, v]) => [k, normalizeHex(v ?? "")])
      .filter(([, v]) => v),
  ) as ThemeOverrides;

  const base = hexToOklch(p.primary);
  const h = base.h;
  const vivid = clamp(base.c * 1.35, 0, 0.14);
  // Progressive node shades, darkest first (as in the reference flow), kept dark enough for white icons.
  const stepFromAuto = oklchToHex({ l: 0.37, c: Math.min(vivid, 0.09), h });
  const stepToAuto = oklchToHex({ l: 0.56, c: vivid, h });
  const dimFromAuto = p.primary;
  const dimToAuto = oklchToHex({ l: 0.55, c: clamp(base.c * 0.55, 0, 0.06), h });

  const background = o.background ?? p.canvas;
  const panel = o.panel ?? p.surfaceRaised;
  const lightPanel = isLightColor(panel);
  const lightBg = isLightColor(background);

  // Text on the panel: keep palette colours if readable, otherwise flip/adjust automatically.
  const autoText = (dark: string, light: string, bg: string, isLight: boolean, min: number) =>
    ensureReadable(isLight ? dark : light, bg, min);
  const heading = o.heading ?? autoText(p.inkOnLight, p.text, panel, lightPanel, 7);
  const text = o.text ?? autoText(p.inkOnLight, p.text, panel, lightPanel, 7);
  const textMuted = autoText(p.inkOnLightSoft, p.textMuted, panel, lightPanel, 4.5);
  const kicker = o.kicker ?? ensureReadable(p.accent, panel, 4.5);
  const takeaway = ensureReadable(o.kicker ?? p.accent, panel, 4.5);

  return {
    background,
    headingOnBackground: o.heading && contrast(o.heading, background) >= 4.5 ? o.heading : autoText(p.inkOnLight, p.onCanvas, background, lightBg, 7),
    subtitleOnBackground: autoText(p.inkOnLightSoft, p.textMuted, background, lightBg, 4.5),
    panel,
    panelBorder: withAlpha(lightPanel ? p.inkOnLight : p.text, lightPanel ? 0.14 : 0.16),
    heading,
    text,
    textMuted,
    kicker,
    takeaway,
    connector: o.connector ?? (lightPanel ? p.primaryLight : withAlpha(p.accentStrong, 0.55)),
    nodeHalo: withAlpha(lightPanel ? p.inkOnLight : p.text, 0.09),
    stepFrom: o.stepFrom ?? stepFromAuto,
    stepTo: o.stepTo ?? stepToAuto,
    dimFrom: o.dimFrom ?? dimFromAuto,
    dimTo: o.dimTo ?? dimToAuto,
    wheelDisc: withAlpha(lightPanel ? p.primary : p.text, lightPanel ? 0.07 : 0.07),
    wheelBorder: withAlpha(lightPanel ? p.primary : p.text, 0.18),
    spoke: withAlpha(lightPanel ? p.primary : p.text, 0.35),
    centerFill: p.ink,
    centerRing: p.accentStrong,
    centerText: "#ffffff",
    centerLabel: ensureReadable(p.accent, p.ink, 4.5),
    accent: ensureReadable(p.accentStrong, panel, 3),
    focus: ensureReadable(p.focus, panel, 3),
    fontFamily: FONT,
  };
}

const VAR_NAMES: Record<keyof MethodologyTheme, string> = {
  background: "--mf-background",
  headingOnBackground: "--mf-heading-on-bg",
  subtitleOnBackground: "--mf-subtitle-on-bg",
  panel: "--mf-panel",
  panelBorder: "--mf-panel-border",
  heading: "--mf-heading",
  text: "--mf-text",
  textMuted: "--mf-text-muted",
  kicker: "--mf-kicker",
  takeaway: "--mf-takeaway",
  connector: "--mf-connector",
  nodeHalo: "--mf-node-halo",
  stepFrom: "--mf-step-from",
  stepTo: "--mf-step-to",
  dimFrom: "--mf-dim-from",
  dimTo: "--mf-dim-to",
  wheelDisc: "--mf-wheel-disc",
  wheelBorder: "--mf-wheel-border",
  spoke: "--mf-spoke",
  centerFill: "--mf-center-fill",
  centerRing: "--mf-center-ring",
  centerText: "--mf-center-text",
  centerLabel: "--mf-center-label",
  accent: "--mf-accent",
  focus: "--mf-focus",
  fontFamily: "--mf-font",
};

export function methodologyThemeToCssVars(theme: MethodologyTheme): CSSProperties {
  const style: Record<string, string> = {};
  for (const key of Object.keys(VAR_NAMES) as (keyof MethodologyTheme)[]) style[VAR_NAMES[key]] = theme[key];
  return style as CSSProperties;
}

export interface ContrastCheck {
  name: string;
  ratio: number;
  min: number;
  passes: boolean;
}

/** Key text/background pairs for the theme, for warnings in an editor. */
export function checkThemeContrast(t: MethodologyTheme): ContrastCheck[] {
  const pairs: [string, string, string, number][] = [
    ["Heading on background", t.headingOnBackground, t.background, 4.5],
    ["Step titles on panel", t.heading, t.panel, 4.5],
    ["Body text on panel", t.text, t.panel, 4.5],
    ["Secondary text on panel", t.textMuted, t.panel, 4.5],
    ["Accent text on panel", t.kicker, t.panel, 4.5],
    ["Takeaway on panel", t.takeaway, t.panel, 4.5],
    ["Centre label", t.centerLabel, t.centerFill, 4.5],
  ];
  return pairs.map(([name, fg, bg, min]) => {
    const ratio = Math.round(contrast(fg, bg) * 100) / 100;
    return { name, ratio, min, passes: ratio >= min };
  });
}
