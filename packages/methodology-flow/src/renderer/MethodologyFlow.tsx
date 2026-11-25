import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { colorRamp, readableOn } from "@agile-infographics/core";
import { computeFlowLayout, computeWheelLayout, type FlowMode } from "./layout";
import { methodologyThemeToCssVars } from "./theme";
import type {
  DimensionContent,
  FlowDimension,
  FlowModel,
  FlowPlacement,
  FlowSlots,
  FlowTypography,
  MethodologyTheme,
  TextSlotProps,
} from "./types";
import "./methodology-flow.css";

export interface MethodologyFlowProps {
  model: FlowModel;
  theme: MethodologyTheme;
  typography?: Partial<FlowTypography>;
  placement?: FlowPlacement;
  dimensionContent?: DimensionContent;
  /** Controlled selection of a dimension (omit to let the component manage it). */
  selectedDimensionId?: string | null;
  onSelectDimension?: (id: string | null) => void;
  /** Render slots (editing). Without them the infographic is read-only. */
  slots?: FlowSlots;
  className?: string;
}

const DEFAULT_TYPOGRAPHY: FlowTypography = { scale: 1, titleWeight: 700, align: "left" };
const DARK_INK = "#10202f";
const pad = (n: number) => String(n).padStart(2, "0");

/** Read-only text: renders the element, or nothing when the value is empty. */
function DefaultText({ value, className, as: Tag }: TextSlotProps) {
  if (!value.trim()) return null;
  return <Tag className={className}>{value}</Tag>;
}

function Glyph({ icon }: { icon?: ReactNode }) {
  if (!icon) return null;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {icon}
    </svg>
  );
}

/** Width of an element, kept up to date with a ResizeObserver. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(1200);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.getBoundingClientRect().width);
    measure();
    // Window resize as a fallback for environments where ResizeObserver is late or missing.
    window.addEventListener("resize", measure);
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    ro?.observe(el);
    return () => {
      window.removeEventListener("resize", measure);
      ro?.disconnect();
    };
  }, []);
  return [ref, width] as const;
}

/**
 * Methodology Flow & Assessment Wheel: a connected sequence of steps leading to
 * a circular set of assessment dimensions. Fully data-driven: any number of
 * steps and dimensions, any content, any theme.
 */
