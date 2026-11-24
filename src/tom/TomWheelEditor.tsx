import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  SegmentWheel,
  resolveTheme,
  themeToCssVars,
  type WheelGeometry,
  type WheelSegment,
  type WheelTheme,
} from "../library/segment-wheel";
import { EditableText } from "./EditableText";
import { IconPicker } from "./IconPicker";
import { ThemeColorControl, type ThemeColorControlProps } from "./ThemeColorControl";
import { icons } from "./icons";
import { DEFAULT_LIMITS, type TomComponent, type TomLimits, type TomWheelData } from "./types";
import { useTomWheel } from "./useTomWheel";
import "./tom-editor.css";

export interface TomWheelEditorProps {
  /** Initial configuration (used until the user edits it, and by "Reset to default"). */
  defaultData: TomWheelData;
  /** Local Storage key — use a different key per project to keep their edits apart. */
  storageKey: string;
  limits?: TomLimits;
  theme?: Partial<WheelTheme>;
  geometry?: Partial<WheelGeometry>;
  /** Shows the theme colour control when provided. Theme state is owned by the host. */
  themeColor?: ThemeColorControlProps;
  /** Called by "Reset to default" in addition to resetting the content (e.g. to reset the theme). */
  onReset?: () => void;
}

type FocusRequest =
  | { kind: "name" }
  | { kind: "point"; index: number }
  | { kind: "fact"; index: number }
  | { kind: "row"; id: string; action?: "up" | "down" | "delete" };

const pad = (n: number) => String(n).padStart(2, "0");
const displayName = (c: TomComponent) => c.name.trim() || "Untitled component";

function Svg({ d, className }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <path d={d} />
    </svg>
  );
}

const PATH = {
  check: "M3.5 8.5 6.5 11.5 12.5 4.5",
  up: "M8 12.5v-9M4 7.5l4-4 4 4",
  down: "M8 3.5v9M4 8.5l4 4 4-4",
  trash: "M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5",
  close: "M4.5 4.5l7 7M11.5 4.5l-7 7",
  plus: "M8 3.5v9M3.5 8h9",
};

/**
 * The TOM wheel with everything editable in place: one interface, no view/edit
 * modes. Select a component on the wheel or in the list, then click any text in
 * the details card to change it. Components can be added, removed and reordered
 * from the list; the wheel re-lays itself out after every change.
 */
