import { createContext, useContext, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { colorRamp, EditableText, generatePalette, readableOn } from "@agile-infographics/core";
import {
  DEFAULT_PROCESS_LIMITS,
  EMPTY_PATH,
  findNode,
  groupNodeColors,
  LEVEL_NAMES,
  numberingFor,
  paletteToProcessTheme,
  ProcessArchitecture,
  resolvePath,
  type FieldRef,
  type GroupCategory,
  type ProcessAppearance,
  type ProcessArchitectureData,
  type ProcessArchitectureInput,
  type ProcessArchitectureLimits,
  type ProcessGroup,
  type ProcessLevel,
  type ProcessPath,
  type ProcessSlots,
  type TextSlotProps,
} from "../renderer";
import { NodeInspector, ProcessAppearancePanel, ProcessDataPanel } from "./panels";
import { useProcessAppearance, useProcessArchitecture, type RemovedNode } from "./useProcessArchitecture";
import "./process-editor.css";

export interface ProcessArchitectureEditorProps {
  /** Initial content (used until the user edits it, and by "Reset to default"). */
  defaultData: ProcessArchitectureInput;
  /** Local Storage key for the content; the appearance uses `${storageKey}.appearance`. */
  storageKey: string;
  defaultAppearance?: Partial<ProcessAppearance>;
  limits?: ProcessArchitectureLimits;
  /** Display only: the stored content and appearance with no editing controls (for viewers who may not edit). */
  readOnly?: boolean;
  onChange?: (data: ProcessArchitectureData) => void;
  onAppearanceChange?: (appearance: ProcessAppearance) => void;
}

type Ctx = {
  actions: ReturnType<typeof useProcessArchitecture>["actions"];
  limits: ProcessArchitectureLimits;
  register: (key: string, el: HTMLTextAreaElement | null) => void;
};
const EditorCtx = createContext<Ctx | null>(null);

const fieldKey = (f: FieldRef) =>
  "id" in f ? `${f.kind}:${f.id}` : "levelIndex" in f ? `${f.kind}:${f.levelIndex}` : "scopeIndex" in f ? `${f.kind}:${f.scopeIndex}` : f.kind;

/** Accessible name, length limit and whether an empty value is restored, per field. */
function fieldInfo(field: FieldRef, L: ProcessArchitectureLimits["maxLength"]): { label: string; max: number; required: boolean } {
  if ("id" in field) {
    const name = `L${field.level} ${LEVEL_NAMES[field.level].toLowerCase()}`;
    return field.kind === "nodeTitle" ? { label: `${name} title`, max: L.nodeTitle, required: true } : { label: `${name} description`, max: L.description, required: false };
  }
  if ("levelIndex" in field) {
    const l = `Level ${field.levelIndex}`;
    if (field.kind === "levelLabel") return { label: `${l} label`, max: L.levelLabel, required: false };
    if (field.kind === "levelName") return { label: `${l} name`, max: L.levelName, required: true };
    return { label: `${l} description`, max: L.levelDescription, required: false };
  }
  if ("scopeIndex" in field) {
    return field.kind === "scopeTitle"
      ? { label: `Scope ${field.scopeIndex + 1} title`, max: L.scopeTitle, required: true }
      : { label: `Scope ${field.scopeIndex + 1} description`, max: L.scopeDescription, required: false };
  }
  if (field.kind === "kicker") return { label: "Kicker", max: L.kicker, required: false };
  return field.kind === "title" ? { label: "Infographic title", max: L.title, required: false } : { label: "Description", max: L.subtitle, required: false };
}

/** The editable Text slot: a stable component, so fields never remount while typing. */
function EditorText({ field, value, className, placeholder, multiline }: TextSlotProps) {
  const ctx = useContext(EditorCtx)!;
  const { label, max, required } = fieldInfo(field, ctx.limits.maxLength);
  return (
    <EditableText
      inputRef={(el) => ctx.register(fieldKey(field), el)}
      className={className}
      value={value}
      label={label}
      placeholder={placeholder}
      multiline={multiline}
      required={required}
      maxLength={max}
      onChange={(v) => ctx.actions.setField(field, v)}
    />
  );
}

const PATH_D = {
  earlier: "M10 3.5 5.5 8l4.5 4.5",
  later: "M6 3.5 10.5 8 6 12.5",
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
const NEW_LABEL = ["value chain", "process group", "process", "activity"] as const;

/**
 * The Process Architecture Map with everything editable in place: click any
 * title or description to change it, use the small controls on each node to
 * reorder, insert or delete (with Undo), select a node for its owner, status,
 * tags, code and link, and tune the look in the Appearance panel. With
 * `readOnly` it renders the stored map with no editing controls.
 */
export function ProcessArchitectureEditor({
  defaultData,
  storageKey,
  defaultAppearance,
  limits = DEFAULT_PROCESS_LIMITS,
  readOnly = false,
  onChange,
  onAppearanceChange,
}: ProcessArchitectureEditorProps) {
  const { data, saved, actions } = useProcessArchitecture(defaultData, storageKey, limits, onChange);
  const look = useProcessAppearance(defaultAppearance, `${storageKey}.appearance`, onAppearanceChange);
  const { appearance } = look;
  const theme = useMemo(
    () => paletteToProcessTheme(generatePalette(appearance.base), { secondary: appearance.secondary, scheme: appearance.scheme, overrides: appearance.overrides }),
    [appearance.base, appearance.secondary, appearance.scheme, appearance.overrides],
  );

  const [rawPath, setPath] = useState<ProcessPath>(EMPTY_PATH);
  const path = resolvePath(data, rawPath);
  const [undo, setUndo] = useState<RemovedNode | null>(null);
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
  }, [pendingFocus, data, rawPath]);
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

  const ctx: Ctx = {
    actions,
    limits,
    register: (key, el) => {
      if (el) fields.current.set(key, el);
      else fields.current.delete(key);
    },
  };

  if (readOnly) {
    return (
      <div className="pae-readonly" data-component="process-architecture">
        <ProcessArchitecture data={data} appearance={appearance} limits={limits} />
      </div>
    );
  }

  const chain = data.valueChains.find((c) => c.id === path.valueChainId) ?? data.valueChains[0];
  const numbers = numberingFor(chain);
  const maxFor = (level: ProcessLevel) => [limits.maxValueChains, limits.maxGroups, limits.maxProcesses, limits.maxActivities][level];

  /** Navigates to a node that is being restored (its parent already exists in the current data). */
  const reveal = ({ level, parentId, node }: RemovedNode) => {
    if (level === 0) return setPath({ ...EMPTY_PATH, valueChainId: node.id });
    const parent = parentId ? findNode(data, parentId) : null;
    if (!parent) return;
    const key = (["valueChainId", "groupId", "processId", "activityId"] as const)[level];
    setPath({ ...parent.path, [key]: node.id });
  };

  function add(level: ProcessLevel, parentId: string | null, afterId?: string | null, category?: GroupCategory) {
    const id = actions.addNode(level, parentId, afterId ?? null, category);
    if (!id) return;
    // The new node is in the next render's data: navigate to it from there.
    setPath((p) => {
      if (level === 0) return { ...EMPTY_PATH, valueChainId: id };
      if (level === 1) return { ...EMPTY_PATH, valueChainId: p.valueChainId ?? chain.id, groupId: id };
      if (level === 2) return { valueChainId: p.valueChainId ?? chain.id, groupId: parentId, processId: id, activityId: null };
      return { ...p, valueChainId: p.valueChainId ?? chain.id, activityId: id };
    });
    setAnnouncement(`${LEVEL_NAMES[level]} added.`);
    setPendingFocus(`nodeTitle:${id}`);
  }
  function remove(id: string) {
    const removed = actions.removeNode(id);
    if (!removed) return;
    setUndo(removed);
    setAnnouncement(`${LEVEL_NAMES[removed.level]} “${removed.node.title}” removed.`);
  }
  function undoRemove() {
    if (!undo) return;
    actions.restoreNode(undo);
    setAnnouncement(`“${undo.node.title}” restored.`);
    reveal(undo);
    setUndo(null);
  }
  function move(id: string, delta: number, action: string) {
    actions.moveNode(id, delta);
    setPendingButton(`[data-node="${id}"] [data-action="${action}"]`);
    setAnnouncement(delta < 0 ? "Moved earlier." : "Moved later.");
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
    setPath(EMPTY_PATH);
    setAnnouncement("Reset to the default content and appearance.");
  }

  const slots: ProcessSlots = {
    Text: EditorText,
    nodeToolbar: (level, id, _index, count) => {
      const found = findNode(data, id);
      const peers =
        level === 1 && found
          ? chain.groups.filter((g) => g.category === (found.node as ProcessGroup).category)
          : null;
      const pos = peers ? peers.findIndex((g) => g.id === id) : found?.index ?? 0;
      const n = peers ? peers.length : count;
      const parentId = level === 0 ? null : level === 1 ? found?.path.valueChainId ?? null : level === 2 ? found?.path.groupId ?? null : found?.path.processId ?? null;
      const name = LEVEL_NAMES[level].toLowerCase();
      const atMinChains = level === 0 && data.valueChains.length <= limits.minValueChains;
      return (
        <div className="pae-tools" role="group" aria-label={`${LEVEL_NAMES[level]} actions`}>
          <button type="button" data-action="earlier" aria-label={`Move ${name} earlier`} title="Move earlier" disabled={pos <= 0} onClick={() => move(id, -1, "earlier")}>
            <Svg d={PATH_D.earlier} />
          </button>
          <button type="button" data-action="later" aria-label={`Move ${name} later`} title="Move later" disabled={pos >= n - 1} onClick={() => move(id, 1, "later")}>
            <Svg d={PATH_D.later} />
          </button>
          <button
            type="button"
            data-action="insert"
            aria-label={`Add a ${name} after this one`}
            title={`Add ${name} after`}
            disabled={count >= maxFor(level)}
            onClick={() => add(level, parentId, id, level === 1 ? (found?.node as ProcessGroup).category : undefined)}
          >
            <Svg d={PATH_D.plus} />
          </button>
          <button
            type="button"
            data-action="delete"
            className="is-danger"
            aria-label={`Delete ${name}`}
            title={atMinChains ? "At least one value chain is needed" : `Delete ${name}`}
            disabled={atMinChains}
            onClick={() => remove(id)}
          >
            <Svg d={PATH_D.trash} />
          </button>
        </div>
      );
    },
    addButton: (level, parentId, category) => {
      const list =
        level === 0 ? data.valueChains : level === 1 ? chain.groups : parentId ? (findNode(data, parentId)?.node as { processes?: unknown[]; activities?: unknown[] }) : null;
      const count = level === 0 ? data.valueChains.length : level === 1 ? chain.groups.length : level === 2 ? (list as { processes: unknown[] })?.processes?.length ?? 0 : (list as { activities: unknown[] })?.activities?.length ?? 0;
      const label = level === 1 && category ? `Add ${category} group` : `Add ${NEW_LABEL[level]}`;
      return (
        <button
          type="button"
          className="pae-add"
          data-action={`add-l${level}${category ? `-${category}` : ""}`}
          disabled={count >= maxFor(level)}
          onClick={() => add(level, parentId, null, category)}
        >
          <Svg d={PATH_D.plus} /> {label}
        </button>
      );
    },
  };

  // The deepest selected node is the one the inspector edits.
  const inspectedId = path.activityId ?? path.processId ?? path.groupId ?? path.valueChainId;
  const inspected = inspectedId ? findNode(data, inspectedId) : null;
  const coreGroups = chain.groups.filter((g) => g.category === "core");
  const ramp = colorRamp(theme.coreFrom, theme.coreTo, coreGroups.length);
  const groupColor = (g: ProcessGroup) =>
    g.color || groupNodeColors(g.category === "core" ? ramp[coreGroups.findIndex((x) => x.id === g.id)] : g.category === "management" ? theme.management : theme.support).bg;

  const edVars = {
    "--ed-border": theme.surfaceBorder,
    "--ed-accent": theme.accent,
    "--ed-surface": theme.surface,
    "--ed-surface-raised": theme.surface,
    "--ed-text": theme.text,
    "--ed-text-muted": theme.textMuted,
    "--ed-focus": theme.focus,
    "--ed-selected-bg": theme.valueChain,
    "--ed-selected-fg": readableOn(theme.valueChain, "#ffffff", "#10202f", 3).fg,
    "--pae-bg": theme.background,
    "--pae-panel": theme.panel,
    "--pae-surface": theme.surface,
    "--pae-text": theme.text,
    "--pae-muted": theme.textMuted,
    "--pae-heading": theme.heading,
    "--pae-accent": theme.accent,
    "--pae-border": theme.surfaceBorder,
  } as CSSProperties;

  const totals = data.valueChains.reduce(
    (t, c) => {
      t.groups += c.groups.length;
      c.groups.forEach((g) => {
        t.processes += g.processes.length;
        g.processes.forEach((p) => (t.activities += p.activities.length));
      });
      return t;
    },
    { groups: 0, processes: 0, activities: 0 },
  );

  return (
    <EditorCtx.Provider value={ctx}>
      <div ref={rootRef} className="ed-scope pae" style={edVars} data-component="process-architecture" data-scheme={appearance.scheme}>
        <div className="pae-toolbar" role="toolbar" aria-label="Structure">
          <span className="pae-count">
            <strong>{data.valueChains.length}</strong> value chain{data.valueChains.length === 1 ? "" : "s"} · <strong>{totals.groups}</strong> groups ·{" "}
            <strong>{totals.processes}</strong> processes · <strong>{totals.activities}</strong> activities
          </span>
          <div className="pae-toolbar-end">
            <span className={`pae-saved ${saved ? "" : "is-error"}`}>
              <Svg d={saved ? PATH_D.check : PATH_D.close} />
              {saved ? "Saved in this browser" : "Changes cannot be saved in this browser"}
            </span>
            <button type="button" className={`te-link ${resetArmed ? "is-armed" : ""}`} data-action="reset" onClick={reset}>
              {resetArmed ? "Click again to reset" : "Reset to default"}
            </button>
          </div>
        </div>
        {undo && (
          <div className="pae-toast">
            <span>
              {LEVEL_NAMES[undo.level]} “{undo.node.title || "Untitled"}” removed.
            </span>
            <button type="button" className="te-link" onClick={undoRemove}>
              Undo
            </button>
          </div>
        )}
        <p className="pae-visually-hidden" role="status" aria-live="polite">
          {announcement}
        </p>

        <ProcessArchitecture data={data} appearance={appearance} limits={limits} path={path} onNavigate={setPath} slots={slots} />

        {inspected ? (
          <NodeInspector
            level={inspected.level}
            node={inspected.node}
            code={inspected.node.code || (appearance.numbering && inspected.level > 0 ? numbers.get(inspected.node.id) ?? "" : "")}
            limits={limits}
            groupColor={inspected.level === 1 ? groupColor(inspected.node as ProcessGroup) : undefined}
            onChange={(patch) => actions.updateNode(inspected.node.id, patch)}
          />
        ) : null}
        <ProcessAppearancePanel appearance={appearance} theme={theme} onChange={look.set} onReset={look.reset} />
        <ProcessDataPanel
          data={data}
          limits={limits}
          onImport={(next) => {
            actions.replace(next);
            setPath(EMPTY_PATH);
            setUndo(null);
            setAnnouncement(`Imported ${next.valueChains.length} value chains.`);
          }}
        />
      </div>
    </EditorCtx.Provider>
  );
}
