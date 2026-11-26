import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { colorRamp, generatePalette, icons, readableOn, type IconKey } from "@agile-infographics/core";
import { arrowEnds, assignSides, chooseMapMode, CLOCKWISE, routeConnector, type MapMode, type Point, type Side } from "./layout";
import { DEFAULT_ECOSYSTEM_LIMITS, normalizeEcosystem, resolveAppearance } from "./model";
import { ecosystemThemeToCssVars, paletteToEcosystemTheme } from "./theme";
import type {
  EcosystemAppearance,
  EcosystemConnection,
  EcosystemGroup,
  EcosystemLimits,
  EcosystemMapData,
  EcosystemMapInput,
  EcosystemSlots,
  EcosystemTheme,
  TextSlotProps,
} from "./types";
import "./ecosystem-map.css";

export interface EcosystemMapProps {
  /** The content. Client data is validated and completed with `normalizeEcosystem()`. */
  data: EcosystemMapInput | EcosystemMapData;
  /** Look and layout; anything left out uses `DEFAULT_ECOSYSTEM_APPEARANCE`. */
  appearance?: Partial<EcosystemAppearance>;
  /** Final colour overrides on top of the theme generated from `appearance`. */
  theme?: Partial<EcosystemTheme>;
  limits?: EcosystemLimits;
  /** Controlled selection (omit to let the component manage it). */
  selectedGroupId?: string | null;
  onSelectGroup?: (id: string | null) => void;
  /** Controlled expansion of collapsed groups (omit to let the component manage it). */
  expandedGroupIds?: readonly string[];
  onToggleExpanded?: (groupId: string, expanded: boolean) => void;
  /** Editor: show hidden groups (dimmed, without a connector) instead of leaving them out. */
  showHidden?: boolean;
  /** Render slots (editing). Without them the map is read-only. */
  slots?: EcosystemSlots;
  className?: string;
}

const DARK_INK = "#10202f";
const RADIUS = { square: "0.3rem", soft: "0.85rem", round: "1.4rem" } as const;
const GAP = { compact: "0.65rem", comfortable: "1rem", spacious: "1.5rem" } as const;
const ZONE = { compact: "clamp(3rem, 6vw, 5.5rem)", comfortable: "clamp(3.5rem, 7.5vw, 7rem)", spacious: "clamp(4rem, 9vw, 8.5rem)" } as const;
const CENTER_SIZE = { s: "10.5rem", m: "12.5rem", l: "15rem" } as const;

/** Read-only text: renders the element, or nothing when the value is empty. */
function DefaultText({ value, className, as: Tag }: TextSlotProps) {
  if (!value.trim()) return null;
  return <Tag className={className}>{value}</Tag>;
}

