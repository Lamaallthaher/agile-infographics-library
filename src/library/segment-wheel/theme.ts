import type { CSSProperties } from "react";
import type { WheelPanelLabels, WheelTheme } from "./types";

/**
 * Default theme: muted blue-grey segments, white separators, a deep navy ring
 * and a clean white hub — a classic operating-model wheel.
 */
export const DEFAULT_THEME: WheelTheme = {
  segment: "#8598aa",
  segmentHover: "#6a8199",
  segmentActive: "#1f4670",
  segmentDisabled: "#a3b0bc",
  segmentStroke: "#ffffff",
  frame: "#ffffff",
  disc: "#0b2a4a",
  hub: "#ffffff",
  hubRing: "transparent",
  label: "#ffffff",
  centerText: "#122f4d",
  centerIcon: "#173d63",
  focus: "#29a8e0",
  marker: "#3bb4ea",
  surface: "#0f2740",
  surfaceRaised: "#15324f",
  border: "rgba(120, 170, 205, 0.32)",
  text: "#e9f1f7",
  textMuted: "#a9bccb",
  accent: "#5cc0ec",
  fontFamily: '"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
  dimOpacity: 0.55,
};

export const DEFAULT_LABELS: WheelPanelLabels = {
  listTitle: "Segments",
  hint: "Select a segment on the wheel or in the list.",
  hoverHint: "Click to select",
  unavailable: "Not available yet",
  selected: "Selected",
  keyPoints: "Key points",
  emptyDetails: "Select a segment on the wheel or in the list to see its details.",
  previous: "Previous",
  next: "Next",
};

export function resolveTheme(partial?: Partial<WheelTheme>): WheelTheme {
  return { ...DEFAULT_THEME, ...partial };
}

const VAR_NAMES: Record<keyof WheelTheme, string> = {
  segment: "--sw-segment",
  segmentHover: "--sw-segment-hover",
  segmentActive: "--sw-segment-active",
  segmentDisabled: "--sw-segment-disabled",
  segmentStroke: "--sw-segment-stroke",
  frame: "--sw-frame",
  disc: "--sw-disc",
  hub: "--sw-hub",
  hubRing: "--sw-hub-ring",
  label: "--sw-label",
  centerText: "--sw-center-text",
  centerIcon: "--sw-center-icon",
  focus: "--sw-focus",
  marker: "--sw-marker",
  surface: "--sw-surface",
  surfaceRaised: "--sw-surface-raised",
  border: "--sw-border",
  text: "--sw-text",
  textMuted: "--sw-text-muted",
  accent: "--sw-accent",
  fontFamily: "--sw-font",
  dimOpacity: "--sw-dim",
};

/** Converts a theme into inline CSS custom properties for the component root. */
export function themeToCssVars(theme: WheelTheme): CSSProperties {
  const style: Record<string, string> = {};
  for (const key of Object.keys(VAR_NAMES) as (keyof WheelTheme)[]) {
    style[VAR_NAMES[key]] = String(theme[key]);
  }
  return style as CSSProperties;
}
