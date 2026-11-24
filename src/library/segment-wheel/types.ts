import type { ReactNode } from "react";

/**
 * One segment of the wheel. All content is supplied by the consumer;
 * the component never hardcodes names or descriptions.
 */
export interface WheelSegment {
  /** Stable, unique id (used for selection state and callbacks). */
  id: string;
  /** Full title, shown in the list, details panel and screen-reader labels. */
  title: string;
  /**
   * Optional explicit line breaks for the label inside the wheel.
   * When omitted, the title is wrapped automatically to fit the segment.
   */
  label?: string[];
  /**
   * Inline icon: the *contents* of a 24×24 stroke SVG (paths, circles…).
   * Rendered with `stroke="currentColor"`, so it follows the theme's label colour.
   */
  icon?: ReactNode;
  /** Alternative to `icon`: URL of an image (SVG/PNG) to draw instead. */
  iconUrl?: string;
  /** Short description for the details panel. */
  summary?: string;
  /** Key points / bullet list for the details panel. */
  points?: string[];
  /** Small tags shown in the details panel (e.g. owners, maturity). */
  tags?: string[];
  /** Short label/value facts shown as a grid in the details panel (e.g. Owner: COO). */
  meta?: { label: string; value: string }[];
  /** Optional score shown as a segmented meter (e.g. maturity 3 of 5). */
  rating?: { label: string; value: number; max: number; caption?: string };
  /** Unavailable segments can be hovered and inspected but not selected. */
  disabled?: boolean;
  /** Optional status text (e.g. "Planned for Q3"). Defaults to the panel labels. */
  status?: string;
}

/** Content of the white centre hub. */
export interface WheelCenter {
  /** Title as one string (auto-wrapped) or explicit lines. */
  title: string | string[];
  /** Small muted line under the title (e.g. "7 components"). */
  subtitle?: string;
  icon?: ReactNode;
  iconUrl?: string;
}

/**
 * Geometry in SVG user units, measured from the wheel centre.
 * Angles are degrees clockwise from 12 o'clock.
 */
export interface WheelGeometry {
  /** Radius of the outer (shadowed) frame circle. */
  frameRadius: number;
  /** Radius of the background disc that shows through the gaps. */
  discRadius: number;
  /** Outer radius of the segments. */
  radius: number;
  /** Radius of the centre hub. */
  hubRadius: number;
  /** Outward offset of every segment along its bisector, as a fraction of `radius`. */
  explosion: number;
  /** Angle at which the first segment starts. */
  startAngle: number;
  /** Radius at which icon + label are centred. Defaults to midway across the visible band. */
  contentRadius?: number;
  /** Width of the radial separator lines drawn between segments (0 = none). */
  separatorWidth: number;
}

/** Colours and typography. Every field becomes a CSS custom property (`--sw-*`). */
export interface WheelTheme {
  segment: string;
  /** Fill of a hovered / keyboard-focused segment. */
  segmentHover: string;
  /** Fill of the selected segment. */
  segmentActive: string;
  segmentDisabled: string;
  segmentStroke: string;
  frame: string;
  disc: string;
  hub: string;
  hubRing: string;
  label: string;
  /** Label/icon colour on the selected segment (dark when the selected fill is light). */
  labelActive: string;
  centerText: string;
  centerIcon: string;
  focus: string;
  /** Rim marker that points at the selected segment. */
  marker: string;
  /** Panel (list + details) colours. */
  surface: string;
  surfaceRaised: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  fontFamily: string;
  /** Opacity of the other segments' icons/labels while one segment is hovered. */
  dimOpacity: number;
}

/** Everything needed to render one wheel. */
export interface WheelConfig {
  id: string;
  /** Accessible name for the wheel graphic. */
  ariaLabel: string;
  center?: WheelCenter;
  segments: WheelSegment[];
  geometry?: Partial<WheelGeometry>;
  theme?: Partial<WheelTheme>;
}

/** UI strings used by the panel (override for other languages or tone). */
export interface WheelPanelLabels {
  listTitle: string;
  hint: string;
  /** Shown in the status pill while hovering a segment other than the selected one. */
  hoverHint: string;
  unavailable: string;
  selected: string;
  keyPoints: string;
  emptyDetails: string;
  previous: string;
  next: string;
}
