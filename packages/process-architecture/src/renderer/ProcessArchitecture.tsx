import { useCallback, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { colorRamp, generatePalette, icons, type IconKey } from "@agile-infographics/core";
import {
  boldRuns,
  CATEGORY_LABELS,
  countNodes,
  DEFAULT_PROCESS_LIMITS,
  EMPTY_PATH,
  normalizeProcessArchitecture,
  numberingFor,
  resolveAppearance,
  resolvePath,
  PROCESS_VIEWS,
  STATUS_LABELS,
  structureBands,
  VIEW_LABELS,
} from "./model";
import { groupNodeColors, paletteToProcessTheme, processThemeToCssVars } from "./theme";
import type {
  Activity,
  GroupCategory,
  NodeData,
  Process,
  ProcessAppearance,
  ProcessArchitectureData,
  ProcessArchitectureInput,
  ProcessArchitectureLimits,
  ProcessGroup,
  ProcessLevel,
  ProcessPath,
  ProcessSlots,
  ProcessTheme,
  ProcessView,
  TextSlotProps,
  ValueChain,
} from "./types";
import "./process-architecture.css";

export interface ProcessArchitectureProps {
  /** The content. Client data is validated and completed with `normalizeProcessArchitecture()`. */
  data: ProcessArchitectureInput | ProcessArchitectureData;
  /** Look and layout; anything left out uses `DEFAULT_PROCESS_APPEARANCE`. */
  appearance?: Partial<ProcessAppearance>;
  /** Final colour overrides on top of the generated theme. */
  theme?: Partial<ProcessTheme>;
  limits?: ProcessArchitectureLimits;
  /** Controlled navigation (omit to let the component manage it). */
  path?: Partial<ProcessPath>;
  onNavigate?: (path: ProcessPath) => void;
  /** Controlled expansion of groups and processes (omit to let the component manage it). */
  expandedIds?: readonly string[];
  onToggleExpanded?: (id: string, expanded: boolean) => void;
  /** Controlled view ("structure", "groups" or "full"); omit to let the component manage it. */
  view?: ProcessView;
  onViewChange?: (view: ProcessView) => void;
  /** Render slots (editing). Without them the map is read-only. */
  slots?: ProcessSlots;
  className?: string;
}

const RADIUS = { square: "0.3rem", soft: "0.8rem", round: "1.3rem" } as const;
const GAP = { compact: "0.55rem", comfortable: "0.85rem", spacious: "1.25rem" } as const;
const CATEGORY_ROWS: readonly GroupCategory[] = ["management", "core", "support"];
const ROW_LABEL: Record<GroupCategory, string> = { management: "Management processes", core: "Core processes", support: "Support processes" };

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

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * Process Architecture Map: a four-level process hierarchy. L0 value chains
 * hold L1 process groups (management, core and support), which hold L2
 * processes, which hold L3 activities. Viewers drill down by selecting a group
 * and then a process; a breadcrumb and Esc lead back up.
 */
export function ProcessArchitecture({
  data,
  appearance: appearanceInput,
  theme: themeInput,
  limits = DEFAULT_PROCESS_LIMITS,
  path: pathInput,
  onNavigate,
  expandedIds,
  onToggleExpanded,
  view: viewInput,
  onViewChange,
  slots = {},
  className = "",
}: ProcessArchitectureProps) {
  const uid = useId();
  const Text = slots.Text ?? DefaultText;
  const editable = Boolean(slots.Text);
  const { data: model, issues } = useMemo(() => normalizeProcessArchitecture(data, limits), [data, limits]);
  const look = useMemo(() => resolveAppearance(appearanceInput), [appearanceInput]);
  const theme = useMemo(
    () => ({ ...paletteToProcessTheme(generatePalette(look.base), { secondary: look.secondary, scheme: look.scheme, overrides: look.overrides }), ...themeInput }),
    [look, themeInput],
  );

  // ---- Navigation (controlled or own) ----
  const [ownPath, setOwnPath] = useState<Partial<ProcessPath>>(EMPTY_PATH);
  const rawPath = pathInput ?? ownPath;
  const path = model ? resolvePath(model, rawPath) : EMPTY_PATH;
  const [announcement, setAnnouncement] = useState("");
  const navigate = useCallback(
    (next: Partial<ProcessPath>) => {
      const full = { ...EMPTY_PATH, ...next };
      if (pathInput === undefined) setOwnPath(full);
      onNavigate?.(full);
    },
    [pathInput, onNavigate],
  );

  // ---- Expansion (controlled or own; the default follows the appearance) ----
  const allGroupIds = useMemo(() => (model ? model.valueChains.flatMap((c) => c.groups.map((g) => g.id)) : []), [model]);
  const [ownExpanded, setOwnExpanded] = useState<readonly string[] | null>(null);
  const expanded = expandedIds ?? ownExpanded ?? (look.expandDefault === "expanded" ? allGroupIds : []);
  const toggle = (id: string) => {
    const open = !expanded.includes(id);
    if (!expandedIds) setOwnExpanded(open ? [...expanded, id] : expanded.filter((x) => x !== id));
    onToggleExpanded?.(id, open);
  };

  const rootRef = useRef<HTMLElement>(null);

  // ---- View (controlled or own; the first one follows the appearance) ----
  const [ownView, setOwnView] = useState<ProcessView | null>(null);
  const view: ProcessView = viewInput ?? ownView ?? look.defaultView;
  const setView = (next: ProcessView) => {
    if (viewInput === undefined) setOwnView(next);
    onViewChange?.(next);
  };

  if (!model) {
    const first = issues.find((i) => i.level === "error");
    return (
      <section className={`pa pa-invalid ${className}`.trim()} role="alert">
        <p>This process architecture cannot be shown: {first ? `${first.path ? `${first.path}: ` : ""}${first.message}` : "invalid data"}.</p>
      </section>
    );
  }

  const chain = model.valueChains.find((c) => c.id === path.valueChainId) ?? model.valueChains[0];
  const group = chain.groups.find((g) => g.id === path.groupId) ?? null;
  const process = group?.processes.find((p) => p.id === path.processId) ?? null;
  const numbers = numberingFor(chain);
  const codeOf = (n: NodeData) => n.code || (look.numbering ? numbers.get(n.id) ?? "" : "");
  const depth: ProcessLevel = process ? 2 : group ? 1 : 0;

  // Colours per group: core groups follow the ramp in their order; management and support use their tones.
  const coreGroups = chain.groups.filter((g) => g.category === "core");
  const ramp = colorRamp(theme.coreFrom, theme.coreTo, coreGroups.length);
  const colorOf = (g: ProcessGroup) => {
    if (g.color) return groupNodeColors(g.color, true);
    return groupNodeColors(g.category === "core" ? ramp[coreGroups.findIndex((x) => x.id === g.id)] : g.category === "management" ? theme.management : theme.support);
  };

  const go = (next: Partial<ProcessPath>, message: string) => {
    navigate({ valueChainId: chain.id, ...next });
    setAnnouncement(message);
  };
  const openGroup = (g: ProcessGroup) =>
    group?.id === g.id && !process && !editable
      ? go({}, `${chain.title}: overview`)
      : go({ groupId: g.id }, `Process group ${g.title}: ${plural(g.processes.length, "process", "processes")}`);
  const openProcess = (g: ProcessGroup, p: Process) =>
    process?.id === p.id && !editable ? go({ groupId: g.id }, `Process group ${g.title}`) : go({ groupId: g.id, processId: p.id }, `Process ${p.title}: ${plural(p.activities.length, "activity", "activities")}`);
  const openActivity = (a: Activity) =>
    go({ groupId: group?.id ?? null, processId: process?.id ?? null, activityId: path.activityId === a.id && !editable ? null : a.id }, `Activity ${a.title}`);
  const up = () => {
    if (path.activityId) go({ groupId: path.groupId, processId: path.processId }, `Process ${process?.title ?? ""}`);
    else if (process) go({ groupId: group!.id }, `Process group ${group!.title}`);
    else if (group) go({}, `${chain.title}: overview`);
  };

  // Keyboard: arrows move between siblings of one level, Home/End jump, Esc goes up one level.
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") return;
    if (e.key === "Escape" && depth + (path.activityId ? 1 : 0) > 0) {
      e.preventDefault();
      up();
      return;
    }
    const nav = target.dataset.nav;
    if (!nav || !["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const scope = target.closest<HTMLElement>("[data-nav-scope]") ?? rootRef.current;
    const items = [...(scope?.querySelectorAll<HTMLElement>(`[data-nav="${nav}"]`) ?? [])];
    const i = items.indexOf(target);
    if (i < 0) return;
    e.preventDefault();
    const n = items.length;
    const to = e.key === "Home" ? 0 : e.key === "End" ? n - 1 : (i + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1) + n) % n;
    items[to].focus();
  };

  // In the editor a node is selected by clicking anywhere on it (its text is editable, so it can't be a button).
  const pick = (fn: () => void) => (e: MouseEvent) => {
    if (!editable) return;
    if ((e.target as HTMLElement).closest("button, a, input, select")) return;
    e.stopPropagation();
    fn();
  };

  const style = {
    ...processThemeToCssVars(theme),
    "--pa-scale": String(look.typography.scale),
    "--pa-title-weight": String(look.typography.titleWeight),
    "--pa-radius": RADIUS[look.radius],
    "--pa-gap": GAP[look.density],
  } as CSSProperties;

  // ---- Small building blocks ----
  const meta = (n: NodeData, onDark = false) => {
    const has = n.owner || n.status || n.tags.length || (n.href && !editable);
    if (!has) return null;
    const external = /^https?:/i.test(n.href);
    return (
      <div className={`pa-meta${onDark ? " is-on-color" : ""}`}>
        {n.owner && (
          <span className="pa-owner" title="Owner">
            <Glyph icon="people" />
            <span className="pa-visually-hidden">Owner: </span>
            {n.owner}
          </span>
        )}
        {n.status && (
          <span className="pa-status" data-status={n.status}>
            {STATUS_LABELS[n.status]}
          </span>
        )}
        {n.tags.map((t) => (
          <span key={t} className="pa-tag">
            {t}
          </span>
        ))}
        {n.href && !editable && (
          <a className="pa-link" href={n.href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
            Open
            <span className="pa-visually-hidden"> {n.title}</span>
            {external && <span className="pa-visually-hidden"> (opens in a new tab)</span>}
            <span aria-hidden="true"> ↗</span>
          </a>
        )}
      </div>
    );
  };
  const code = (value: string) => (value ? <span className="pa-code">{value}</span> : null);
  const badge = (level: ProcessLevel) => (
    <span className="pa-level-badge" data-level={level} title={`Level ${level}`}>
      L{level}
    </span>
  );
  const empty = (children: ReactNode) => <p className="pa-empty">{children}</p>;

  // ---- L1 group node (overview) ----
  const renderGroup = (g: ProcessGroup) => {
    const c = colorOf(g);
    const isSelected = group?.id === g.id;
    const isOpen = expanded.includes(g.id);
    const listId = `${uid}-g-${g.id}`;
    const icon = g.icon ? <Glyph icon={g.icon} /> : null;
    const iconEl = slots.groupIcon ? slots.groupIcon(g, icon) : icon;
    return (
      <li
        key={g.id}
        className={["pa-group", isSelected && "is-selected", isOpen && "is-expanded", group && !isSelected && "is-dimmed"].filter(Boolean).join(" ")}
        data-node={g.id}
        data-level="1"
        data-category={g.category}
        style={{ "--node": c.bg, "--node-fg": c.fg } as CSSProperties}
        onClick={pick(() => openGroup(g))}
      >
        {slots.nodeToolbar?.(1, g.id, chain.groups.indexOf(g), chain.groups.length)}
        <div className="pa-group-head">
          {iconEl && <span className="pa-group-icon">{iconEl}</span>}
          <div className="pa-group-titles">
            {code(codeOf(g))}
            {editable ? (
              <Text field={{ kind: "nodeTitle", level: 1, id: g.id }} value={g.title} className="pa-group-title" as="h4" placeholder="Process group" />
            ) : (
              <h4 className="pa-group-title">
                <button type="button" className="pa-select" data-nav="1" aria-pressed={isSelected} onClick={() => openGroup(g)}>
                  {g.title || "Untitled group"}
                </button>
              </h4>
            )}
          </div>
        </div>
        <div className="pa-group-foot">
          <span className="pa-count">{plural(g.processes.length, "process", "processes")}</span>
          {g.processes.length > 0 && (
            <button type="button" className="pa-expand" aria-expanded={isOpen} aria-controls={listId} onClick={() => toggle(g.id)}>
              <span className="pa-visually-hidden">{isOpen ? "Hide" : "Show"} processes of {g.title}</span>
              <span aria-hidden="true">{isOpen ? "−" : "+"}</span>
            </button>
          )}
        </div>
        {isOpen && g.processes.length > 0 && (
          <ul className="pa-pills" id={listId} data-nav-scope="">
            {g.processes.map((p) => (
              <li key={p.id}>
                <button type="button" className={`pa-pill${process?.id === p.id ? " is-selected" : ""}`} data-nav="pill" aria-pressed={process?.id === p.id} onClick={() => openProcess(g, p)}>
                  {code(codeOf(p))}
                  <span>{p.title || "Untitled process"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  };

  // ---- L2 process card (group view) ----
  const renderProcess = (p: Process, index: number) => {
    const g = group!;
    const isSelected = process?.id === p.id;
    const isOpen = expanded.includes(p.id);
    const listId = `${uid}-p-${p.id}`;
    return (
      <li
        key={p.id}
        className={["pa-card", "pa-process", isSelected && "is-selected", process && !isSelected && "is-dimmed"].filter(Boolean).join(" ")}
        data-node={p.id}
        data-level="2"
        onClick={pick(() => openProcess(g, p))}
      >
        {slots.nodeToolbar?.(2, p.id, index, g.processes.length)}
        <div className="pa-card-head">
          {badge(2)}
          {code(codeOf(p))}
        </div>
        {editable ? (
          <Text field={{ kind: "nodeTitle", level: 2, id: p.id }} value={p.title} className="pa-card-title" as="h4" placeholder="Process" />
        ) : (
          <h4 className="pa-card-title">
            <button type="button" className="pa-select" data-nav="2" aria-pressed={isSelected} onClick={() => openProcess(g, p)}>
              {p.title || "Untitled process"}
            </button>
          </h4>
        )}
        <Text
          field={{ kind: "nodeDescription", level: 2, id: p.id }}
          value={p.description}
          className={`pa-card-desc${p.description.trim() ? "" : " is-empty"}`}
          as="p"
          placeholder="Add a description…"
          multiline
        />
        {meta(p)}
        <div className="pa-card-foot">
          <span className="pa-count">{plural(p.activities.length, "activity", "activities")}</span>
          {p.activities.length > 0 && (
            <button type="button" className="pa-expand pa-expand-text" aria-expanded={isOpen} aria-controls={listId} onClick={() => toggle(p.id)}>
              {isOpen ? "Hide activities" : "Show activities"}
              <span className="pa-visually-hidden"> of {p.title}</span>
            </button>
          )}
        </div>
        {isOpen && p.activities.length > 0 && (
          <ol className="pa-mini" id={listId}>
            {p.activities.map((a) => (
              <li key={a.id}>
                {code(codeOf(a))}
                {a.title || "Untitled activity"}
              </li>
            ))}
          </ol>
        )}
      </li>
    );
  };

  // ---- L3 activity step (process view) ----
  const renderActivity = (a: Activity, index: number) => {
    const p = process!;
    const isSelected = path.activityId === a.id;
    return (
      <li key={a.id} className={["pa-card", "pa-step", isSelected && "is-selected"].filter(Boolean).join(" ")} data-node={a.id} data-level="3" onClick={pick(() => openActivity(a))}>
        {slots.nodeToolbar?.(3, a.id, index, p.activities.length)}
        <div className="pa-step-head">
          <span className="pa-step-no" aria-hidden="true">
            {index + 1}
          </span>
          {badge(3)}
          {code(codeOf(a))}
        </div>
        {editable ? (
          <Text field={{ kind: "nodeTitle", level: 3, id: a.id }} value={a.title} className="pa-card-title" as="h4" placeholder="Activity" />
        ) : (
          <h4 className="pa-card-title">
            <button type="button" className="pa-select" data-nav="3" aria-pressed={isSelected} onClick={() => openActivity(a)}>
              <span className="pa-visually-hidden">Step {index + 1}: </span>
              {a.title || "Untitled activity"}
            </button>
          </h4>
        )}
        <Text
          field={{ kind: "nodeDescription", level: 3, id: a.id }}
          value={a.description}
          className={`pa-card-desc${a.description.trim() ? "" : " is-empty"}`}
          as="p"
          placeholder="Add a description…"
          multiline
        />
        {meta(a)}
      </li>
    );
  };

  // ---- Level headers ----
  const levelHead = (level: ProcessLevel, n: NodeData, label: string, detail: string) => (
    <header className="pa-level-head">
      <div className="pa-level-kicker">
        {badge(level)}
        <span>{label}</span>
        {code(codeOf(n))}
      </div>
      <Text field={{ kind: "nodeTitle", level, id: n.id }} value={n.title} className="pa-level-title" as="h3" placeholder={label} />
      <Text
        field={{ kind: "nodeDescription", level, id: n.id }}
        value={n.description}
        className={`pa-level-desc${n.description.trim() ? "" : " is-empty"}`}
        as="p"
        placeholder="Add a description…"
        multiline
      />
      {meta(n)}
      <p className="pa-level-detail">{detail}</p>
    </header>
  );

  const stats = countNodes(chain);
  const showOverview = look.navigation === "cascade" || depth === 0;
  const showGroup = group && (look.navigation === "cascade" || depth === 1);
  const showProcess = process && (look.navigation === "cascade" || depth === 2);

  const crumbs: { label: string; level: ProcessLevel; title: string; to: Partial<ProcessPath> }[] = [
    { label: "L0", level: 0, title: chain.title || "Value chain", to: {} },
    ...(group ? [{ label: "L1", level: 1 as ProcessLevel, title: group.title || "Process group", to: { groupId: group.id } }] : []),
    ...(process ? [{ label: "L2", level: 2 as ProcessLevel, title: process.title || "Process", to: { groupId: group!.id, processId: process.id } }] : []),
  ];

  const L0 = (c: ValueChain) => (
    <div className="pa-l0" data-node={c.id} data-level="0">
      {slots.nodeToolbar?.(0, c.id, model.valueChains.indexOf(c), model.valueChains.length)}
      <div className="pa-l0-main">
        <div className="pa-level-kicker">
          {badge(0)}
          <span>Value chain</span>
          {code(c.code)}
        </div>
        <Text field={{ kind: "nodeTitle", level: 0, id: c.id }} value={c.title} className="pa-l0-title" as="h3" placeholder="Value chain" />
        <Text
          field={{ kind: "nodeDescription", level: 0, id: c.id }}
          value={c.description}
          className={`pa-l0-desc${c.description.trim() ? "" : " is-empty"}`}
          as="p"
          placeholder="Add a description…"
          multiline
        />
        {meta(c, true)}
      </div>
      <dl className="pa-stats">
        <div>
          <dt>Process groups</dt>
          <dd>{stats.groups}</dd>
        </div>
        <div>
          <dt>Processes</dt>
          <dd>{stats.processes}</dd>
        </div>
        <div>
          <dt>Activities</dt>
          <dd>{stats.activities}</dd>
        </div>
      </dl>
    </div>
  );

  // ---- "Structure & levels": a pyramid of the four levels, grouped into scope bands ----
  const bands = structureBands(model);
  // Pyramid proportions by position from the top (fractions of the column width): a broad,
  // flat apex triangle, then trapezoids widening downwards; the last row is the widest.
  const order = bands.flatMap((b) => b.levels);
  const TOPS = [0, 0.47, 0.64, 0.85];
  const BOTTOMS = [0.47, 0.64, 0.86, 1];
  const clipFor = (level: ProcessLevel) => {
    const k = order.indexOf(level);
    const ht = TOPS[k] * 50;
    const hb = BOTTOMS[k] * 50;
    const f = (n: number) => Math.round(n * 100) / 100;
    return `polygon(${f(50 - ht)}% 0, ${f(50 + ht)}% 0, ${f(50 + hb)}% 100%, ${f(50 - hb)}% 100%)`;
  };
  const levelColors = [theme.level0, theme.level1, theme.level2, theme.level3].map((c) => groupNodeColors(c));
  const scopeChip = groupNodeColors(theme.scope);
  const openLevel = (level: ProcessLevel) => {
    const target: ProcessView = level <= 1 ? "groups" : "full";
    setView(target);
    setAnnouncement(VIEW_LABELS[target]);
  };
  const rich = (text: string) => boldRuns(text).map((r, i) => (r.bold ? <strong key={i}>{r.text}</strong> : <span key={i}>{r.text}</span>));

  const renderStructure = () => (
    <div className="pa-structure">
      {bands.map((band, bi) => (
        <div key={bi} className="pa-band" data-band={bi} data-scoped={band.scope ? "" : undefined}>
          <div className="pa-band-rows">
            {band.levels.map((l) => {
              const def = model.levels[l];
              const c = levelColors[l];
              const shapeStyle = { clipPath: clipFor(l), background: c.bg, color: c.fg } as CSSProperties;
              return (
                <div key={l} className="pa-srow" data-level={l}>
                  <div className="pa-shape-cell">
                    {editable ? (
                      <div className="pa-shape" style={shapeStyle}>
                        <Text field={{ kind: "levelName", levelIndex: l }} value={def.name} className="pa-shape-name" as="span" placeholder="Level name" />
                      </div>
                    ) : (
                      <button type="button" className="pa-shape" style={shapeStyle} data-nav="shape" onClick={() => openLevel(l)}>
                        <span className="pa-shape-name">{def.name || `Level ${l}`}</span>
                        <span className="pa-visually-hidden">: open {VIEW_LABELS[l <= 1 ? "groups" : "full"]}</span>
                      </button>
                    )}
                  </div>
                  <div className="pa-srow-text">
                    <div className="pa-pill-wrap">
                      <Text field={{ kind: "levelLabel", levelIndex: l }} value={def.label} className="pa-level-pill" as="span" placeholder={`Level ${l}`} />
                    </div>
                    <span className="pa-arrow" aria-hidden="true" />
                    {editable ? (
                      <Text field={{ kind: "levelDescription", levelIndex: l }} value={def.description} className="pa-level-text" as="p" placeholder="What this level covers…" multiline />
                    ) : (
                      def.description && <p className="pa-level-text">{rich(def.description)}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {band.scope && (
            <aside className="pa-callout" aria-label={band.scope.title || "Scope"}>
              <div className="pa-callout-chip" style={{ background: (bi === 0 ? scopeChip : levelColors[3]).bg, color: (bi === 0 ? scopeChip : levelColors[3]).fg }}>
                <Text field={{ kind: "scopeTitle", scopeIndex: band.scopeIndex }} value={band.scope.title} className="pa-callout-title" as="p" placeholder="Scope title" />
              </div>
              <Text
                field={{ kind: "scopeDescription", scopeIndex: band.scopeIndex }}
                value={band.scope.description}
                className={`pa-callout-text${band.scope.description.trim() ? "" : " is-empty"}`}
                as="p"
                placeholder="What this scope covers…"
                multiline
              />
            </aside>
          )}
        </div>
      ))}
    </div>
  );

  // ---- "Full architecture": every group with all its processes and activities ----
  const renderFull = () => (
    <div className="pa-full">
      {chain.groups.length === 0
        ? empty("No process groups in this value chain yet.")
        : CATEGORY_ROWS.map((cat) => {
            const list = chain.groups.filter((g) => g.category === cat);
            if (!list.length) return null;
            return (
              <section key={cat} className="pa-full-row" data-category={cat} aria-label={ROW_LABEL[cat]}>
                <h4 className="pa-full-row-label">{ROW_LABEL[cat]}</h4>
                <ol className="pa-full-groups" data-nav-scope="">
                  {list.map((g) => {
                    const gc = colorOf(g);
                    return (
                      <li key={g.id} className="pa-full-group" data-node={g.id} style={{ "--node": gc.bg, "--node-fg": gc.fg } as CSSProperties}>
                        <div className="pa-full-group-head">
                          {code(codeOf(g))}
                          <span>{g.title || "Untitled group"}</span>
                        </div>
                        {g.processes.length === 0 ? (
                          <p className="pa-full-empty">No processes yet</p>
                        ) : (
                          <ol className="pa-full-processes">
                            {g.processes.map((p) => (
                              <li key={p.id} className="pa-full-process" data-node={p.id}>
                                <button
                                  type="button"
                                  className="pa-full-process-title"
                                  data-nav="full"
                                  onClick={() => {
                                    setView("groups");
                                    go({ groupId: g.id, processId: p.id }, `Process ${p.title}`);
                                  }}
                                >
                                  {code(codeOf(p))}
                                  <span>{p.title || "Untitled process"}</span>
                                </button>
                                {p.activities.length > 0 && (
                                  <ol className="pa-full-activities" aria-label={`Activities of ${p.title}`}>
                                    {p.activities.map((a) => (
                                      <li key={a.id} data-node={a.id}>
                                        {code(codeOf(a))}
                                        <span>{a.title || "Untitled activity"}</span>
                                      </li>
                                    ))}
                                  </ol>
                                )}
                              </li>
                            ))}
                          </ol>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}
    </div>
  );

  return (
    <section
      ref={rootRef}
      className={`pa ${editable ? "is-editable" : ""} ${className}`.trim()}
      style={style}
      data-scheme={look.scheme}
      data-navigation={look.navigation}
      data-shape={look.groupShape}
      data-card-style={look.cardStyle}
      data-density={look.density}
      data-activity-layout={look.activityLayout}
      data-depth={depth}
      data-view={view}
      aria-label={model.title || chain.title || "Process architecture"}
      onKeyDown={onKeyDown}
    >
      <div className="pa-panel">
        <header className="pa-head">
          {(model.kicker || editable) && <Text field={{ kind: "kicker" }} value={model.kicker} className="pa-kicker" as="p" placeholder="Kicker (optional)" />}
          <div className="pa-views" role="tablist" aria-label="Views" data-nav-scope="">
            {PROCESS_VIEWS.map((v, i) => (
              <button
                key={v}
                type="button"
                role="tab"
                className="pa-view-tab"
                data-view={v}
                data-nav="view"
                aria-selected={v === view}
                tabIndex={v === view ? 0 : -1}
                onClick={() => {
                  setView(v);
                  setAnnouncement(VIEW_LABELS[v]);
                }}
              >
                <span className="pa-view-no" aria-hidden="true">
                  {i + 1}
                </span>
                {VIEW_LABELS[v]}
              </button>
            ))}
          </div>
          <div className="pa-title-row">
            <Text field={{ kind: "title" }} value={model.title} className="pa-title" as="h2" placeholder="Infographic title" />
            <span className="pa-title-view">{VIEW_LABELS[view]}</span>
          </div>
          <Text
            field={{ kind: "subtitle" }}
            value={model.subtitle}
            className={`pa-subtitle${model.subtitle.trim() ? "" : " is-empty"}`}
            as="p"
            placeholder="Add a description (optional)"
            multiline
          />
        </header>

        <div className="pa-view" role="tabpanel" aria-label={VIEW_LABELS[view]}>
          {view === "structure" ? (
            renderStructure()
          ) : (
            <>
            {(model.valueChains.length > 1 || editable) && (
              <div className="pa-chains">
                <div className="pa-chain-tabs" role="tablist" aria-label="Value chains" data-nav-scope="">
                  {model.valueChains.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      role="tab"
                      className="pa-chain-tab"
                      data-nav="0"
                      data-chain={c.id}
                      aria-selected={c.id === chain.id}
                      tabIndex={c.id === chain.id ? 0 : -1}
                      onClick={() => {
                        navigate({ valueChainId: c.id });
                        setAnnouncement(`Value chain ${c.title}`);
                      }}
                    >
                      <span className="pa-level-badge" data-level={0} aria-hidden="true">
                        L0
                      </span>
                      {c.title || "Untitled value chain"}
                    </button>
                  ))}
                </div>
                {slots.addButton?.(0, null)}
              </div>
            )}
              {view === "full" ? (
                renderFull()
              ) : (
                <>
                <nav className="pa-crumbs" aria-label="Hierarchy">
                  <ol>
                    {crumbs.map((c, i) => (
                      <li key={c.label}>
                        {i === crumbs.length - 1 ? (
                          <span className="pa-crumb is-current" aria-current="location">
                            <span className="pa-crumb-level">{c.label}</span> {c.title}
                          </span>
                        ) : (
                          <button type="button" className="pa-crumb" onClick={() => go(c.to, c.level === 0 ? `${chain.title}: overview` : `Process group ${c.title}`)}>
                            <span className="pa-crumb-level">{c.label}</span> {c.title}
                          </button>
                        )}
                      </li>
                    ))}
                  </ol>
                  {depth > 0 && (
                    <button type="button" className="pa-up" data-action="up" onClick={up}>
                      <span aria-hidden="true">↑</span> Up one level
                    </button>
                  )}
                </nav>

                <div className="pa-levels">
                  {showOverview && (
                    <section className="pa-level pa-level-0" aria-label={`L0 value chain: ${chain.title}`}>
                      {L0(chain)}
                      {chain.groups.length === 0 && !editable ? (
                        empty("No process groups in this value chain yet.")
                      ) : (
                        <div className="pa-house">
                          {CATEGORY_ROWS.map((cat) => {
                            const list = chain.groups.filter((g) => g.category === cat);
                            if (!list.length && !editable) return null;
                            return (
                              <div key={cat} className="pa-row" data-category={cat}>
                                <span className="pa-row-label">{ROW_LABEL[cat]}</span>
                                <ol className="pa-row-list" data-nav-scope="" aria-label={`${CATEGORY_LABELS[cat]} process groups`}>
                                  {list.map(renderGroup)}
                                  {slots.addButton && <li className="pa-row-add">{slots.addButton(1, chain.id, cat)}</li>}
                                </ol>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  )}

                  {showGroup && group && (
                    <section className="pa-level pa-level-1" aria-label={`L1 process group: ${group.title}`} style={{ "--node": colorOf(group).bg } as CSSProperties}>
                      {levelHead(1, group, `${CATEGORY_LABELS[group.category]} process group`, plural(group.processes.length, "process", "processes"))}
                      {group.processes.length === 0 && !editable ? (
                        empty("No processes in this group yet.")
                      ) : (
                        <ol className="pa-cards" data-nav-scope="" aria-label={`Processes of ${group.title}`}>
                          {group.processes.map(renderProcess)}
                          {slots.addButton && <li className="pa-cards-add">{slots.addButton(2, group.id)}</li>}
                        </ol>
                      )}
                    </section>
                  )}

                  {showProcess && process && (
                    <section className="pa-level pa-level-2" aria-label={`L2 process: ${process.title}`} style={{ "--node": colorOf(group!).bg } as CSSProperties}>
                      {levelHead(2, process, "Process", plural(process.activities.length, "activity", "activities"))}
                      {process.activities.length === 0 && !editable ? (
                        empty("No activities in this process yet.")
                      ) : (
                        <ol className="pa-steps" data-nav-scope="" aria-label={`Activities of ${process.title}`}>
                          {process.activities.map(renderActivity)}
                          {slots.addButton && <li className="pa-steps-add">{slots.addButton(3, process.id)}</li>}
                        </ol>
                      )}
                    </section>
                  )}
                </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
      <p className="pa-visually-hidden" role="status" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}
