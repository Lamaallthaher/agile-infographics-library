import type { WheelGeometry } from "./types";

/**
 * Pure, deterministic geometry for the Segment Wheel.
 * All coordinates are rounded to 2 decimals so server/client and repeated
 * renders always produce byte-identical SVG paths.
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Default proportions: a thin white outer edge, a dark ring, flush segments
 * separated by white radial lines, and a large white hub covering the inner
 * part of every segment. The first segment starts at 12 o'clock.
 */
export const DEFAULT_GEOMETRY: WheelGeometry = {
  frameRadius: 258,
  discRadius: 254,
  radius: 242,
  hubRadius: 112,
  explosion: 0,
  startAngle: 0,
  separatorWidth: 5,
};

export const MIN_SEGMENTS = 2;
export const MAX_SEGMENTS = 12;

export function resolveGeometry(partial?: Partial<WheelGeometry>): WheelGeometry {
  return { ...DEFAULT_GEOMETRY, ...partial };
}

export function round(value: number): number {
  const v = Math.round(value * 100) / 100;
  return Object.is(v, -0) ? 0 : v;
}

/** Point at `radius` and `degrees` (clockwise from 12 o'clock), relative to `origin`. */
export function polar(radius: number, degrees: number, origin: Point = { x: 0, y: 0 }): Point {
  const rad = (degrees * Math.PI) / 180;
  return { x: round(origin.x + radius * Math.sin(rad)), y: round(origin.y - radius * Math.cos(rad)) };
}

/**
 * Annular sector (ring segment) between `inner` and `outer` radii, translated by `offset`.
 * With `inner <= 0` a plain pie wedge is produced.
 */
export function sectorPath(inner: number, outer: number, start: number, end: number, offset: Point): string {
  const large = end - start > 180 ? 1 : 0;
  const o0 = polar(outer, start, offset);
  const o1 = polar(outer, end, offset);
  const R = round(outer);
  if (inner <= 0) {
    return `M${offset.x} ${offset.y}L${o0.x} ${o0.y}A${R} ${R} 0 ${large} 1 ${o1.x} ${o1.y}Z`;
  }
  const i1 = polar(inner, end, offset);
  const i0 = polar(inner, start, offset);
  const r = round(inner);
  return `M${o0.x} ${o0.y}A${R} ${R} 0 ${large} 1 ${o1.x} ${o1.y}L${i1.x} ${i1.y}A${r} ${r} 0 ${large} 0 ${i0.x} ${i0.y}Z`;
}

/** Greedy word wrap. Lines beyond `maxLines` are merged into the last line. */
export function wrapLabel(text: string, maxChars: number, maxLines = 3): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars || !current) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) {
    return [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(" ")];
  }
  return lines;
}

/** Font/icon sizes that keep labels inside their segment as the count grows. */
export function typeScale(count: number, g: WheelGeometry) {
  const k = g.radius / DEFAULT_GEOMETRY.radius;
  // [max segment count, font size, icon size]
  const steps: [number, number, number][] = [
    [5, 15, 46],
    [7, 14.5, 42],
    [8, 13.5, 38],
    [9, 13, 36],
    [10, 12.5, 33],
    [Infinity, 12, 30],
  ];
  const [, base, icon] = steps.find(([max]) => count <= max)!;
  const fontSize = round(base * k);
  return {
    fontSize,
    lineHeight: round(fontSize * 1.18),
    iconSize: round(icon * k),
    gap: round(6 * k),
  };
}

export interface SegmentLayout {
  index: number;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  /** Translation applied by the explosion. */
  offset: Point;
  /** Ring-segment path (already exploded). */
  path: string;
  /** Centre of the icon + label block. */
  content: Point;
  icon: { x: number; y: number; size: number };
  label: { x: number; y: number; lines: string[]; fontSize: number; lineHeight: number };
}