export function TomWheelEditor({
  defaultData,
  storageKey,
  limits = DEFAULT_LIMITS,
  theme,
  geometry,
  themeColor,
  onReset,
}: TomWheelEditorProps) {
  const { data, saved, actions } = useTomWheel(defaultData, storageKey, limits);
  const resolvedTheme = resolveTheme(theme);
  const comps = data.components;

  const [selectedId, setSelectedId] = useState<string>(() => comps[0]?.id ?? "");
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const [undo, setUndo] = useState<{ component: TomComponent; index: number } | null>(null);
  const [resetArmed, setResetArmed] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  const foundIndex = comps.findIndex((c) => c.id === selectedId);
  const selIndex = foundIndex >= 0 ? foundIndex : 0;
  const selected = comps[selIndex];
  const hovered = hoverId && hoverId !== selected?.id ? comps.find((c) => c.id === hoverId) : undefined;
  const atMin = comps.length <= limits.minComponents;
  const atMax = comps.length >= limits.maxComponents;

  // Keep the selection valid (e.g. after a reset or when stored data changed).
  useEffect(() => {
    if (foundIndex < 0 && comps[0]) setSelectedId(comps[0].id);
  }, [foundIndex, comps]);

  // Move focus to an element that only exists after the next render.
  useEffect(() => {
    if (!focusRequest) return;
    const root = rootRef.current;
    let el: HTMLElement | null = null;
    if (focusRequest.kind === "name") el = nameRef.current;
    else if (focusRequest.kind === "point") el = root?.querySelectorAll<HTMLElement>(".te-point-text")[focusRequest.index] ?? null;
    else if (focusRequest.kind === "fact") el = root?.querySelectorAll<HTMLElement>(".te-fact-label")[focusRequest.index] ?? null;
    else {
      const row = root?.querySelector<HTMLElement>(`[data-row="${focusRequest.id}"]`);
      const action = focusRequest.action ? row?.querySelector<HTMLButtonElement>(`[data-action="${focusRequest.action}"]`) : null;
      el = action && !action.disabled ? action : (row?.querySelector<HTMLElement>(".sw-list-row") ?? null);
    }
    el?.focus();
    if (focusRequest.kind === "name" && el instanceof HTMLTextAreaElement) el.select();
    setFocusRequest(null);
  }, [focusRequest, data]);

  // Undo offer disappears after a while.
  useEffect(() => {
    if (!undo) return;
    const t = window.setTimeout(() => setUndo(null), 8000);
    return () => window.clearTimeout(t);
  }, [undo]);

  useEffect(() => {
    if (!resetArmed) return;
    const t = window.setTimeout(() => setResetArmed(false), 4000);
    return () => window.clearTimeout(t);
  }, [resetArmed]);

  function select(id: string) {
    const c = comps.find((x) => x.id === id);
    if (!c) return;
    setSelectedId(id);
    setAnnouncement(`${displayName(c)} selected`);
  }

  function step(direction: 1 | -1) {
    const n = comps.length;
    select(comps[(((selIndex + direction) % n) + n) % n].id);
  }

  function add() {
    const id = actions.addComponent(selected?.id ?? null);
    if (!id) return;
    setSelectedId(id);
    setHoverId(null);
    setAnnouncement(`New component added. ${comps.length + 1} components.`);
    setFocusRequest({ kind: "name" });
  }

  function remove(c: TomComponent) {
    const index = comps.findIndex((x) => x.id === c.id);
    const removed = actions.removeComponent(c.id);
    if (!removed) return;
    const neighbour = comps[index + 1] ?? comps[index - 1];
    if (c.id === selected?.id && neighbour) setSelectedId(neighbour.id);
    setHoverId(null);
    setUndo(removed);
    setAnnouncement(`${displayName(c)} removed. ${comps.length - 1} components.`);
    if (neighbour) setFocusRequest({ kind: "row", id: neighbour.id });
  }

  function undoRemove() {
    if (!undo) return;
    actions.restoreComponent(undo.component, undo.index);
    setSelectedId(undo.component.id);
    setAnnouncement(`${displayName(undo.component)} restored.`);
    setFocusRequest({ kind: "row", id: undo.component.id });
    setUndo(null);
  }

  function move(c: TomComponent, delta: number, action?: "up" | "down") {
    const from = comps.findIndex((x) => x.id === c.id);
    const to = Math.max(0, Math.min(comps.length - 1, from + delta));
    if (from === to) return;
    actions.moveComponent(c.id, delta);
    setSelectedId(c.id);
    setAnnouncement(`${displayName(c)} moved to position ${to + 1} of ${comps.length}.`);
    setFocusRequest({ kind: "row", id: c.id, action });
  }

  function onRowKeyDown(event: KeyboardEvent<HTMLButtonElement>, c: TomComponent) {
    if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      move(c, event.key === "ArrowUp" ? -1 : 1);
    } else if (event.key === "Delete" && !atMin) {
      event.preventDefault();
      remove(c);
    }
  }

  function reset() {
    if (!resetArmed) {
      setResetArmed(true);
      return;
    }
    actions.reset();
    onReset?.();
    setResetArmed(false);
    setUndo(null);
    setSelectedId(defaultData.components[0]?.id ?? "");
    setAnnouncement("Wheel reset to the default configuration.");
  }

  // ---- Wheel input (rendering data derived from the editable data) ----
  const segments: WheelSegment[] = comps.map((c) => ({ id: c.id, title: displayName(c), icon: icons[c.icon] }));
  const titleLines = data.title.split("\n").map((l) => l.trim()).filter(Boolean);
  const center = {
    title: titleLines.length > 1 ? titleLines : (titleLines[0] ?? ""),
    subtitle: data.subtitle.trim() || undefined,
    icon: icons[data.centerIcon],
  };

  const update = (patch: Partial<Omit<TomComponent, "id">>) => selected && actions.updateComponent(selected.id, patch);

  return (
    <div ref={rootRef} className="sw-panel te-editor" style={themeToCssVars(resolvedTheme)} data-wheel="tom">
      <div className="sw-layout">
        {/* ---------------- Wheel ---------------- */}
        <div className="sw-stage">
          <SegmentWheel
            segments={segments}
            center={center}
            geometry={geometry}
            ariaLabel={`${titleLines.join(" ") || "Wheel"}: ${comps.length} components`}
            hoveredId={hoverId}
            selectedId={selected?.id ?? null}
            onHoverChange={setHoverId}
            onSelect={(s) => select(s.id)}
            onCenterSelect={() => titleRef.current?.focus()}
            fontFamily={resolvedTheme.fontFamily}
          />
          <p className={`sw-status ${hovered ? "is-hover" : ""}`} aria-hidden="true">
            {hovered ? (
              <>
                <span className="sw-status-name">{displayName(hovered)}</span>
                <span className="sw-status-state">Click to select</span>
              </>
            ) : selected ? (
              <>
                <span className="sw-status-dot" />
                <span className="sw-status-name">{displayName(selected)}</span>
                <span className="sw-status-state">Selected</span>
              </>
            ) : null}
          </p>
          <p className="sw-visually-hidden" role="status" aria-live="polite">
            {announcement}
          </p>

          <section className="te-centre" aria-label="Wheel centre">
            <p className="te-section-label">Wheel centre</p>
            <EditableText
              inputRef={titleRef}
              className="te-centre-title"
              multiline
              required
              label="Wheel title"
              placeholder="Wheel title"
              maxLength={limits.maxTitleLength}
              value={data.title}
              onChange={actions.setTitle}
            />
            <EditableText
              className="te-centre-subtitle"
              label="Wheel subtitle"
              placeholder="Add a subtitle (optional)"
              maxLength={limits.maxTitleLength}
              value={data.subtitle}
              onChange={actions.setSubtitle}
            />
            {themeColor && <ThemeColorControl {...themeColor} />}
            <div className="te-centre-foot">
              <span className={`te-saved ${saved ? "" : "is-error"}`}>
                <Svg d={saved ? PATH.check : PATH.close} />
                {saved ? "Changes saved in this browser" : "Changes cannot be saved in this browser"}
              </span>
              <button type="button" className={`te-link ${resetArmed ? "is-armed" : ""}`} onClick={reset}>
                {resetArmed ? "Click again to reset" : "Reset to default"}
              </button>
            </div>
          </section>
        </div>

        {/* ---------------- Details + list ---------------- */}
        <div className="sw-side">
          {selected && (
            <section className="sw-details te-details" aria-label="Component details">
              <header className="sw-details-head">
                <IconPicker value={selected.icon} componentName={displayName(selected)} onChange={(icon) => update({ icon })} />
                <div className="sw-details-heading">
                  <span className="sw-details-no">
                    {pad(selIndex + 1)} / {pad(comps.length)}
                  </span>
                  <EditableText
                    inputRef={nameRef}
                    className="sw-details-title te-name"
                    required
                    label="Component name"
                    placeholder="Component name"
                    maxLength={limits.maxNameLength}
                    value={selected.name}
                    onChange={(name) => update({ name })}
                  />
                </div>
              </header>

              <EditableText
                className="sw-details-summary te-description"
                multiline
                label="Description"
                placeholder="Add a short description…"
                value={selected.description}
                onChange={(description) => update({ description })}
              />

              <div className="sw-meta te-facts">
                {selected.facts.map((fact, i) => (
                  <div key={i} className="te-fact">
                    <EditableText
                      className="te-fact-label"
                      label={`Fact ${i + 1} label`}
                      placeholder="Label"
                      value={fact.label}
                      onChange={(label) => update({ facts: selected.facts.map((f, j) => (j === i ? { ...f, label } : f)) })}
                    />
                    <EditableText
                      className="te-fact-value"
                      label={`Fact ${i + 1} value`}
                      placeholder="Value"
                      value={fact.value}
                      onChange={(value) => update({ facts: selected.facts.map((f, j) => (j === i ? { ...f, value } : f)) })}
                    />
                    <button
                      type="button"
                      className="te-remove"
                      aria-label={`Remove fact ${fact.label || i + 1}`}
                      title="Remove"
                      onClick={() => update({ facts: selected.facts.filter((_, j) => j !== i) })}
                    >
                      <Svg d={PATH.close} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="te-add-inline"
                onClick={() => {
                  update({ facts: [...selected.facts, { label: "", value: "" }] });
                  setFocusRequest({ kind: "fact", index: selected.facts.length });
                }}
              >
                <Svg d={PATH.plus} /> Add fact
              </button>

              <h4 className="sw-details-sub">More detail</h4>
              <EditableText
                className="te-details-text"
                multiline
                label="More detail"
                placeholder="Add a longer explanation…"
                value={selected.details}
                onChange={(details) => update({ details })}
              />

              <h4 className="sw-details-sub">What it covers</h4>
              <ul className="sw-details-points te-points">
                {selected.checklist.map((point, i) => (
                  <li key={i}>
                    <Svg d={PATH.check} />
                    <EditableText
                      className="te-point-text"
                      label={`Checklist item ${i + 1}`}
                      placeholder="Checklist item"
                      value={point}
                      onChange={(text) => update({ checklist: selected.checklist.map((p, j) => (j === i ? text : p)) })}
                      onEnter={() => {
                        const list = [...selected.checklist];
                        list.splice(i + 1, 0, "");
                        update({ checklist: list });
                        setFocusRequest({ kind: "point", index: i + 1 });
                      }}
                      onBackspaceEmpty={() => {
                        update({ checklist: selected.checklist.filter((_, j) => j !== i) });
                        if (i > 0) setFocusRequest({ kind: "point", index: i - 1 });
                      }}
                    />
                    <button
                      type="button"
                      className="te-remove"
                      aria-label={`Remove checklist item ${i + 1}`}
                      title="Remove"
                      onClick={() => update({ checklist: selected.checklist.filter((_, j) => j !== i) })}
                    >
                      <Svg d={PATH.close} />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="te-add-inline"
                onClick={() => {
                  update({ checklist: [...selected.checklist, ""] });
                  setFocusRequest({ kind: "point", index: selected.checklist.length });
                }}
              >
                <Svg d={PATH.plus} /> Add item
              </button>

              <nav className="sw-stepper" aria-label="Step through components">
                <button type="button" className="sw-step" onClick={() => step(-1)}>
                  <span aria-hidden="true">←</span> Previous
                </button>
                <span className="sw-dots" aria-hidden="true">
                  {comps.map((c) => (
                    <span key={c.id} className={c.id === selected.id ? "is-on" : ""} />
                  ))}
                </span>
                <button type="button" className="sw-step" onClick={() => step(1)}>
                  Next <span aria-hidden="true">→</span>
                </button>
              </nav>
            </section>
          )}

          <section className="te-components" aria-label="Components">
            <div className="te-list-head">
              <h4 className="sw-details-sub">Components</h4>
              <span className="te-count">
                {comps.length} of {limits.minComponents}–{limits.maxComponents}
              </span>
            </div>
            <ol className="sw-list te-list" aria-label="TOM components">
              {comps.map((c, index) => {
                const isSelected = c.id === selected?.id;
                return (
                  <li key={c.id} className="te-item" data-row={c.id}>
                    <button
                      type="button"
                      className={["sw-list-row", c.id === hoverId && "is-hovered", isSelected && "is-selected"].filter(Boolean).join(" ")}
                      aria-pressed={isSelected}
                      aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown Delete"
                      onClick={() => select(c.id)}
                      onKeyDown={(e) => onRowKeyDown(e, c)}
                      onMouseEnter={() => setHoverId(c.id)}
                      onMouseLeave={() => setHoverId(null)}
                      onFocus={() => setHoverId(c.id)}
                      onBlur={() => setHoverId(null)}
                    >
                      <span className="sw-list-no">{pad(index + 1)}</span>
                      <span className="sw-list-name">{displayName(c)}</span>
                    </button>
                    <span className="te-row-actions">
                      <button type="button" data-action="up" aria-label={`Move ${displayName(c)} up`} title="Move up" disabled={index === 0} onClick={() => move(c, -1, "up")}>
                        <Svg d={PATH.up} />
                      </button>
                      <button
                        type="button"
                        data-action="down"
                        aria-label={`Move ${displayName(c)} down`}
                        title="Move down"
                        disabled={index === comps.length - 1}
                        onClick={() => move(c, 1, "down")}
                      >
                        <Svg d={PATH.down} />
                      </button>
                      <button
                        type="button"
                        data-action="delete"
                        className="is-danger"
                        aria-label={`Delete ${displayName(c)}`}
                        title={atMin ? `A wheel needs at least ${limits.minComponents} components` : "Delete"}
                        disabled={atMin}
                        onClick={() => remove(c)}
                      >
                        <Svg d={PATH.trash} />
                      </button>
                    </span>
                  </li>
                );
              })}
            </ol>

            {undo && (
              <div className="te-toast">
                <span>“{displayName(undo.component)}” removed.</span>
                <button type="button" className="te-link" onClick={undoRemove}>
                  Undo
                </button>
              </div>
            )}

            <button type="button" className="te-add" onClick={add} disabled={atMax}>
              <Svg d={PATH.plus} /> Add component
            </button>
            {atMax && <p className="te-hint">The wheel holds up to {limits.maxComponents} components.</p>}
            {atMin && <p className="te-hint">A wheel needs at least {limits.minComponents} components.</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
