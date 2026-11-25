import type { FlowPlacement } from "./types";

/**
 * Pure layout maths for the Methodology Flow. No DOM access: given the
 * available width and the number of steps it returns grid placements, so the
 * same CSS handles 2 or 8 steps, wide screens and phones.
 */

export type FlowMode = "row" | "stacked" | "vertical";

export interface GridPlacement {
  column: number;
  span: number;
  row: number;
}

export interface FlowLayout {
  mode: FlowMode;
  /** CSS grid-template-columns for the flow grid. */
  columns: string;
  steps: { text: GridPlacement & { side: "top" | "bottom" | "side" }; node: GridPlacement }[];
}

export interface FlowLayoutOptions {
  placement: FlowPlacement;
  align: "left" | "center";
  /** Typography scale; larger text needs wider columns. */
  scale?: number;
}

/** Minimum comfortable width of one step column in CSS pixels. */
export function minStepColumn(placement: FlowPlacement, align: "left" | "center", scale = 1) {
  // Alternating left-aligned text spans two columns, so each column can be narrower.
  const base = placement === "alternate" && align === "left" ? 150 : 205;
  return base * scale;
}

/** Width reserved for the assessment wheel when it sits beside the flow. */
export const WHEEL_COLUMN = 330;
const TAIL = 0.55; // extra column after the last step (connector end / last text overhang)

export function chooseFlowMode(width: number, steps: number, opts: FlowLayoutOptions): FlowMode {
  const col = minStepColumn(opts.placement, opts.align, opts.scale);
  const flow = steps * col + TAIL * col;
  if (width >= flow + WHEEL_COLUMN + 48) return "row";
  if (width >= flow) return "stacked";
  return "vertical";
}

export function computeFlowLayout(width: number, steps: number, opts: FlowLayoutOptions): FlowLayout {
  const mode = chooseFlowMode(width, steps, opts);
  if (mode === "vertical") {
    return {
      mode,
      columns: "auto minmax(0, 1fr)",
      steps: Array.from({ length: steps }, (_, i) => ({
        node: { column: 1, span: 1, row: i + 1 },
        text: { column: 2, span: 1, row: i + 1, side: "side" as const },
      })),
    };
  }
  // Horizontal: rows are [text above] [nodes + connector] [text below].
  const spanTwo = opts.placement === "alternate" && opts.align === "left";
  return {
    mode,
    columns: `repeat(${steps}, minmax(0, 1fr)) minmax(0, ${TAIL}fr)`,
    steps: Array.from({ length: steps }, (_, i) => {
      const top = opts.placement === "above" || (opts.placement === "alternate" && i % 2 === 0);
      return {
        node: { column: i + 1, span: 1, row: 2 },
        // Alternating text may overhang into the next column, whose text sits on the other side.
        text: { column: i + 1, span: spanTwo ? 2 : 1, row: top ? 1 : 3, side: top ? ("top" as const) : ("bottom" as const) },
      };
    }),
  };
}

/** Geometry of the assessment wheel in percentages of its square box. */
export interface WheelNodeLayout {
  /** Centre position, % of the box. */
  x: number;
  y: number;
  /** Diameter, % of the box. */
  size: number;
  angle: number;
}

export interface AssessmentWheelLayout {
  discRadius: number;
  centerRadius: number;
  ringRadius: number;
  nodes: WheelNodeLayout[];
}

/**
 * Evenly distributes `count` dimension nodes on a ring, starting at 12 o'clock.
 * Node size shrinks as the count grows so neighbours never touch the centre or each other.
 */
export function computeWheelLayout(count: number): AssessmentWheelLayout {
  const discRadius = 48;
  const centerRadius = 17.5;
  const ringRadius = 33;
  const gap = 0.8; // fraction of the chord a node may fill
  const chord = count > 1 ? 2 * ringRadius * Math.sin(Math.PI / count) : 40;
  const size = Math.max(8.5, Math.min(18, chord * gap));
  const nodes = Array.from({ length: count }, (_, i) => {
    const angle = -90 + (360 / Math.max(1, count)) * i;
    const rad = (angle * Math.PI) / 180;
    return {
      x: Math.round((50 + ringRadius * Math.cos(rad)) * 100) / 100,
      y: Math.round((50 + ringRadius * Math.sin(rad)) * 100) / 100,
      size: Math.round(size * 100) / 100,
      angle,
    };
  });
  return { discRadius, centerRadius, ringRadius, nodes };
}
