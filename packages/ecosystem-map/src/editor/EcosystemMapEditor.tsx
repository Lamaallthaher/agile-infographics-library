import { createContext, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { colorRamp, EditableText, generatePalette, IconPicker, readableOn } from "@agile-infographics/core";
import {
  DEFAULT_ECOSYSTEM_LIMITS,
  EcosystemMap,
  paletteToEcosystemTheme,
  type EcosystemAppearance,
  type EcosystemGroup,
  type EcosystemItem,
  type EcosystemLimits,
  type EcosystemMapData,
  type EcosystemMapInput,
  type EcosystemSlots,
  type FieldRef,
  type TextSlotProps,
} from "../renderer";
import { EcosystemAppearancePanel } from "./AppearancePanel";
import { EcosystemDataPanel } from "./DataPanel";
import { GroupInspector } from "./GroupInspector";
import { useEcosystemAppearance, useEcosystemMap, type RemovedGroup, type RemovedItem } from "./useEcosystemMap";
import "./ecosystem-editor.css";

export interface EcosystemMapEditorProps {
  /** Initial content (used until the user edits it, and by "Reset to default"). */
  defaultData: EcosystemMapInput;
  /** Local Storage key for the content; the appearance uses `${storageKey}.appearance`. */
  storageKey: string;
  /** Initial look and layout; anything left out uses `DEFAULT_ECOSYSTEM_APPEARANCE`. */
  defaultAppearance?: Partial<EcosystemAppearance>;
  limits?: EcosystemLimits;
  /**
   * Display only: shows the stored content and appearance with no editing
   * controls. Use it for viewers who are not allowed to edit.
   */
  readOnly?: boolean;
  /** Called after every content change (for example to save it elsewhere). */
  onChange?: (data: EcosystemMapData) => void;
  /** Called after every appearance change. */
  onAppearanceChange?: (appearance: EcosystemAppearance) => void;
}

type Ctx = {
  actions: ReturnType<typeof useEcosystemMap>["actions"];
  data: EcosystemMapData;
  limits: EcosystemLimits;
  register: (key: string, el: HTMLTextAreaElement | null) => void;
  focusField: (key: string) => void;
  onItemRemoved: (removed: RemovedItem) => void;
};
const EditorCtx = createContext<Ctx | null>(null);

const fieldKey = (f: FieldRef) => ("itemId" in f ? `${f.kind}:${f.groupId}:${f.itemId}` : "groupId" in f ? `${f.kind}:${f.groupId}` : f.kind);

const FIELD_LABEL: Record<FieldRef["kind"], string> = {
  title: "Infographic title",
  subtitle: "Subtitle",
  centerTitle: "Central entity",
  centerSubtitle: "Central entity subtitle",
  groupTitle: "Group title",
  groupDescription: "Group description",
  itemLabel: "Item",
  itemDescription: "Item detail",
};
const MAX_KEY: Record<FieldRef["kind"], keyof EcosystemLimits["maxLength"]> = {
  title: "title",
  subtitle: "subtitle",
  centerTitle: "centerTitle",
  centerSubtitle: "centerSubtitle",
  groupTitle: "groupTitle",
  groupDescription: "groupDescription",
  itemLabel: "itemLabel",
  itemDescription: "itemDescription",
};
const REQUIRED = new Set<FieldRef["kind"]>(["centerTitle", "groupTitle"]);

/** The editable Text slot: a stable component, so fields never remount while typing. */
function EditorText({ field, value, className, placeholder, multiline }: TextSlotProps) {
  const ctx = useContext(EditorCtx)!;
  const key = fieldKey(field);
  let label = FIELD_LABEL[field.kind];
  if ("groupId" in field) {
    const gi = ctx.data.groups.findIndex((g) => g.id === field.groupId);
    const group = ctx.data.groups[gi];
    label += ` (group ${gi + 1}`;
    if ("itemId" in field && group) label += `, item ${group.items.findIndex((i) => i.id === field.itemId) + 1}`;
    label += ")";
  }

  const itemProps =
    field.kind === "itemLabel"
      ? {
          onEnter: () => {
            const group = ctx.data.groups.find((g) => g.id === field.groupId);
            const at = group ? group.items.findIndex((i) => i.id === field.itemId) + 1 : undefined;
            const id = ctx.actions.addItem(field.groupId, at);
            if (id) ctx.focusField(`itemLabel:${field.groupId}:${id}`);
          },
          onBackspaceEmpty: () => {
            const group = ctx.data.groups.find((g) => g.id === field.groupId);
            const index = group ? group.items.findIndex((i) => i.id === field.itemId) : -1;
            const removed = ctx.actions.removeItem(field.groupId, field.itemId);
            if (removed) ctx.onItemRemoved(removed);
            const prev = group && index > 0 ? group.items[index - 1] : null;
            if (prev) ctx.focusField(`itemLabel:${field.groupId}:${prev.id}`);
          },
        }
      : {};

  return (
    <EditableText
      inputRef={(el) => ctx.register(key, el)}
      className={className}
      value={value}
      label={label}
      placeholder={placeholder}
      multiline={multiline}
      required={REQUIRED.has(field.kind)}
      maxLength={ctx.limits.maxLength[MAX_KEY[field.kind]]}
      onChange={(v) => ctx.actions.setField(field, v)}
      {...itemProps}
    />
  );
}

const PATH = {
  left: "M10 3.5 5.5 8l4.5 4.5",
  right: "M6 3.5 10.5 8 6 12.5",
  up: "M8 12.5v-9M4 7.5l4-4 4 4",
  down: "M8 3.5v9M4 8.5l4 4 4-4",
  plus: "M8 3.5v9M3.5 8h9",
  trash: "M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5",
  check: "M3.5 8.5 6.5 11.5 12.5 4.5",
  close: "M4.5 4.5l7 7M11.5 4.5l-7 7",
};
const Svg = ({ d }: { d: string }) => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d={d} />
  </svg>
);