/** Vertically stacks an optional icon above label lines, centred on `c`. */
function stackBlock(
  c: Point,
  hasIcon: boolean,
  lines: string[],
  sizes: { fontSize: number; lineHeight: number; iconSize: number; gap: number },
) {
  const iconBlock = hasIcon ? sizes.iconSize + sizes.gap : 0;
  const height = iconBlock + lines.length * sizes.lineHeight;
  const top = c.y - height / 2;
  return {
    icon: { x: round(c.x - sizes.iconSize / 2), y: round(top), size: sizes.iconSize },
    // First baseline: top of the text block + ~78% of a line (cap-height centring).
    label: {
      x: round(c.x),
      y: round(top + iconBlock + sizes.lineHeight * 0.78),
      lines,
      fontSize: sizes.fontSize,
      lineHeight: sizes.lineHeight,
    },
  };
}

/** Returns the rendered width of `text` at `fontSize` (bold label font). */
export type MeasureText = (text: string, fontSize: number) => number;

/** Fallback when no real text measurement is available (e.g. outside a browser). */
export const estimateTextWidth: MeasureText = (text, fontSize) => text.length * fontSize * 0.6;

/** Greedy word wrap by measured width. */
function wrapByWidth(text: string, maxWidth: number, fontSize: number, measure: MeasureText): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (!current || measure(next, fontSize) <= maxWidth) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Shortens `text` with an ellipsis until it fits `maxWidth`. */
function ellipsize(text: string, maxWidth: number, fontSize: number, measure: MeasureText): string {
  if (measure(text, fontSize) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && measure(`${t.trimEnd()}…`, fontSize) > maxWidth) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

/**
 * Fits every label into `maxLines` lines of at most `maxWidth`, using ONE shared
 * font size (largest that fits all labels, down to `minFont`). Labels that still
 * do not fit at `minFont` are truncated with an ellipsis.
 */
export function fitLabels(
  texts: string[],
  maxWidth: number | number[],
  baseFont: number,
  minFont: number,
  maxLines: number,
  measure: MeasureText,
): { fontSize: number; lines: string[][] } {
  const widthOf = (i: number) => (Array.isArray(maxWidth) ? maxWidth[i] : maxWidth);
  const fits = (lines: string[], fs: number, i: number) =>
    lines.length <= maxLines && lines.every((l) => measure(l, fs) <= widthOf(i));
  for (let fs = baseFont; fs >= minFont - 0.001; fs -= 0.5) {
    const all = texts.map((t, i) => wrapByWidth(t, widthOf(i), fs, measure));
    if (all.every((lines, i) => fits(lines, fs, i))) return { fontSize: round(fs), lines: all };
  }
  const fs = round(minFont);
  const lines = texts.map((t, i) => {
    const wrapped = wrapByWidth(t, widthOf(i), fs, measure);
    const kept =
      wrapped.length > maxLines
        ? [...wrapped.slice(0, maxLines - 1), wrapped.slice(maxLines - 1).join(" ")]
        : wrapped;
    return kept.map((l) => ellipsize(l, widthOf(i), fs, measure));
  });
  return { fontSize: fs, lines };
}

export function layoutSegments(
  segments: { title: string; label?: string[]; hasIcon: boolean }[],
  g: WheelGeometry,
  measure: MeasureText = estimateTextWidth,
): SegmentLayout[] {
  const count = segments.length;
  if (count === 0) return [];
  const span = 360 / count;
  const base = typeScale(count, g);
  const shift = g.radius * g.explosion;
  // Inner edge sits just under the hub so segments appear to meet it.
  const inner = Math.max(0, g.hubRadius - shift - 1);
  const band = g.radius - g.hubRadius;
  // With many narrow segments, move the content outward where the segment is wider.
  const contentRadius = g.contentRadius ?? g.hubRadius + band * (count >= 9 ? 0.54 : 0.5);
  const sepGap = g.separatorWidth / 2 + 4; // clearance from each separator's centre line
  const margin = 5; // clearance from the hub and the outer edge

  /**
   * Widest label line that keeps the (horizontal) text box of a `lines`-line label
   * fully inside segment `index`: clear of both separators, the hub and the outer
   * edge. Exact box-vs-wedge test, solved by bisection on the half-width.
   */
  const widthFor = (index: number, lines: number, fontSize: number) => {
    const start = ((g.startAngle + index * span) * Math.PI) / 180;
    const end = start + (span * Math.PI) / 180;
    const c = polar(contentRadius, g.startAngle + index * span + span / 2, polar(shift, g.startAngle + index * span + span / 2));
    const iconBlock = segments[index].hasIcon ? base.iconSize + base.gap : 0;
    const height = iconBlock + lines * round(fontSize * 1.18);
    const y0 = c.y - height / 2 + iconBlock;
    const y1 = c.y + height / 2;
    // Inward normals of the two separator lines (screen coordinates, y down).
    const n1 = { x: Math.cos(start), y: Math.sin(start) };
    const n2 = { x: -Math.cos(end), y: -Math.sin(end) };
    const fits = (a: number) => {
      const x0 = c.x - a;
      const x1 = c.x + a;
      for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) {
        if (span < 180 && (x * n1.x + y * n1.y < sepGap || x * n2.x + y * n2.y < sepGap)) return false;
        if (Math.hypot(x, y) > g.radius - margin) return false;
      }
      // Closest point of the box to the centre must stay outside the hub.
      const px = Math.min(Math.max(0, x0), x1);
      const py = Math.min(Math.max(0, y0), y1);
      return Math.hypot(px, py) >= g.hubRadius + margin;
    };
    let lo = 0;
    let hi = band;
    if (!fits(lo)) return 24;
    for (let i = 0; i < 18; i++) {
      const midA = (lo + hi) / 2;
      if (fits(midA)) lo = midA;
      else hi = midA;
    }
    return Math.max(24, 2 * lo);
  };

  const texts = segments.map((s) => s.title.trim() || "Untitled");
  /** Wraps a label in up to 2 lines, or 3 if its segment has room; null if it does not fit. */
  const tryFit = (text: string, index: number, fontSize: number): string[] | null => {
    for (const n of [2, 3]) {
      const width = widthFor(index, n, fontSize);
      const lines = wrapByWidth(text, width, fontSize, measure);
      if (lines.length <= n && lines.every((l) => measure(l, fontSize) <= width)) return lines;
    }
    return null;
  };

  // One shared font size; it shrinks only slightly so a single long name cannot
  // make every label tiny. Names that still do not fit are ellipsised.
  const minFont = round(base.fontSize * 0.82);
  let fontSize = minFont;
  let labelLines: string[][] | null = null;
  for (let fs = base.fontSize; fs >= minFont - 0.001; fs -= 0.5) {
    const all = texts.map((t, i) => tryFit(t, i, fs));
    if (all.every(Boolean)) {
      fontSize = round(fs);
      labelLines = all as string[][];
      break;
    }
  }
  if (!labelLines) {
    labelLines = texts.map(
      (t, i) => tryFit(t, i, fontSize) ?? fitLabels([t], widthFor(i, 3, fontSize), fontSize, fontSize, 3, measure).lines[0],
    );
  }
  const fitted = { lines: labelLines };
  const sizes = { ...base, fontSize, lineHeight: round(fontSize * 1.18) };

  return segments.map((segment, index) => {
    const start = g.startAngle + index * span;
    const end = start + span;
    const mid = start + span / 2;
    const offset = polar(shift, mid);
    const content = polar(contentRadius, mid, offset);
    const lines = segment.label?.length ? segment.label : fitted.lines[index];
    const block = stackBlock(content, segment.hasIcon, lines, sizes);
    return {
      index,
      startAngle: start,
      endAngle: end,
      midAngle: mid,
      offset,
      path: sectorPath(inner, g.radius, start, end, offset),
      content,
      ...block,
    };
  });
}

