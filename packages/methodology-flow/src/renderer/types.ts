import type { ReactNode } from "react";

/**
 * Render input for the Methodology Flow. All content comes from the consumer;
 * the renderer never hardcodes wording. Icons are React nodes (the contents of
 * a 24×24 stroke SVG), so any icon set can be used.
 */
export interface FlowStep {
  id: string;
  /** Small label above the title, shown after the step number ("01 · Research"). */
  kicker: string;
  title: string;
  description: string;
  bullets: string[];
  /** Optional highlighted takeaway line. */
  takeaway: string;
  icon?: ReactNode;
}

export interface FlowDimension {
  id: string;
  label: string;
  description: string;
  icon?: ReactNode;
  /** Optional custom colour (#rrggbb). Omitted = taken from the theme's ramp. */
  color?: string | null;
}

export interface FlowWheel {
  /** Big value in the centre. Empty = the number of dimensions. */
  centerValue: string;
  centerLabel: string;
  resultTitle: string;
  resultDescription: string;
  dimensions: FlowDimension[];
}

export interface FlowModel {
  title: string;
  subtitle: string;
  steps: FlowStep[];
  wheel: FlowWheel;
}

/** Where step text sits relative to the connector. */
export type FlowPlacement = "alternate" | "above" | "below";
/** What the dimension nodes show. */
export type DimensionContent = "number" | "icon";

export interface FlowTypography {
  /** Overall text scale (1 = default). */
  scale: number;
  /** Weight of headings and step titles. */
  titleWeight: number;
  /** Step text alignment. "center" centres each step under its node. */
  align: "left" | "center";
}

/** All colours used by the component; every field becomes a --mf-* CSS variable. */
export interface MethodologyTheme {
  /** Page area behind the infographic (also behind the main heading). */
  background: string;
  headingOnBackground: string;
  subtitleOnBackground: string;
  /** Rounded panel that holds the flow and the wheel. */
  panel: string;
  panelBorder: string;
  heading: string;
  text: string;
  textMuted: string;
  /** Step kicker and numbers. */
  kicker: string;
  takeaway: string;
  connector: string;
  /** Translucent ring around step nodes. */
  nodeHalo: string;
  /** Step node colours run from stepFrom (first) to stepTo (last). */
  stepFrom: string;
  stepTo: string;
  /** Dimension node colours run from dimFrom to dimTo (unless a dimension sets its own). */
  dimFrom: string;
  dimTo: string;
  wheelDisc: string;
  wheelBorder: string;
  spoke: string;
  centerFill: string;
  centerRing: string;
  centerText: string;
  centerLabel: string;
  /** Selection ring, focus outlines and accents in controls. */
  accent: string;
  focus: string;
  fontFamily: string;
}

/** Identifies an editable text field (used by the Text slot). */
export type FieldRef =
  | { kind: "title" | "subtitle" | "centerValue" | "centerLabel" | "resultTitle" | "resultDescription" }
  | { kind: "kicker" | "stepTitle" | "description" | "takeaway"; stepId: string }
  | { kind: "bullet"; stepId: string; index: number }
  | { kind: "dimLabel" | "dimDescription"; dimId: string };

export interface TextSlotProps {
  field: FieldRef;
  value: string;
  className: string;
  /** Element used by the default (read-only) renderer. */
  as: "h2" | "h3" | "p" | "span" | "li" | "div";
  placeholder: string;
  multiline?: boolean;
}

/**
 * Optional render slots. Without slots the component is a read-only infographic;
 * an editor passes slots to make text editable and add controls.
 */
export interface FlowSlots {
  Text?: (props: TextSlotProps) => ReactNode;
  /** Replaces the icon inside a step node (e.g. with an icon picker). */
  stepIcon?: (step: FlowStep, index: number, icon: ReactNode) => ReactNode;
  /** Extra controls shown with a step's text (move, delete…). */
  stepToolbar?: (step: FlowStep, index: number) => ReactNode;
  /** Content after a step's bullets (e.g. "Add point"). */
  stepFooter?: (step: FlowStep, index: number) => ReactNode;
  /** Replaces the icon/colour badge of a dimension in the legend. */
  dimensionBadge?: (dim: FlowDimension, index: number, badge: ReactNode) => ReactNode;
  dimensionToolbar?: (dim: FlowDimension, index: number) => ReactNode;
  /** Content after the legend (e.g. "Add dimension"). */
  legendFooter?: () => ReactNode;
}