type Undo = { kind: "group"; removed: RemovedGroup } | { kind: "item"; removed: RemovedItem };

/**
 * The Ecosystem Map with everything editable in place: click any text on the
 * map to change it, use the small controls on each group and item to reorder,
 * add or remove, select a group for its position, colour and connection, and
 * tune the look in the Appearance panel. With `readOnly` it renders the stored
 * map with no editing controls.
 */
export function EcosystemMapEditor({
  defaultData,
  storageKey,
  defaultAppearance,
  limits = DEFAULT_ECOSYSTEM_LIMITS,
  readOnly = false,
  onChange,
  onAppearanceChange,
}: EcosystemMapEditorProps) {
  const { data, saved, actions } = useEcosystemMap(defaultData, storageKey, limits, onChange);
  const look = useEcosystemAppearance(defaultAppearance, `${storageKey}.appearance`, onAppearanceChange);
  const { appearance } = look;
  const theme = useMemo(
    () => paletteToEcosystemTheme(generatePalette(appearance.base), { secondary: appearance.secondary, scheme: appearance.scheme, overrides: appearance.overrides }),
    [appearance.base, appearance.secondary, appearance.scheme, appearance.overrides],
  );

  const [selected, setSelected] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [undo, setUndo] = useState<Undo | null>(null);
  const [resetArmed, setResetArmed] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const fields = useRef(new Map<string, HTMLTextAreaElement>());
  const [pendingFocus, setPendingFocus] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [pendingButton, setPendingButton] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingFocus) return;
    const el = fields.current.get(pendingFocus);
    if (el) {
      el.focus();
      el.select();
    }
    setPendingFocus(null);
  }, [pendingFocus, data, expanded]);

  useEffect(() => {
    if (!pendingButton) return;
    const el = rootRef.current?.querySelector<HTMLButtonElement>(pendingButton);
    (el && !el.disabled ? el : null)?.focus();
    setPendingButton(null);
  }, [pendingButton, data]);

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

  // Drop selections that no longer exist (after delete, import or reset).
  const group = data.groups.find((g) => g.id === selected) ?? null;
  const item = group?.items.find((i) => i.id === selectedItem) ?? null;
  useEffect(() => {
    if (selected && !group) setSelected(null);
    if (selectedItem && !item) setSelectedItem(null);
  }, [selected, selectedItem, group, item]);

  const { groups } = data;
  const atMin = groups.length <= limits.minGroups;
  const atMax = groups.length >= limits.maxGroups;
  const ramp = colorRamp(theme.groupFrom, appearance.groupColoring === "ramp" ? theme.groupTo : theme.groupFrom, groups.length);
  // By id: slots receive the renderer's normalised copies, not these objects.
  const colorOf = (g: EcosystemGroup) => g.color || ramp[groups.findIndex((x) => x.id === g.id)] || theme.groupFrom;

  const expand = (groupId: string) => setExpanded((cur) => (cur.includes(groupId) ? cur : [...cur, groupId]));

  function addGroup(after?: string | null) {
    const id = actions.addGroup(after ?? null);
    if (!id) return;
    setSelected(id);
    setSelectedItem(null);
    setAnnouncement(`Group added. ${groups.length + 1} groups.`);
    setPendingFocus(`groupTitle:${id}`);
  }
  function removeGroup(g: EcosystemGroup) {
    const removed = actions.removeGroup(g.id);
    if (!removed) return;
    if (selected === g.id) setSelected(null);
    setUndo({ kind: "group", removed });
    setAnnouncement(`Group “${g.title}” removed.`);
  }
  function addItem(g: EcosystemGroup, at?: number) {
    const id = actions.addItem(g.id, at);
    if (!id) return;
    expand(g.id);
    setSelected(g.id);
    setSelectedItem(id);
    setPendingFocus(`itemLabel:${g.id}:${id}`);
  }
  /** Empty items removed with Backspace need no Undo; deleted items with content get one. */
  function itemRemoved(removed: RemovedItem) {
    if (removed.item.label.trim() || removed.item.description.trim()) setUndo({ kind: "item", removed });
    setAnnouncement(`Item “${removed.item.label || "Untitled"}” removed.`);
  }
  function removeItem(g: EcosystemGroup, it: EcosystemItem) {
    const removed = actions.removeItem(g.id, it.id);
    if (removed) itemRemoved(removed);
  }
  function undoRemove() {
    if (!undo) return;
    if (undo.kind === "group") actions.restoreGroup(undo.removed);
    else actions.restoreItem(undo.removed);
    setAnnouncement(`“${undo.kind === "group" ? undo.removed.group.title : undo.removed.item.label}” restored.`);
    setUndo(null);
  }
  function moveGroup(g: EcosystemGroup, delta: number, action: string) {
    const i = groups.findIndex((x) => x.id === g.id);
    const to = Math.max(0, Math.min(groups.length - 1, i + delta));
    if (to === i) return;
    actions.moveGroup(g.id, delta);
    setPendingButton(`[data-group="${g.id}"] [data-action="${action}"]`);
    setAnnouncement(`Group moved to position ${to + 1}.`);
  }
  function moveItem(g: EcosystemGroup, it: EcosystemItem, delta: number, action?: string) {
    const i = g.items.indexOf(it);
    const to = Math.max(0, Math.min(g.items.length - 1, i + delta));
    if (to === i) return;
    actions.moveItem(g.id, it.id, delta);
    if (action) setPendingButton(`[data-item="${it.id}"] [data-action="${action}"]`);
    setAnnouncement(`Item moved to position ${to + 1}.`);
  }
  function reset() {
    if (!resetArmed) {
      setResetArmed(true);
      return;
    }
    actions.reset();
    look.reset();
    setResetArmed(false);
    setUndo(null);
    setSelected(null);
    setSelectedItem(null);
    setExpanded([]);
    setAnnouncement("Reset to the default content and appearance.");
  }

  // Selecting follows focus and clicks inside the map.
  const track = (target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    if (!el?.closest || !el.closest(".em")) return;
    const card = el.closest<HTMLElement>("[data-group]");
    if (!card) return;
    const gid = card.dataset.group ?? null;
    if (gid !== selected) setSelected(gid);
    const it = el.closest<HTMLElement>("[data-item]");
    if (it) setSelectedItem(it.dataset.item ?? null);
    else if (gid !== selected) setSelectedItem(null);
  };

  // Alt + arrows move the focused item (↑ ↓) or group (← →).
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!e.altKey || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
    const el = e.target as HTMLElement;
    const card = el.closest<HTMLElement>("[data-group]");
    const g = groups.find((x) => x.id === card?.dataset.group);
    if (!g) return;
    const itemEl = el.closest<HTMLElement>("[data-item]");
    const it = g.items.find((x) => x.id === itemEl?.dataset.item);
    if ((e.key === "ArrowUp" || e.key === "ArrowDown") && it) {
      e.preventDefault();
      moveItem(g, it, e.key === "ArrowUp" ? -1 : 1);
      setPendingFocus(`itemLabel:${g.id}:${it.id}`);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const i = groups.indexOf(g);
      const delta = e.key === "ArrowLeft" ? -1 : 1;
      if (i + delta < 0 || i + delta >= groups.length) return;
      actions.moveGroup(g.id, delta);
      setAnnouncement(`Group moved to position ${i + delta + 1}.`);
      const key = it ? `itemLabel:${g.id}:${it.id}` : `groupTitle:${g.id}`;
      setPendingFocus(key);
    }
  }

  const ctx: Ctx = {
    actions,
    data,
    limits,
    register: (key, el) => {
      if (el) fields.current.set(key, el);
      else fields.current.delete(key);
    },
    focusField: (key) => setPendingFocus(key),
    onItemRemoved: itemRemoved,
  };

  if (readOnly) {
    return (
      <div className="eme-readonly" data-component="ecosystem-map">
        <EcosystemMap data={data} appearance={appearance} limits={limits} />
      </div>
    );
  }

  const iconWrap = (key: string, icon: string | null | undefined, color: { bg: string; fg: string }, picker: ReactNode) => (
    <span key={key} className={`eme-badge-wrap ${icon ? "" : "is-empty"}`} style={{ background: icon ? color.bg : "transparent", color: icon ? color.fg : color.bg }}>
      {picker}
    </span>
  );

  const slots: EcosystemSlots = {
    Text: EditorText,
    centerIcon: () => (
      <span className={`eme-center-icon ${data.center.icon ? "" : "is-empty"}`}>
        <IconPicker
          value={data.center.icon ?? "target"}
          componentName="the central entity"
          buttonClassName="eme-icon-button"
          badge={false}
          onChange={(icon) => actions.updateCenter({ icon })}
        />
      </span>
    ),
    groupBadge: (g, i) => {
      const bg = colorOf(g);
      return iconWrap(
        g.id,
        g.icon,
        { bg, fg: readableOn(bg, "#ffffff", "#10202f", 3).fg },
        <IconPicker
          value={g.icon ?? "network"}
          componentName={`group ${i + 1}`}
          buttonClassName="eme-icon-button"
          badge={false}
          onChange={(icon) => actions.updateGroup(g.id, { icon })}
        />,
      );
    },
    groupToolbar: (g, i) => (
      <div className="eme-tools eme-group-tools" role="group" aria-label={`Group ${i + 1} actions`}>
        <button type="button" data-action="earlier" aria-label={`Move group ${i + 1} earlier`} title="Move earlier (anticlockwise)" disabled={i === 0} onClick={() => moveGroup(g, -1, "earlier")}>
          <Svg d={PATH.left} />
        </button>
        <button type="button" data-action="later" aria-label={`Move group ${i + 1} later`} title="Move later (clockwise)" disabled={i === groups.length - 1} onClick={() => moveGroup(g, 1, "later")}>
          <Svg d={PATH.right} />
        </button>
        <button type="button" data-action="insert" aria-label={`Add a group after group ${i + 1}`} title="Add group after" disabled={atMax} onClick={() => addGroup(g.id)}>
          <Svg d={PATH.plus} />
        </button>
        <button
          type="button"
          data-action="delete"
          className="is-danger"
          aria-label={`Delete group ${i + 1}`}
          title={atMin ? `At least ${limits.minGroups} group is needed` : "Delete group"}
          disabled={atMin}
          onClick={() => removeGroup(g)}
        >
          <Svg d={PATH.trash} />
        </button>
      </div>
    ),
    groupFooter: (g) =>
      g.items.length < limits.maxItems ? (
        <button type="button" className="te-add-inline eme-add-item" data-action="add-item" onClick={() => addItem(g)}>
          <Svg d={PATH.plus} /> Add item
        </button>
      ) : (
        <p className="te-hint">Maximum of {limits.maxItems} items reached.</p>
      ),
    itemToolbar: (g, it, ii) => (
      <div className="eme-tools eme-item-tools" role="group" aria-label={`Item ${ii + 1} actions`}>
        <button type="button" data-action="up" aria-label={`Move item ${ii + 1} up`} title="Move up (Alt + ↑)" disabled={ii === 0} onClick={() => moveItem(g, it, -1, "up")}>
          <Svg d={PATH.up} />
        </button>
        <button type="button" data-action="down" aria-label={`Move item ${ii + 1} down`} title="Move down (Alt + ↓)" disabled={ii === g.items.length - 1} onClick={() => moveItem(g, it, 1, "down")}>
          <Svg d={PATH.down} />
        </button>
        <button type="button" data-action="delete" className="is-danger" aria-label={`Delete item ${ii + 1}`} title="Delete item" onClick={() => removeItem(g, it)}>
          <Svg d={PATH.close} />
        </button>
      </div>
    ),
  };

  const groupFrom = theme.groupFrom;
  const edVars = {
    "--ed-border": theme.surfaceBorder,
    "--ed-accent": theme.accent,
    "--ed-surface": theme.surface,
    "--ed-surface-raised": theme.surface,
    "--ed-text": theme.text,
    "--ed-text-muted": theme.textMuted,
    "--ed-focus": theme.focus,
    "--ed-selected-bg": groupFrom,
    "--ed-selected-fg": readableOn(groupFrom, "#ffffff", "#10202f", 3).fg,
    "--eme-bg": theme.background,
    "--eme-panel": theme.panel,
    "--eme-surface": theme.surface,
    "--eme-text": theme.text,
    "--eme-muted": theme.textMuted,
    "--eme-heading": theme.heading,
    "--eme-accent": theme.accent,
    "--eme-border": theme.surfaceBorder,
  } as CSSProperties;

  const connection = group ? data.connections.find((c) => c.source === group.id || c.target === group.id) : undefined;
  const itemCount = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <EditorCtx.Provider value={ctx}>
      <div
        ref={rootRef}
        className="ed-scope eme"
        style={edVars}
        data-component="ecosystem-map"
        data-scheme={appearance.scheme}
        onFocus={(e) => track(e.target)}
        onPointerDown={(e) => track(e.target)}
        onKeyDown={onKeyDown}
      >
        <div className="eme-toolbar" role="toolbar" aria-label="Structure">
          <div className="eme-toolbar-group">
            <span className="eme-count">
              <strong>{groups.length}</strong> groups <span>({limits.minGroups}–{limits.maxGroups})</span>
            </span>
            <button type="button" className="eme-btn" data-action="add-group" onClick={() => addGroup(null)} disabled={atMax}>
              <Svg d={PATH.plus} /> Add group
            </button>
            <span className="eme-count">
              <strong>{itemCount}</strong> items
            </span>
          </div>
          <div className="eme-toolbar-group eme-toolbar-end">
            <span className={`eme-saved ${saved ? "" : "is-error"}`}>
              <Svg d={saved ? PATH.check : PATH.close} />
              {saved ? "Saved in this browser" : "Changes cannot be saved in this browser"}
            </span>
            <button type="button" className={`te-link ${resetArmed ? "is-armed" : ""}`} data-action="reset" onClick={reset}>
              {resetArmed ? "Click again to reset" : "Reset to default"}
            </button>
          </div>
        </div>
        {undo && (
          <div className="eme-toast">
            <span>
              {undo.kind === "group" ? `Group “${undo.removed.group.title}”` : `Item “${undo.removed.item.label || "Untitled"}”`} removed.
            </span>
            <button type="button" className="te-link" onClick={undoRemove}>
              Undo
            </button>
          </div>
        )}
        <p className="eme-visually-hidden" role="status" aria-live="polite">
          {announcement}
        </p>

        <EcosystemMap
          data={data}
          appearance={appearance}
          limits={limits}
          selectedGroupId={selected}
          onSelectGroup={setSelected}
          expandedGroupIds={expanded}
          onToggleExpanded={(id, open) => setExpanded((cur) => (open ? [...cur, id] : cur.filter((x) => x !== id)))}
          showHidden
          slots={slots}
        />

        {group && connection ? (
          <GroupInspector
            group={group}
            index={groups.indexOf(group)}
            count={groups.length}
            connection={connection}
            centerId={data.center.id}
            item={item}
            currentColor={colorOf(group)}
            limits={limits}
            actions={actions}
          />
        ) : (
          <p className="eme-hint-card">Select a group (click it or any of its text) to set its position, colour, visibility and connection.</p>
        )}

        <EcosystemAppearancePanel
          appearance={appearance}
          theme={theme}
          onChange={look.set}
          onReset={look.reset}
          centerStyle={data.center.style}
          onCenterStyle={(style) => actions.updateCenter({ style })}
        />

        <EcosystemDataPanel
          data={data}
          limits={limits}
          onImport={(next) => {
            actions.replace(next);
            setSelected(null);
            setSelectedItem(null);
            setExpanded([]);
            setUndo(null);
            setAnnouncement(`Imported ${next.groups.length} groups.`);
          }}
        />
      </div>
    </EditorCtx.Provider>
  );
}
