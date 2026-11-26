import type { ConnectorShape, GroupSide, LayoutPreference } from "./types";

/**
 * Pure layout maths for the Ecosystem Map. No DOM access: the component
 * measures the rendered boxes and passes numbers in, so every rule here can be
 * reasoned about (and tested) on its own.
 *
 * Modes
 * - radial:  groups on four sides of the centre (left and right columns, top
 *            and bottom rows). Wide screens.
 * - columns: the centre on top, groups in two columns joined by a central spine.
 * - stack:   the centre on top, groups in one column joined by a side spine.
 */

export type MapMode = "radial" | "columns" | "stack";
export type Side = Exclude<GroupSide, "auto">;

/** Minimum stage widths (CSS px at text scale 1) for each multi-column mode. */
export const MODE_MIN_WIDTH = { radial: 880, radialSingle: 620, columns: 600 } as const;

export function chooseMapMode(width: number, groupCount: number, preference: LayoutPreference = "auto", scale = 1): MapMode {
  const radialMin = (groupCount <= 1 ? MODE_MIN_WIDTH.radialSingle : MODE_MIN_WIDTH.radial) * scale;
  const columnsMin = MODE_MIN_WIDTH.columns * scale;
  const fits: Record<MapMode, boolean> = { radial: width >= radialMin, columns: width >= columnsMin && groupCount > 1, stack: true };
  // A preferred mode is used whenever it fits; otherwise fall back to the next narrower one (never clip).
  const order: MapMode[] = preference === "columns" ? ["columns", "stack"] : preference === "stack" ? ["stack"] : ["radial", "columns", "stack"];
  return order.find((m) => fits[m]) ?? "stack";
}

/** Clockwise order in which sides are filled, starting at 12 o'clock. */
export const CLOCKWISE: readonly Side[] = ["top", "right", "bottom", "left"];
/** How many groups one side can hold without squeezing (top/bottom rows never wrap). */
export const SIDE_CAPACITY: Record<Side, number> = { top: 4, right: 6, bottom: 4, left: 6 };

/** Balanced number of groups per side for `n` groups placed automatically. */
export function sideTargets(n: number): Record<Side, number> {
  if (n <= 0) return { top: 0, right: 0, bottom: 0, left: 0 };
  if (n === 1) return { top: 0, right: 1, bottom: 0, left: 0 };
  const column = Math.min(3, Math.floor(n / 2));
  const rest = n - 2 * column;
  return { top: Math.ceil(rest / 2), right: column, bottom: Math.floor(rest / 2), left: column };
}

export interface SideAssignment {
  /** Group ids per side, in clockwise order (top: left→right, right: top→bottom, bottom: right→left, left: bottom→top). */
  sides: Record<Side, string[]>;
  sideOf: Record<string, Side>;
  /** Groups whose preferred side was full and that were placed elsewhere. */
  moved: string[];
}

/**
 * Places groups around the centre. Groups with a preferred side go there (while
 * it has room); the others fill the balanced targets clockwise in data order,
 * so reordering the data moves a group to the next position around the centre.
 */
export function assignSides(groups: readonly { id: string; side?: GroupSide }[]): SideAssignment {
  const sides: Record<Side, string[]> = { top: [], right: [], bottom: [], left: [] };
  const sideOf: Record<string, Side> = {};
  const moved: string[] = [];
  const targets = sideTargets(groups.length);
  const preferred = new Map<string, Side>();
  const load: Record<Side, number> = { top: 0, right: 0, bottom: 0, left: 0 };

  for (const g of groups) {
    const side = g.side && g.side !== "auto" ? g.side : null;
    if (!side) continue;
    if (load[side] < SIDE_CAPACITY[side]) {
      preferred.set(g.id, side);
      load[side]++;
    } else moved.push(g.id);
  }
  const leastLoaded = (): Side =>
    // Prefer the columns (more room), then the rows; ties go clockwise.
    (["left", "right", "top", "bottom"] as Side[])
      .filter((s) => load[s] < SIDE_CAPACITY[s])
      .sort((a, b) => load[a] / SIDE_CAPACITY[a] - load[b] / SIDE_CAPACITY[b])[0] ?? "right";

  let cursor = 0;
  for (const g of groups) {
    let side = preferred.get(g.id);
    if (!side) {
      // Next side (clockwise) that is still below its balanced target.
      while (cursor < CLOCKWISE.length && load[CLOCKWISE[cursor]] >= targets[CLOCKWISE[cursor]]) cursor++;
      side = cursor < CLOCKWISE.length ? CLOCKWISE[cursor] : leastLoaded();
      load[side]++;
    }
    sides[side].push(g.id);
    sideOf[g.id] = side;
  }
  return { sides, sideOf, moved };
}