/** Radial separator lines on every segment boundary, from under the hub to the segment edge. */
export function separatorPaths(count: number, g: WheelGeometry): string[] {
  if (count < 2 || g.separatorWidth <= 0) return [];
  const span = 360 / count;
  return Array.from({ length: count }, (_, i) => {
    const angle = g.startAngle + i * span;
    const a = polar(g.hubRadius - 2, angle);
    const b = polar(g.radius, angle);
    return `M${a.x} ${a.y}L${b.x} ${b.y}`;
  });
}

/** Open arc (for strokes) at `radius` between two angles. */
export function arcPath(radius: number, start: number, end: number): string {
  const a = polar(radius, start);
  const b = polar(radius, end);
  const large = end - start > 180 ? 1 : 0;
  const r = round(radius);
  return `M${a.x} ${a.y}A${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`;
}

/**
 * Hub layout: optional icon, title lines and an optional smaller subtitle, centred
 * on the origin. Font and icon shrink until every line fits inside the circle;
 * anything still too long is truncated with an ellipsis.
 */
export function layoutCenter(
  title: string | string[],
  hasIcon: boolean,
  g: WheelGeometry,
  subtitle: string | boolean = false,
  measure: MeasureText = estimateTextWidth,
) {
  const R = g.hubRadius;
  const k = R / DEFAULT_GEOMETRY.hubRadius;
  const maxLines = 4;
  const hasSubtitle = Boolean(subtitle);
  const subText = typeof subtitle === "string" ? subtitle : "";
  /** Usable width of a horizontal line spanning y0..y1 inside the hub. */
  const widthAt = (y0: number, y1: number) => {
    const y = Math.max(Math.abs(y0), Math.abs(y1));
    return y >= R ? 0 : 2 * Math.sqrt(R * R - y * y) - 18 * k;
  };

  const build = (fontSize: number, iconSize: number, wrap: boolean) => {
    const lineHeight = round(fontSize * 1.22);
    const gap = round(10 * k * (iconSize / (58 * k)));
    const subFont = round(Math.min(11.5 * k, fontSize * 0.78));
    const subGap = round(7 * k);
    const raw = Array.isArray(title) ? title.filter((l) => l.trim()) : [title.trim()].filter(Boolean);
    // Explicit lines are kept as typed while shrinking the font; only if that fails
    // (or the title is one long string) are lines wrapped to the hub's width.
    const doWrap = wrap || !Array.isArray(title);
    let lines = doWrap ? raw.flatMap((l) => wrapByWidth(l, 2 * R * 0.86, fontSize, measure)) : raw;
    if (lines.length > maxLines) lines = [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(" ")];
    const iconBlock = hasIcon ? iconSize + gap : 0;
    const subBlock = hasSubtitle ? subGap + subFont * 1.2 : 0;
    const height = iconBlock + lines.length * lineHeight + subBlock;
    const top = -height / 2;
    const textTop = top + iconBlock;
    const fitsLine = (line: string, i: number) =>
      measure(line, fontSize) <= widthAt(textTop + i * lineHeight, textTop + (i + 1) * lineHeight);
    const subY0 = textTop + lines.length * lineHeight + subGap;
    const ok =
      height <= 2 * R * 0.84 &&
      lines.every(fitsLine) &&
      (!subText || measure(subText, subFont) * 0.95 <= widthAt(subY0, subY0 + subFont * 1.2));
    return { ok, lines, fontSize, lineHeight, iconSize, top, textTop, subFont, subGap, widthAt, subY0 };
  };

  const preferred = 16.5 * k;
  const attempt = (wrap: boolean) => {
    let res = build(preferred, round(58 * k), wrap);
    for (let step = 1; !res.ok && step <= 14; step++) {
      res = build(round(preferred * (1 - step * 0.035)), round(58 * k * (1 - step * 0.03)), wrap);
    }
    return res;
  };
  let r = attempt(false);
  if (!r.ok) r = attempt(true);
  // Last resort: ellipsize whatever still does not fit.
  const lines = r.ok
    ? r.lines
    : r.lines.map((l, i) =>
        ellipsize(l, Math.max(20, r.widthAt(r.textTop + i * r.lineHeight, r.textTop + (i + 1) * r.lineHeight)), r.fontSize, measure),
      );
  const subtitleText = subText
    ? ellipsize(subText, Math.max(20, r.widthAt(r.subY0, r.subY0 + r.subFont * 1.2) / 0.95), r.subFont, measure)
    : "";
  return {
    icon: { x: round(-r.iconSize / 2), y: round(r.top), size: r.iconSize },
    label: { x: 0, y: round(r.textTop + r.lineHeight * 0.78), lines, fontSize: r.fontSize, lineHeight: r.lineHeight },
    subtitle: {
      y: round(r.textTop + lines.length * r.lineHeight + r.subGap + r.subFont * 0.95),
      fontSize: r.subFont,
      text: subtitleText,
    },
  };
}