export function MethodologyFlow({
  model,
  theme,
  typography,
  placement = "alternate",
  dimensionContent = "number",
  selectedDimensionId,
  onSelectDimension,
  slots = {},
  className = "",
}: MethodologyFlowProps) {
  const type = { ...DEFAULT_TYPOGRAPHY, ...typography };
  const Text = slots.Text ?? DefaultText;
  const editable = Boolean(slots.Text);
  const [panelRef, width] = useWidth<HTMLDivElement>();
  const { steps, wheel } = model;
  const layout = computeFlowLayout(width, steps.length, { placement, align: type.align, scale: type.scale });
  const mode: FlowMode = layout.mode;

  const [ownSelected, setOwnSelected] = useState<string | null>(null);
  const selected = selectedDimensionId !== undefined ? selectedDimensionId : ownSelected;
  const select = (id: string | null) => {
    if (selectedDimensionId === undefined) setOwnSelected(id);
    onSelectDimension?.(id);
  };
  const [hoverDim, setHoverDim] = useState<string | null>(null);

  const stepColors = colorRamp(theme.stepFrom, theme.stepTo, steps.length).map((bg) => ({ bg, fg: readableOn(bg, "#ffffff", DARK_INK, 3).fg }));
  const dimRamp = colorRamp(theme.dimFrom, theme.dimTo, wheel.dimensions.length);
  const dimColors = wheel.dimensions.map((d, i) => {
    const bg = d.color || dimRamp[i];
    return { bg, fg: readableOn(bg, "#ffffff", DARK_INK, 4.5).fg };
  });

  const style = {
    ...methodologyThemeToCssVars(theme),
    "--mf-scale": String(type.scale),
    "--mf-title-weight": String(type.titleWeight),
    "--mf-align": type.align,
  } as CSSProperties;

  const dimBadge = (d: FlowDimension, i: number) =>
    dimensionContent === "icon" && d.icon ? <Glyph icon={d.icon} /> : <span>{pad(i + 1)}</span>;

  return (
    <section
      className={`mf ${editable ? "is-editable" : ""} ${className}`.trim()}
      style={style}
      data-mode={mode}
      data-align={type.align}
      aria-label={model.title || "Methodology flow"}
    >
      <header className="mf-head">
        <Text field={{ kind: "title" }} value={model.title} className="mf-title" as="h2" placeholder="Infographic title" />
        <span className="mf-title-bar" aria-hidden="true" />
        <Text
          field={{ kind: "subtitle" }}
          value={model.subtitle}
          className="mf-subtitle"
          as="p"
          placeholder="Add a subtitle (optional)"
          multiline
        />
      </header>

      <div className="mf-panel" ref={panelRef}>
        <div className="mf-body" data-mode={mode}>
          <ol className="mf-flow" style={{ gridTemplateColumns: layout.columns }} aria-label="Methodology steps">
            <li
              className="mf-line"
              aria-hidden="true"
              style={
                mode === "vertical"
                  ? { gridColumn: 1, gridRow: `1 / ${steps.length + 1}` }
                  : { gridColumn: "1 / -1", gridRow: 2 }
              }
            />
            {steps.map((step, i) => {
              const p = layout.steps[i];
              const c = stepColors[i];
              const empty = (v: string) => (v.trim() ? "" : " is-empty");
              return (
                <li key={step.id} className="mf-step" data-step={step.id}>
                  <div
                    className="mf-step-node"
                    style={{ gridColumn: p.node.column, gridRow: p.node.row, "--node-bg": c.bg, "--node-fg": c.fg } as CSSProperties}
                  >
                    <span className="mf-node-halo">
                      <span className="mf-node-core">
                        {slots.stepIcon ? slots.stepIcon(step, i, <Glyph icon={step.icon} />) : <Glyph icon={step.icon} />}
                      </span>
                    </span>
                  </div>
                  <div
                    className="mf-step-text"
                    data-side={p.text.side}
                    style={{ gridColumn: `${p.text.column} / span ${p.text.span}`, gridRow: p.text.row }}
                  >
                    {slots.stepToolbar?.(step, i)}
                    <p className="mf-kicker">
                      <span className="mf-step-no">{pad(i + 1)}</span>
                      {(step.kicker.trim() || editable) && <span className="mf-kicker-dot">·</span>}
                      <Text
                        field={{ kind: "kicker", stepId: step.id }}
                        value={step.kicker}
                        className={`mf-kicker-text${empty(step.kicker)}`}
                        as="span"
                        placeholder="Label"
                      />
                    </p>
                    <Text
                      field={{ kind: "stepTitle", stepId: step.id }}
                      value={step.title}
                      className="mf-step-title"
                      as="h3"
                      placeholder="Step title"
                    />
                    <Text
                      field={{ kind: "description", stepId: step.id }}
                      value={step.description}
                      className={`mf-step-desc${empty(step.description)}`}
                      as="p"
                      placeholder="Add a description…"
                      multiline
                    />
                    {(editable || step.bullets.some((b) => b.trim())) && (
                      <ul className="mf-bullets">
                        {step.bullets.map((b, bi) =>
                          editable || b.trim() ? (
                            <li key={bi}>
                              <Text
                                field={{ kind: "bullet", stepId: step.id, index: bi }}
                                value={b}
                                className="mf-bullet-text"
                                as="span"
                                placeholder="Point"
                              />
                            </li>
                          ) : null,
                        )}
                      </ul>
                    )}
                    <Text
                      field={{ kind: "takeaway", stepId: step.id }}
                      value={step.takeaway}
                      className={`mf-takeaway${empty(step.takeaway)}`}
                      as="p"
                      placeholder="Add a takeaway…"
                      multiline
                    />
                    {slots.stepFooter?.(step, i)}
                  </div>
                </li>
              );
            })}
          </ol>

          <section className="mf-wheel-col" aria-label="Assessment wheel">
            {mode !== "row" && <span className="mf-down-arrow" aria-hidden="true" />}
            <div className="mf-wheel" role="group" aria-label={`${wheel.centerLabel || "Dimensions"}: ${wheel.dimensions.length}`}>
              <WheelGraphic
                count={wheel.dimensions.length}
                dims={wheel.dimensions}
                colors={dimColors}
                selected={selected}
                hover={hoverDim}
                onSelect={(id) => select(id === selected ? null : id)}
                onHover={setHoverDim}
                badge={dimBadge}
              />
              <div className="mf-wheel-center">
                <Text
                  field={{ kind: "centerValue" }}
                  value={editable ? wheel.centerValue : wheel.centerValue.trim() || String(wheel.dimensions.length)}
                  className="mf-wheel-value"
                  as="span"
                  placeholder={String(wheel.dimensions.length)}
                />
                <Text field={{ kind: "centerLabel" }} value={wheel.centerLabel} className="mf-wheel-label" as="span" placeholder="Centre label" />
              </div>
            </div>
            <div className="mf-result">
              <Text field={{ kind: "resultTitle" }} value={wheel.resultTitle} className="mf-result-title" as="h3" placeholder="Result title" />
              <Text
                field={{ kind: "resultDescription" }}
                value={wheel.resultDescription}
                className={`mf-result-desc${wheel.resultDescription.trim() ? "" : " is-empty"}`}
                as="p"
                placeholder="Add a short description…"
                multiline
              />
            </div>
          </section>
        </div>
        <div className="mf-legend-wrap">
          <ol className="mf-legend" aria-label="Dimensions">
            {wheel.dimensions.map((d, i) => {
              const c = dimColors[i];
              const badge = (
                <span className="mf-legend-badge" style={{ background: c.bg, color: c.fg }}>
                  {dimBadge(d, i)}
                </span>
              );
              return (
                <li
                  key={d.id}
                  data-dim={d.id}
                  className={["mf-legend-row", d.id === selected && "is-selected", d.id === hoverDim && "is-hovered"].filter(Boolean).join(" ")}
                  onMouseEnter={() => setHoverDim(d.id)}
                  onMouseLeave={() => setHoverDim(null)}
                >
                  <button
                    type="button"
                    className="mf-legend-select"
                    aria-pressed={d.id === selected}
                    aria-label={`Select dimension ${i + 1}: ${d.label || "Untitled"}`}
                    onClick={() => select(d.id === selected ? null : d.id)}
                  />
                  {slots.dimensionBadge ? slots.dimensionBadge(d, i, badge) : badge}
                  <div className="mf-legend-text">
                    <Text field={{ kind: "dimLabel", dimId: d.id }} value={d.label} className="mf-legend-label" as="span" placeholder="Dimension" />
                    <Text
                      field={{ kind: "dimDescription", dimId: d.id }}
                      value={d.description}
                      className={`mf-legend-desc${d.description.trim() ? "" : " is-empty"}`}
                      as="span"
                      placeholder="Add a description…"
                      multiline
                    />
                  </div>
                  {slots.dimensionToolbar?.(d, i)}
                </li>
              );
            })}
          </ol>
          {slots.legendFooter?.()}
        </div>
      </div>
    </section>
  );
}