/* ---------------------------------------------------------------------------
 * Connector routing
 * ------------------------------------------------------------------------- */

export interface Point {
  x: number;
  y: number;
}

export interface Circle extends Point {
  r: number;
}

/* ---------------------------------------------------------------------------
 * Segmented centre ring
 * ------------------------------------------------------------------------- */

/** Angles in degrees, clockwise from 12 o'clock. */
export interface RingSegment {
  start: number;
  end: number;
  mid: number;
}

const norm = (deg: number) => ((deg % 360) + 360) % 360;

/**
 * Splits the ring into one equal segment per group and rotates it so that each
 * segment faces its group: groups are taken in the order of their angle around
 * the centre, and the ring's rotation is the circular mean of the offsets.
 * Returns the segment of each input, in input order.
 */
export function ringSegments(anchorAngles: readonly number[]): RingSegment[] {
  const n = anchorAngles.length;
  if (n === 0) return [];
  const step = 360 / n;
  const order = anchorAngles.map((a, i) => ({ a: norm(a), i })).sort((x, y) => x.a - y.a);
  let sx = 0;
  let sy = 0;
  order.forEach(({ a }, k) => {
    const rad = ((a - k * step) * Math.PI) / 180;
    sx += Math.cos(rad);
    sy += Math.sin(rad);
  });
  const offset = n === 1 ? order[0].a : (Math.atan2(sy, sx) * 180) / Math.PI;
  const out: RingSegment[] = new Array(n);
  order.forEach(({ i }, k) => {
    const mid = norm(offset + k * step);
    out[i] = { start: norm(mid - step / 2), end: norm(mid + step / 2), mid: Math.round(mid * 100) / 100 };
  });
  return out;
}

/** Angle (degrees clockwise from 12 o'clock) of point `p` seen from `c`. */
export function angleFrom(c: Point, p: Point): number {
  return norm((Math.atan2(p.y - c.y, p.x - c.x) * 180) / Math.PI + 90);
}

/**
 * SVG path of one ring segment (an annular sector) in a 100 × 100 box centred
 * on (50, 50), between radii `inner` and `outer`, with `gap` degrees left open
 * at each end so neighbouring segments are visibly separated.
 */
