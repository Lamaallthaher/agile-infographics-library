export { IconSlot, SegmentWheel } from "./SegmentWheel";
export type { SegmentWheelProps } from "./SegmentWheel";
export { SegmentWheelPanel } from "./SegmentWheelPanel";
export type { SegmentWheelPanelProps } from "./SegmentWheelPanel";
export {
  DEFAULT_GEOMETRY,
  MAX_SEGMENTS,
  MIN_SEGMENTS,
  arcPath,
  estimateTextWidth,
  fitLabels,
  layoutCenter,
  layoutSegments,
  polar,
  resolveGeometry,
  sectorPath,
  separatorPaths,
  wrapLabel,
} from "./geometry";
export type { MeasureText, Point, SegmentLayout } from "./geometry";
export { DEFAULT_LABELS, DEFAULT_THEME, paletteToWheelTheme, resolveTheme, themeToCssVars } from "./theme";
export type {
  WheelCenter,
  WheelConfig,
  WheelGeometry,
  WheelPanelLabels,
  WheelSegment,
  WheelTheme,
} from "./types";

// Core utilities a client needs to theme this component and fill its data model,
// re-exported so a client imports everything from this one package (works with
// npm, pnpm and yarn without installing @agile-infographics/core directly).
export { DEFAULT_PRIMARY, generatePalette, ICON_KEYS, isIconKey, THEME_PRESETS } from "@agile-infographics/core";
export type { IconKey, ThemePalette, ThemePreset } from "@agile-infographics/core";
