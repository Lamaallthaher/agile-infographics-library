import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  arcPath,
  estimateTextWidth,
  layoutCenter,
  layoutSegments,
  resolveGeometry,
  separatorPaths,
  type MeasureText,
} from "./geometry";
import { DEFAULT_THEME } from "./theme";
import type { WheelCenter, WheelGeometry, WheelSegment } from "./types";

let measureCtx: CanvasRenderingContext2D | null | undefined;

/** Bold-text measurer backed by a shared canvas; falls back to an estimate outside the browser. */
function textMeasurer(fontFamily: string, weight: number): MeasureText {
  if (typeof document === "undefined") return estimateTextWidth;
  if (measureCtx === undefined) measureCtx = document.createElement("canvas").getContext("2d");
  const ctx = measureCtx;
  if (!ctx) return estimateTextWidth;
  return (text, fontSize) => {
    ctx.font = `${weight} ${fontSize}px ${fontFamily}`;
    return ctx.measureText(text).width;
  };
}

export interface SegmentWheelProps {
  segments: WheelSegment[];
  center?: WheelCenter;
  geometry?: Partial<WheelGeometry>;
  /** Accessible name for the whole graphic. */
  ariaLabel: string;
  /** Segment under the pointer or keyboard focus (temporary highlight). */
  hoveredId?: string | null;
  /** Segment that is persistently selected (dark fill + rim marker). */
  selectedId?: string | null;
  /** Called on hover/focus enter (id) and leave (null). */
  onHoverChange?: (id: string | null) => void;
  /** Called on click, Enter or Space. Also called for disabled segments so the host can explain why. */
  onSelect?: (segment: WheelSegment) => void;
  /** Suffix read by screen readers for disabled segments. */
  unavailableLabel?: string;
  /** Called when the centre hub is clicked (e.g. to edit the title). Makes the hub clickable. */
  onCenterSelect?: () => void;
  /** Font used to measure labels so they wrap to the real text width. */
  fontFamily?: string;
  className?: string;
}

/** Renders either an inline 24×24 stroke icon or an image URL. */
export function IconSlot({
  icon,
  iconUrl,
  x,
  y,
  size,
  className,
}: {
  icon?: ReactNode;
  iconUrl?: string;
  x?: number;
  y?: number;
  size: number;
  className: string;
}) {
  if (iconUrl) {
    return (
      <image
        className={className}
        href={iconUrl}
        x={x}
        y={y}
        width={size}
        height={size}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      />
    );
  }
  if (!icon) return null;
  return (
    <svg
      className={className}
      x={x}
      y={y}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {icon}
    </svg>
  );
}

/** Keeps the marker rotation continuous so it always turns the short way round. */
function useContinuousAngle(target: number | null) {
  const last = useRef<number | null>(null);
  if (target === null) return null;
  if (last.current === null) {
    last.current = target;
  } else {
    const delta = ((((target - last.current) % 360) + 540) % 360) - 180;
    last.current = last.current + delta;
  }
  return last.current;
}

/**
 * Controlled SVG wheel. It owns no selection state; pair it with your own state
 * or use <SegmentWheelPanel>, which wires the wheel, list and details together.
 */