function Glyph({ icon }: { icon: IconKey }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {icons[icon]}
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

interface DrawnLink {
  groupId: string;
  d: string;
  label: Point;
  text: string;
  /** Top or bottom row (radial): the label sits on the bus. */
  row: boolean;
  style: EcosystemConnection["style"];
  color: string;
  arrows: { tip: Point; dir: Point }[];
}

interface Geometry {
  w: number;
  h: number;
  links: DrawnLink[];
}

const arrowPoints = ({ tip, dir }: { tip: Point; dir: Point }) => {
  const len = 9;
  const half = 4.5;
  const bx = tip.x - dir.x * len;
  const by = tip.y - dir.y * len;
  return `${tip.x},${tip.y} ${bx - dir.y * half},${by + dir.x * half} ${bx + dir.y * half},${by - dir.x * half}`;
};

/**
 * Ecosystem & Interfaces Map: a central entity connected to any number of
 * surrounding groups, each with its own items. Fully data-driven; the layout
 * adapts to the number of groups and to the available width, and connectors
 * are routed from the measured position of every card.
 */
export function EcosystemMap({
  data,
  appearance: appearanceInput,
  theme: themeInput,
  limits = DEFAULT_ECOSYSTEM_LIMITS,
  selectedGroupId,
  onSelectGroup,
  expandedGroupIds,
  onToggleExpanded,
  showHidden = false,
  slots = {},
  className = "",
}: EcosystemMapProps) {
  const uid = useId();
  const Text = slots.Text ?? DefaultText;
  const editable = Boolean(slots.Text);
  const { data: model, issues } = useMemo(() => normalizeEcosystem(data, limits), [data, limits]);
  const look = useMemo(() => resolveAppearance(appearanceInput), [appearanceInput]);
  const theme = useMemo(() => {
    const t = paletteToEcosystemTheme(generatePalette(look.base), { secondary: look.secondary, scheme: look.scheme, overrides: look.overrides });
    return { ...t, ...themeInput };
  }, [look, themeInput]);

  const [stageRef, width] = useWidth<HTMLDivElement>();
  const [ownSelected, setOwnSelected] = useState<string | null>(null);
  const selected = selectedGroupId !== undefined ? selectedGroupId : ownSelected;
  const select = useCallback(
    (id: string | null) => {
      if (selectedGroupId === undefined) setOwnSelected(id);
      onSelectGroup?.(id);
    },
    [selectedGroupId, onSelectGroup],
  );
  const [ownExpanded, setOwnExpanded] = useState<readonly string[]>([]);
  const expanded = expandedGroupIds ?? ownExpanded;
  const toggleExpanded = (id: string) => {
    const next = !expanded.includes(id);
    if (!expandedGroupIds) setOwnExpanded((cur) => (next ? [...cur, id] : cur.filter((x) => x !== id)));
    onToggleExpanded?.(id, next);
  };
  const [hover, setHover] = useState<string | null>(null);

  const groups = useMemo(() => (model ? model.groups.filter((g) => showHidden || !g.hidden) : []), [model, showHidden]);
  const mode: MapMode = chooseMapMode(width, groups.length, look.layout, look.typography.scale);
  const placement = useMemo(() => assignSides(groups), [groups]);

  const groupColors = useMemo(() => {
    const ramp = colorRamp(theme.groupFrom, look.groupColoring === "ramp" ? theme.groupTo : theme.groupFrom, groups.length);
    const map = new Map<string, { bg: string; fg: string }>();
    groups.forEach((g, i) => {
      const bg = g.color || ramp[i];
      map.set(g.id, { bg, fg: readableOn(bg, "#ffffff", DARK_INK, 3).fg });
    });
    return map;
  }, [groups, theme.groupFrom, theme.groupTo, look.groupColoring]);

  // ---- Connector measurement ----
  const centerRef = useRef<HTMLDivElement>(null);
  const cards = useRef(new Map<string, HTMLElement>());
  const [geo, setGeo] = useState<Geometry | null>(null);
  const geoKey = useRef("");

  const measure = useCallback(() => {
    const stage = stageRef.current;
    const centerEl = centerRef.current;
    if (!stage || !centerEl || !model) return;
    const s = stage.getBoundingClientRect();
    const rel = (r: DOMRect) => ({ left: r.left - s.left, right: r.right - s.left, top: r.top - s.top, bottom: r.bottom - s.top, width: r.width, height: r.height });
    const c = rel(centerEl.getBoundingClientRect());
    const C = { x: c.left + c.width / 2, y: c.top + c.height / 2, r: c.width / 2 };
    const hub = stage.querySelector<HTMLElement>(":scope > .em-hub");
    const hubR = hub ? rel(hub.getBoundingClientRect()) : c;
    const wrap = (sel: string) => {
      const el = stage.querySelector<HTMLElement>(sel);
      return el ? rel(el.getBoundingClientRect()) : null;
    };
    const grid = wrap(":scope > .em-grid");
    // The middle row spans the centre and the left/right columns, whichever is taller:
    // the top and bottom buses run in the gaps outside it.
    const middle = [hubR, c, wrap(":scope > .em-side-left"), wrap(":scope > .em-side-right")].filter((x): x is NonNullable<typeof x> => Boolean(x));
    const middleTop = Math.min(...middle.map((x) => x.top));
    const middleBottom = Math.max(...middle.map((x) => x.bottom));
    const links: DrawnLink[] = [];
    for (const g of groups) {
      if (g.hidden) continue;
      const conn = model.connections.find((x) => x.source === g.id || x.target === g.id);
      if (!conn || !conn.visible) continue;
      const card = cards.current.get(g.id);
      if (!card) continue;
      const r = rel(card.getBoundingClientRect());
      const head = card.querySelector<HTMLElement>(".em-card-head");
      const hr = head ? rel(head.getBoundingClientRect()) : r;
      const headY = hr.top + hr.height / 2;
      const side: Side = placement.sideOf[g.id] ?? "right";
      let anchor: Point;
      let busY: number | undefined;
      let spineX: number | undefined;
      if (mode === "radial") {
        if (side === "left") anchor = { x: r.right, y: headY };
        else if (side === "right") anchor = { x: r.left, y: headY };
        else if (side === "top") {
          anchor = { x: r.left + r.width / 2, y: r.bottom };
          const row = wrap(":scope > .em-side-top");
          busY = row ? (row.bottom + middleTop) / 2 : undefined;
        } else {
          anchor = { x: r.left + r.width / 2, y: r.top };
          const row = wrap(":scope > .em-side-bottom");
          busY = row ? (middleBottom + row.top) / 2 : undefined;
        }
      } else {
        const gr = grid ?? r;
        busY = (c.bottom + gr.top) / 2;
        if (mode === "columns") {
          spineX = gr.left + gr.width / 2;
          anchor = { x: r.left + r.width / 2 < spineX ? r.right : r.left, y: headY };
        } else {
          // The spine runs in the middle of the grid's left padding.
          spineX = gr.left + Math.max(6, (r.left - gr.left) / 2);
          anchor = { x: r.left, y: headY };
        }
      }
      const route = routeConnector({ mode, side, shape: look.connector, center: C, anchor, busY, spineX });
      const sourceIsCenter = conn.source === model.center.id;
      const ends = arrowEnds(conn.direction, sourceIsCenter);
      const arrows: DrawnLink["arrows"] = [];
      if (ends.atGroup) arrows.push({ tip: route.end, dir: route.endDir });
      if (ends.atCenter) arrows.push({ tip: route.start, dir: { x: -route.startDir.x, y: -route.startDir.y } });
      const custom = g.color || look.groupColoring === "ramp";
      links.push({
        groupId: g.id,
        d: route.d,
        label: route.label,
        text: conn.label,
        row: mode === "radial" && (side === "top" || side === "bottom"),
        style: conn.style,
        color: custom ? groupColors.get(g.id)?.bg ?? theme.connector : theme.connector,
        arrows,
      });
    }
    const next: Geometry = { w: Math.round(s.width), h: Math.round(s.height), links };
    const key = JSON.stringify(next);
    if (key !== geoKey.current) {
      geoKey.current = key;
      setGeo(next);
    }
  }, [stageRef, model, groups, placement, mode, look.connector, look.groupColoring, groupColors, theme.connector]);

  // Re-measure after every render (content and layout changes)…
  useLayoutEffect(() => {
    measure();
  });
  // …and whenever any box changes size without a render (fonts, wrapping, textarea growth).
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return;
    let frame = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    ro.observe(stage);
    if (centerRef.current) ro.observe(centerRef.current);
    cards.current.forEach((el) => ro.observe(el));
    document.fonts?.ready.then(() => requestAnimationFrame(measure)).catch(() => {});
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [stageRef, measure, groups]);

  // ---- Keyboard navigation between groups (display mode) ----
  const focusGroup = (index: number) => {
    const g = groups[(index + groups.length) % groups.length];
    stageRef.current?.querySelector<HTMLButtonElement>(`[data-group="${CSS.escape(g.id)}"] .em-card-select`)?.focus();
  };
  const onSelectKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const keys: Record<string, () => void> = {
      ArrowRight: () => focusGroup(index + 1),
      ArrowDown: () => focusGroup(index + 1),
      ArrowLeft: () => focusGroup(index - 1),
      ArrowUp: () => focusGroup(index - 1),
      Home: () => focusGroup(0),
      End: () => focusGroup(groups.length - 1),
      Escape: () => select(null),
    };
    const action = keys[e.key];
    if (action) {
      e.preventDefault();
      action();
    }
  };

  if (!model) {
    const first = issues.find((i) => i.level === "error");
    return (
      <section className={`em em-invalid ${className}`.trim()} role="alert">
        <p>
          This ecosystem map cannot be shown: {first ? `${first.path ? `${first.path}: ` : ""}${first.message}` : "invalid data"}.
        </p>
      </section>
    );
  }

  const style = {
    ...ecosystemThemeToCssVars(theme),
    "--em-scale": String(look.typography.scale),
    "--em-title-weight": String(look.typography.titleWeight),
    "--em-radius": RADIUS[look.radius],
    "--em-gap": GAP[look.density],
    "--em-link-zone": ZONE[look.density],
    "--em-center-size": CENTER_SIZE[look.centerSize],
  } as CSSProperties;

  const active = hover ?? selected;
  const center = model.center;
  const centerIcon = center.icon ? <Glyph icon={center.icon} /> : null;
  const centerIconEl = slots.centerIcon ? slots.centerIcon(centerIcon) : centerIcon;
  // Smaller centre text for long titles or long single words (never broken mid-word).
  const longestWord = Math.max(0, ...center.title.split(/\s+/).map((w) => w.length));
  const centerLen = Math.max(center.title.length, longestWord > 12 ? 41 : longestWord > 9 ? 23 : 0);

  const renderCard = (g: EcosystemGroup) => {
    const index = groups.indexOf(g);
    const color = groupColors.get(g.id)!;
    const conn = model.connections.find((x) => x.source === g.id || x.target === g.id);
    const limit = look.collapseAfter;
    const isOpen = expanded.includes(g.id);
    const collapsible = limit > 0 && g.items.length > limit;
    const items = collapsible && !isOpen ? g.items.slice(0, limit) : g.items;
    const showDetails = editable || look.itemDetails === "always" || selected === g.id;
    const listId = `${uid}-items-${index}`;
    const titleId = `${uid}-title-${index}`;
    const badge = g.icon ? (
      <span className="em-badge" style={{ background: color.bg, color: color.fg }}>
        <Glyph icon={g.icon} />
      </span>
    ) : null;
    const isSelected = selected === g.id;
    const relation = conn && conn.visible && !g.hidden
      ? `Connected to ${center.title || "the centre"}${conn.label ? `: ${conn.label}` : ""}${
          conn.direction === "none" ? "" : conn.direction === "both" ? " (both ways)" : (conn.direction === "forward") === (conn.source === center.id) ? " (from the centre)" : " (to the centre)"
        }.`
      : "Not connected.";

    return (
      <article
        key={g.id}
        ref={(el) => {
          if (el) cards.current.set(g.id, el);
          else cards.current.delete(g.id);
        }}
        className={[
          "em-card",
          isSelected && "is-selected",
          active === g.id && "is-active",
          !editable && selected && !isSelected && "is-dimmed",
          g.hidden && "is-hidden",
        ]
          .filter(Boolean)
          .join(" ")}
        data-group={g.id}
        data-side={mode === "radial" ? placement.sideOf[g.id] : undefined}
        style={{ "--g": color.bg, "--g-fg": color.fg } as CSSProperties}
        aria-labelledby={editable ? undefined : titleId}
        aria-label={editable ? `Group ${index + 1}: ${g.title || "Untitled"}` : undefined}
        onMouseEnter={() => setHover(g.id)}
        onMouseLeave={() => setHover(null)}
        onFocus={() => setHover(g.id)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHover(null);
        }}
      >
        {slots.groupToolbar?.(g, index)}
        <div className="em-card-head">
          {slots.groupBadge ? slots.groupBadge(g, index, badge) : badge}
          <div className="em-card-titles">
            {editable ? (
              <Text field={{ kind: "groupTitle", groupId: g.id }} value={g.title} className="em-card-title" as="h3" placeholder="Group title" />
            ) : (
              <h3 className="em-card-title" id={titleId}>
                <button
                  type="button"
                  className="em-card-select"
                  aria-pressed={isSelected}
                  onClick={() => select(isSelected ? null : g.id)}
                  onKeyDown={(e) => onSelectKey(e, index)}
                >
                  {g.title || "Untitled group"}
                </button>
              </h3>
            )}
            {g.hidden && <span className="em-hidden-flag">Hidden in display mode</span>}
          </div>
          <span className="em-visually-hidden">{relation}</span>
        </div>
        {mode !== "radial" && conn?.visible && conn.label && !g.hidden && (
          <p className="em-card-relation" aria-hidden="true">
            <span className="em-card-relation-line" data-style={conn.style} />
            {conn.label}
          </p>
        )}
        <Text
          field={{ kind: "groupDescription", groupId: g.id }}
          value={g.description}
          className={`em-card-desc${g.description.trim() ? "" : " is-empty"}`}
          as="p"
          placeholder="Add a description…"
          multiline
        />
        {(items.length > 0 || editable) && (
          <ul className="em-items" id={listId} aria-label={`${g.title || "Group"} items`}>
            {items.map((it, ii) => {
              const external = /^https?:/i.test(it.href);
              const label =
                !editable && it.href ? (
                  <a className="em-item-label em-item-link" href={it.href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                    {it.label || "Untitled item"}
                    {external && <span className="em-visually-hidden"> (opens in a new tab)</span>}
                  </a>
                ) : (
                  <Text field={{ kind: "itemLabel", groupId: g.id, itemId: it.id }} value={it.label} className="em-item-label" as="span" placeholder="Item" />
                );
              return (
                <li key={it.id} className="em-item" data-item={it.id}>
                  {it.icon ? (
                    <span className="em-item-icon">
                      <Glyph icon={it.icon} />
                    </span>
                  ) : (
                    <span className="em-item-dot" aria-hidden="true" />
                  )}
                  <div className="em-item-body">
                    <div className="em-item-line">
                      {label}
                      {it.tag && <span className="em-item-tag">{it.tag}</span>}
                    </div>
                    {showDetails && (
                      <Text
                        field={{ kind: "itemDescription", groupId: g.id, itemId: it.id }}
                        value={it.description}
                        className={`em-item-desc${it.description.trim() ? "" : " is-empty"}`}
                        as="span"
                        placeholder="Add a detail…"
                        multiline
                      />
                    )}
                  </div>
                  {slots.itemToolbar?.(g, it, ii)}
                </li>
              );
            })}
          </ul>
        )}
        {collapsible && (
          <button type="button" className="em-more" aria-expanded={isOpen} aria-controls={listId} onClick={() => toggleExpanded(g.id)}>
            {isOpen ? "Show fewer" : `Show all ${g.items.length} items`}
          </button>
        )}
        {slots.groupFooter?.(g, index)}
      </article>
    );
  };

  const sides = placement.sides;
  const areas = [sides.top.length && '"top top top"', '"left hub right"', sides.bottom.length && '"bottom bottom bottom"'].filter(Boolean).join(" ");
  const visibleCount = groups.filter((g) => !g.hidden).length;

  return (
    <section
      className={`em ${editable ? "is-editable" : ""} ${className}`.trim()}
      style={style}
      data-mode={mode}
      data-scheme={look.scheme}
      data-card-style={look.cardStyle}
      data-density={look.density}
      data-connector={look.connector}
      data-has-selection={selected && groups.some((g) => g.id === selected) ? "" : undefined}
      aria-label={model.title || center.title || "Ecosystem map"}
    >
      {(model.title || model.subtitle || editable) && (
        <header className="em-head">
          <Text field={{ kind: "title" }} value={model.title} className="em-title" as="h2" placeholder="Infographic title" />
          <span className="em-title-bar" aria-hidden="true" />
          <Text field={{ kind: "subtitle" }} value={model.subtitle} className="em-subtitle" as="p" placeholder="Add a subtitle (optional)" multiline />
        </header>
      )}
      <div className="em-panel">
        <div
          className="em-stage"
          ref={stageRef}
          data-mode={mode}
          style={mode === "radial" ? { gridTemplateAreas: areas } : undefined}
          role="group"
          aria-label={`${center.title || "Centre"} and ${visibleCount} connected group${visibleCount === 1 ? "" : "s"}`}
        >
          <svg className="em-links" width={geo?.w ?? 0} height={geo?.h ?? 0} viewBox={`0 0 ${geo?.w ?? 0} ${geo?.h ?? 0}`} aria-hidden="true">
            {geo?.links.map((l) => (
              <g key={l.groupId} className={`em-link${active === l.groupId ? " is-active" : ""}`} data-link={l.groupId} data-style={l.style} style={{ "--link": l.color } as CSSProperties}>
                <path className="em-link-path" d={l.d} />
                {l.arrows.map((a, i) => (
                  <polygon key={i} className="em-link-arrow" points={arrowPoints(a)} />
                ))}
              </g>
            ))}
          </svg>

          <div className="em-hub">
            <div className="em-center" ref={centerRef} data-style={center.style} data-len={centerLen > 40 ? "long" : centerLen > 22 ? "medium" : "short"}>
              <div className="em-center-disc">
                {centerIconEl && <span className="em-center-icon">{centerIconEl}</span>}
                <Text field={{ kind: "centerTitle" }} value={center.title} className="em-center-title" as="p" placeholder="Central entity" />
                <Text
                  field={{ kind: "centerSubtitle" }}
                  value={center.subtitle}
                  className={`em-center-subtitle${center.subtitle.trim() ? "" : " is-empty"}`}
                  as="p"
                  placeholder="Subtitle (optional)"
                />
              </div>
            </div>
          </div>

          {mode === "radial" ? (
            CLOCKWISE.filter((side) => sides[side].length).map((side) => (
              <div key={side} className={`em-side em-side-${side}`} data-count={sides[side].length}>
                {sides[side].map((id) => renderCard(groups.find((g) => g.id === id)!))}
              </div>
            ))
          ) : (
            <div className="em-grid">{groups.map(renderCard)}</div>
          )}

          {mode === "radial" &&
            geo?.links
              .filter((l) => l.text)
              .map((l) => (
                <span
                  key={l.groupId}
                  className={`em-link-label${active === l.groupId ? " is-active" : ""}`}
                  data-link-label={l.groupId}
                  data-row={l.row ? "" : undefined}
                  style={{ left: l.label.x, top: l.label.y, "--link": l.color } as CSSProperties}
                  title={l.text}
                  aria-hidden="true"
                >
                  <span>{l.text}</span>
                </span>
              ))}
        </div>
      </div>
    </section>
  );
}