function WheelGraphic({
  count,
  dims,
  colors,
  selected,
  hover,
  onSelect,
  onHover,
  badge,
}: {
  count: number;
  dims: FlowDimension[];
  colors: { bg: string; fg: string }[];
  selected: string | null;
  hover: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  badge: (d: FlowDimension, i: number) => ReactNode;
}) {
  const g = computeWheelLayout(count);
  return (
    <>
      <svg className="mf-wheel-svg" viewBox="0 0 100 100" aria-hidden="true">
        <circle className="mf-wheel-disc" cx="50" cy="50" r={g.discRadius} />
        {g.nodes.map((n, i) => (
          <line key={i} className="mf-wheel-spoke" x1="50" y1="50" x2={n.x} y2={n.y} />
        ))}
        <circle className="mf-wheel-center-fill" cx="50" cy="50" r={g.centerRadius} />
      </svg>
      {dims.map((d, i) => {
        const n = g.nodes[i];
        return (
          <button
            key={d.id}
            type="button"
            className={["mf-dim-node", d.id === selected && "is-selected", d.id === hover && "is-hovered"].filter(Boolean).join(" ")}
            style={{ left: `${n.x}%`, top: `${n.y}%`, width: `${n.size}%`, background: colors[i].bg, color: colors[i].fg, "--s": n.size } as CSSProperties}
            aria-pressed={d.id === selected}
            aria-label={`Dimension ${i + 1}: ${d.label || "Untitled"}`}
            title={d.label}
            data-dim={d.id}
            onClick={() => onSelect(d.id)}
            onMouseEnter={() => onHover(d.id)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(d.id)}
            onBlur={() => onHover(null)}
          >
            {badge(d, i)}
          </button>
        );
      })}
    </>
  );
}
