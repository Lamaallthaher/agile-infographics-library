export { MethodologyFlow } from "./MethodologyFlow";
export type { MethodologyFlowProps } from "./MethodologyFlow";
export { chooseFlowMode, computeFlowLayout, computeWheelLayout, minStepColumn, WHEEL_COLUMN } from "./layout";
export type { AssessmentWheelLayout, FlowLayout, FlowMode, GridPlacement, WheelNodeLayout } from "./layout";
export {
  checkThemeContrast,
  methodologyThemeToCssVars,
  OVERRIDE_KEYS,
  OVERRIDE_LABELS,
  paletteToMethodologyTheme,
} from "./theme";
export type { ContrastCheck, OverrideKey, ThemeOverrides } from "./theme";
export type {
  DimensionContent,
  FieldRef,
  FlowDimension,
  FlowModel,
  FlowPlacement,
  FlowSlots,
  FlowStep,
  FlowTypography,
  FlowWheel,
  MethodologyTheme,
  TextSlotProps,
} from "./types";

// Core utilities a client needs to theme this component and fill its data model,
// re-exported so a client imports everything from this one package (works with
// npm, pnpm and yarn without installing @agile-infographics/core directly).
export { DEFAULT_PRIMARY, generatePalette, ICON_KEYS, isIconKey, THEME_PRESETS } from "@agile-infographics/core";
export type { IconKey, ThemePalette, ThemePreset } from "@agile-infographics/core";
