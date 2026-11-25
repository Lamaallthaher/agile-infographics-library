import type { DimensionContent, FlowPlacement, ThemeOverrides } from "../library/methodology-flow";
import type { IconKey } from "../shared/icons";

/**
 * Plain, JSON-serialisable content of a Methodology Flow. This is what users
 * edit and what is saved to Local Storage — no React nodes.
 */
export interface MethodologyStepData {
  id: string;
  kicker: string;
  title: string;
  description: string;
  bullets: string[];
  takeaway: string;
  icon: IconKey;
}

export interface AssessmentDimensionData {
  id: string;
  label: string;
  description: string;
  icon: IconKey;
  /** Custom colour (#rrggbb) or null to use the theme's automatic shade. */
  color: string | null;
}

export interface MethodologyFlowData {
  version: 1;
  title: string;
  subtitle: string;
  steps: MethodologyStepData[];
  wheel: {
    /** Empty = show the number of dimensions automatically. */
    centerValue: string;
    centerLabel: string;
    resultTitle: string;
    resultDescription: string;
    dimensions: AssessmentDimensionData[];
  };
}

/**
 * Look and layout, stored separately from the content so that changing the
 * theme never touches the text (and vice versa).
 */
export interface MethodologyAppearance {
  version: 1;
  /** Base colour (#rrggbb) the palette is generated from. */
  base: string;
  /** Preset id when the base came from a preset; null for a custom colour. */
  preset: string | null;
  /** Individual colour overrides on top of the generated theme. */
  overrides: ThemeOverrides;
  typography: { scale: number; titleWeight: number; align: "left" | "center" };
  placement: FlowPlacement;
  dimensionContent: DimensionContent;
}

export interface MethodologyLimits {
  minSteps: number;
  maxSteps: number;
  minDimensions: number;
  maxDimensions: number;
  maxBullets: number;
  /** Maximum characters per field kind. */
  maxLength: {
    title: number;
    subtitle: number;
    kicker: number;
    stepTitle: number;
    description: number;
    bullet: number;
    takeaway: number;
    centerValue: number;
    centerLabel: number;
    resultTitle: number;
    resultDescription: number;
    dimLabel: number;
    dimDescription: number;
  };
}

export const DEFAULT_METHODOLOGY_LIMITS: MethodologyLimits = {
  minSteps: 2,
  maxSteps: 8,
  minDimensions: 3,
  maxDimensions: 12,
  maxBullets: 8,
  maxLength: {
    title: 100,
    subtitle: 220,
    kicker: 32,
    stepTitle: 80,
    description: 400,
    bullet: 160,
    takeaway: 160,
    centerValue: 6,
    centerLabel: 40,
    resultTitle: 100,
    resultDescription: 240,
    dimLabel: 48,
    dimDescription: 200,
  },
};

export const TYPE_SCALES = [
  { value: 0.9, label: "S" },
  { value: 1, label: "M" },
  { value: 1.1, label: "L" },
  { value: 1.2, label: "XL" },
] as const;

export const TITLE_WEIGHTS = [
  { value: 600, label: "Semibold" },
  { value: 700, label: "Bold" },
  { value: 800, label: "Heavy" },
] as const;