export function SegmentWheel({
  segments,
  center,
  geometry,
  ariaLabel,
  hoveredId = null,
  selectedId = null,
  onHoverChange,
  onSelect,
  unavailableLabel = "not available yet",
  onCenterSelect,
  fontFamily = DEFAULT_THEME.fontFamily,
  className = "",
}: SegmentWheelProps) {
  const g = resolveGeometry(geometry);
  const labelMeasure = textMeasurer(fontFamily, 700);
  const layouts = layoutSegments(
    segments.map((s) => ({ title: s.title, label: s.label, hasIcon: Boolean(s.icon || s.iconUrl) })),
    g,
    labelMeasure,
  );
  const hub = center
    ? layoutCenter(center.title, Boolean(center.icon || center.iconUrl), g, center.subtitle ?? false, labelMeasure)
    : null;
  const half = g.frameRadius + 10;
  const filterId = `sw-shadow-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const refs = useRef(new Map<string, SVGGElement>());
  const [focusId, setFocusId] = useState<string | null>(null);
  const has = (id: string | null) => id !== null && segments.some((s) => s.id === id);
  // Roving tabindex: exactly one segment is in the Tab order; arrows move between segments.
  const tabStop = has(focusId) ? focusId : has(selectedId) ? selectedId : (segments[0]?.id ?? null);

  // Rim marker: an arc on the outer frame centred on the selected segment.
  const span = segments.length ? 360 / segments.length : 0;
  const selectedIndex = segments.findIndex((s) => s.id === selectedId);
  const markerAngle = useContinuousAngle(selectedIndex >= 0 ? layouts[selectedIndex].midAngle : null);
  const markerPad = Math.min(4, span * 0.08);
  // The marker runs inside the dark ring between the segments and the white edge.
  const ringOuter = Math.min(g.discRadius, g.frameRadius);
  const markerRadius = ringOuter > g.radius + 4 ? (g.radius + ringOuter) / 2 : (g.frameRadius + g.discRadius) / 2;
  const markerWidth = ringOuter > g.radius + 4 ? Math.min(6, (ringOuter - g.radius) * 0.55) : 6;
  const separators = separatorPaths(segments.length, g);

  function focusAt(index: number) {
    const n = segments.length;
    const target = segments[((index % n) + n) % n];
    if (target) refs.current.get(target.id)?.focus();
  }

  function onKeyDown(event: KeyboardEvent<SVGGElement>, segment: WheelSegment, index: number) {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        focusAt(index + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        focusAt(index - 1);
        break;
      case "Home":
        event.preventDefault();
        focusAt(0);
        break;
      case "End":
        event.preventDefault();
        focusAt(segments.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        onSelect?.(segment);
        break;
    }
  }

  const showHover = has(hoveredId) && hoveredId !== selectedId;

  return (
    <svg
      viewBox={`${-half} ${-half} ${half * 2} ${half * 2}`}
      className={`sw-wheel ${showHover ? "has-hover" : ""} ${className}`.trim()}
      role="group"
      aria-label={ariaLabel}
    >
      <defs>
        <filter id={filterId} x="-10%" y="-10%" width="125%" height="125%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#000" floodOpacity="0.22" />
        </filter>
      </defs>

      <circle className="sw-frame" r={g.frameRadius} filter={`url(#${filterId})`} />
      <circle className="sw-disc" r={g.discRadius} />

      {segments.map((segment, index) => {
        const l = layouts[index];
        const isHovered = hoveredId === segment.id;
        const isSelected = selectedId === segment.id;
        const classes = [
          "sw-seg",
          isHovered && "is-hovered",
          isSelected && "is-selected",
          segment.disabled && "is-disabled",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <g
            key={segment.id}
            ref={(el) => {
              if (el) refs.current.set(segment.id, el);
              else refs.current.delete(segment.id);
            }}
            className={classes}
            role="button"
            tabIndex={tabStop === segment.id ? 0 : -1}
            aria-label={`${index + 1} of ${segments.length}: ${segment.title}${segment.disabled ? `, ${unavailableLabel}` : ""}`}
            aria-pressed={segment.disabled ? undefined : isSelected}
            aria-disabled={segment.disabled || undefined}
            data-segment={segment.id}
            onMouseEnter={() => onHoverChange?.(segment.id)}
            onMouseLeave={() => onHoverChange?.(null)}
            onFocus={() => {
              setFocusId(segment.id);
              onHoverChange?.(segment.id);
            }}
            onBlur={() => onHoverChange?.(null)}
            onClick={() => onSelect?.(segment)}
            onKeyDown={(event) => onKeyDown(event, segment, index)}
          >
            <title>{segment.title}</title>
            <path className="sw-slice" d={l.path} />
            <g className="sw-content">
              <IconSlot
                className="sw-icon"
                icon={segment.icon}
                iconUrl={segment.iconUrl}
                x={l.icon.x}
                y={l.icon.y}
                size={l.icon.size}
              />
              <text className="sw-label" textAnchor="middle" fontSize={l.label.fontSize}>
                {l.label.lines.map((line, i) => (
                  <tspan key={i} x={l.label.x} y={l.label.y + i * l.label.lineHeight}>
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
            <path className="sw-focus" d={l.path} />
          </g>
        );
      })}

      {separators.length > 0 && (
        <g className="sw-separators" aria-hidden="true" strokeWidth={g.separatorWidth}>
          {separators.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      )}

      {markerAngle !== null && (
        <g className="sw-marker" style={{ transform: `rotate(${markerAngle}deg)` }} aria-hidden="true">
          <path d={arcPath(markerRadius, -span / 2 + markerPad, span / 2 - markerPad)} strokeWidth={markerWidth} />
        </g>
      )}

      <circle className="sw-hub" r={g.hubRadius} />
      <circle className="sw-hub-ring" r={g.hubRadius - 7} />
      {center && hub && (
        <g className="sw-center" aria-hidden="true">
          <IconSlot
            className="sw-center-icon"
            icon={center.icon}
            iconUrl={center.iconUrl}
            x={hub.icon.x}
            y={hub.icon.y}
            size={hub.icon.size}
          />
          <text className="sw-center-title" textAnchor="middle" fontSize={hub.label.fontSize}>
            {hub.label.lines.map((line, i) => (
              <tspan key={i} x={0} y={hub.label.y + i * hub.label.lineHeight}>
                {line}
              </tspan>
            ))}
          </text>
          {hub.subtitle.text && (
            <text className="sw-center-subtitle" textAnchor="middle" x={0} y={hub.subtitle.y} fontSize={hub.subtitle.fontSize}>
              {hub.subtitle.text}
            </text>
          )}
        </g>
      )}
      {onCenterSelect && (
        <circle className="sw-hub-hit" r={g.hubRadius} onClick={onCenterSelect} aria-hidden="true">
          <title>Edit the wheel title</title>
        </circle>
      )}
    </svg>
  );
}