export function ringSegmentPath(seg: RingSegment, outer = 50, inner = 40, gap = 3): string {
  const span = norm(seg.end - seg.start) || 360;
  const a0 = seg.start + gap / 2;
  const a1 = seg.start + span - gap / 2;
  const p = (r: number, a: number) => {
    const rad = (a * Math.PI) / 180;
    return `${r2(50 + r * Math.sin(rad))} ${r2(50 - r * Math.cos(rad))}`;
  };
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${p(outer, a0)} A ${outer} ${outer} 0 ${large} 1 ${p(outer, a1)} L ${p(inner, a1)} A ${inner} ${inner} 0 ${large} 0 ${p(inner, a0)} Z`;
}

export interface ConnectorInput {
  mode: MapMode;
  /** Side of the group (radial mode); ignored in the other modes. */
  side: Side;
  shape: ConnectorShape;
  center: Circle;
  /** Where the connector meets the card (edge point facing the centre). */
  anchor: Point;
  /** y of the horizontal "bus" in the gap between the centre and a row of cards. */
  busY?: number;
  /** x of the vertical spine (columns and stack modes). */
  spineX?: number;
  /**
   * Radial mode: where the connector leaves the centre (degrees clockwise from
   * 12 o'clock), normally the middle of the group's ring segment. Omitted =
   * towards the card.
   */
  startAngle?: number;
}

export interface ConnectorPath {
  d: string;
  /** Where a label sits (radial mode). */
  label: Point;
  start: Point;
  end: Point;
  /** Direction of travel at each end (unit vectors), for arrowheads. */
  startDir: Point;
  endDir: Point;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const pt = (p: Point) => `${r2(p.x)} ${r2(p.y)}`;
const unit = (a: Point, b: Point): Point => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
};

/** Removes repeated and collinear points of an orthogonal route. */
function simplify(points: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - p.x) < 0.5 && Math.abs(last.y - p.y) < 0.5) continue;
    out.push(p);
  }
  for (let i = out.length - 2; i > 0; i--) {
    const a = out[i - 1];
    const b = out[i];
    const c = out[i + 1];
    if ((Math.abs(a.x - b.x) < 0.5 && Math.abs(b.x - c.x) < 0.5) || (Math.abs(a.y - b.y) < 0.5 && Math.abs(b.y - c.y) < 0.5)) out.splice(i, 1);
  }
  return out;
}

/** An orthogonal polyline with rounded corners. */
export function roundedPath(points: Point[], radius: number): string {
  const p = simplify(points);
  if (p.length < 2) return p.length ? `M ${pt(p[0])}` : "";
  let d = `M ${pt(p[0])}`;
  for (let i = 1; i < p.length - 1; i++) {
    const a = p[i - 1];
    const b = p[i];
    const c = p[i + 1];
    const rIn = Math.min(radius, Math.hypot(b.x - a.x, b.y - a.y) / 2);
    const rOut = Math.min(radius, Math.hypot(c.x - b.x, c.y - b.y) / 2);
    const r = Math.min(rIn, rOut);
    const u1 = unit(b, a);
    const u2 = unit(b, c);
    d += ` L ${pt({ x: b.x + u1.x * r, y: b.y + u1.y * r })} Q ${pt(b)} ${pt({ x: b.x + u2.x * r, y: b.y + u2.y * r })}`;
  }
  return `${d} L ${pt(p[p.length - 1])}`;
}

/** Point at the middle of the longest segment of a polyline (label position). */
function midOfLongest(points: Point[], prefer?: "last" | "first"): Point {
  const p = simplify(points);
  if (p.length < 2) return p[0] ?? { x: 0, y: 0 };
  if (prefer) {
    const [a, b] = prefer === "last" ? [p[p.length - 2], p[p.length - 1]] : [p[0], p[1]];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }
  let best = 0;
  let at = { x: p[0].x, y: p[0].y };
  for (let i = 1; i < p.length; i++) {
    const len = Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y);
    if (len > best) {
      best = len;
      at = { x: (p[i].x + p[i - 1].x) / 2, y: (p[i].y + p[i - 1].y) / 2 };
    }
  }
  return at;
}

/**
 * Route from the centre circle to a card. Routes stay inside the gaps between
 * the centre and the cards, so they never cross another card:
 * - left/right (radial): within the gutter between the centre and the column.
 * - top/bottom (radial): up/down to the bus in the row gap, along it, then to the card.
 * - columns/stack: down to the bus, along it to the spine, down the spine, then to the card.
 */
export function routeConnector(input: ConnectorInput): ConnectorPath {
  const { mode, side, shape, center: C, anchor: E } = input;
  const corner = shape === "curved" ? 18 : shape === "elbow" ? 8 : 0;
  // Point on the circle at a ring angle, and the outward direction there.
  const radialAt = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: Math.sin(rad), y: -Math.cos(rad) };
  };
  const onCircle = (deg: number) => {
    const u = radialAt(deg);
    return { x: C.x + u.x * C.r, y: C.y + u.y * C.r };
  };
  const angle = input.startAngle;

  if (mode === "radial" && (side === "left" || side === "right")) {
    const dirX = side === "left" ? -1 : 1;
    // The segment must face the card's side; otherwise leave towards the card.
    const useAngle = angle !== undefined && radialAt(angle).x * dirX > 0.2;
    if (shape === "elbow") {
      const S = useAngle ? onCircle(angle!) : { x: C.x + dirX * C.r, y: C.y };
      const midX = (S.x + E.x) / 2;
      const pts = [S, { x: midX, y: S.y }, { x: midX, y: E.y }, E];
      return { d: roundedPath(pts, corner), label: midOfLongest(pts, Math.abs(E.y - S.y) > 4 ? "last" : undefined), start: S, end: E, startDir: { x: dirX, y: 0 }, endDir: { x: dirX, y: 0 } };
    }
    const u = useAngle ? radialAt(angle!) : unit(C, E);
    const S = { x: C.x + u.x * C.r, y: C.y + u.y * C.r };
    if (shape === "straight") {
      const along = unit(S, E);
      return { d: `M ${pt(S)} L ${pt(E)}`, label: { x: (S.x + E.x) / 2, y: (S.y + E.y) / 2 }, start: S, end: E, startDir: along, endDir: along };
    }
    // Curved: leaves the ring radially, arrives horizontally (an S-curve between the ring and the card).
    const dx = Math.abs(E.x - S.x);
    const c1 = { x: S.x + u.x * dx * 0.4, y: S.y + u.y * dx * 0.4 };
    const c2 = { x: E.x - dirX * dx * 0.5, y: E.y };
    const at = (t: number) => {
      const m = 1 - t;
      return {
        x: m * m * m * S.x + 3 * m * m * t * c1.x + 3 * m * t * t * c2.x + t * t * t * E.x,
        y: m * m * m * S.y + 3 * m * m * t * c1.y + 3 * m * t * t * c2.y + t * t * t * E.y,
      };
    };
    return { d: `M ${pt(S)} C ${pt(c1)} ${pt(c2)} ${pt(E)}`, label: at(0.55), start: S, end: E, startDir: u, endDir: { x: dirX, y: 0 } };
  }

  if (mode === "radial") {
    // Top / bottom rows.
    const dirY = side === "top" ? -1 : 1;
    // Start from the segment only when it faces this row (so the first segment never crosses the centre).
    const S = angle !== undefined && radialAt(angle).y * dirY > 0.5 ? onCircle(angle) : { x: C.x, y: C.y + dirY * C.r };
    const busY = input.busY ?? (S.y + E.y) / 2;
    const pts = [S, { x: S.x, y: busY }, { x: E.x, y: busY }, E];
    const straightUp = Math.abs(E.x - S.x) < 1;
    return {
      d: straightUp ? `M ${pt(S)} L ${pt(E)}` : roundedPath(pts, shape === "straight" ? 4 : corner),
      label: straightUp ? { x: S.x, y: (S.y + E.y) / 2 } : { x: E.x, y: busY },
      start: S,
      end: E,
      startDir: { x: 0, y: dirY },
      endDir: { x: 0, y: dirY },
    };
  }

  // Columns / stack: centre → bus → spine → card.
  const S = { x: C.x, y: C.y + C.r };
  const busY = input.busY ?? S.y + 16;
  const spineX = input.spineX ?? C.x;
  const pts = [S, { x: S.x, y: busY }, { x: spineX, y: busY }, { x: spineX, y: E.y }, E];
  const endDir = { x: Math.sign(E.x - spineX) || 1, y: 0 };
  return { d: roundedPath(pts, shape === "straight" ? 4 : corner), label: midOfLongest(pts, "last"), start: S, end: E, startDir: { x: 0, y: 1 }, endDir };
}

/** Arrowheads at each end of a path drawn from the centre to a group. */
export function arrowEnds(direction: "none" | "forward" | "backward" | "both", sourceIsCenter: boolean) {
  const atTarget = direction === "forward" || direction === "both";
  const atSource = direction === "backward" || direction === "both";
  return sourceIsCenter ? { atGroup: atTarget, atCenter: atSource } : { atGroup: atSource, atCenter: atTarget };
}
