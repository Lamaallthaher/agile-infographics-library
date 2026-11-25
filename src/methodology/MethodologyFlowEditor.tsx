import { createContext, useContext, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  MethodologyFlow,
  paletteToMethodologyTheme,
  type FieldRef,
  type FlowDimension,
  type FlowModel,
  type FlowSlots,
  type FlowStep,
  type TextSlotProps,
} from "../library/methodology-flow";
import { colorRamp, readableOn } from "../library/theme-generator";
import { EditableText, IconPicker } from "../shared/editing";
import { icons } from "../shared/icons";
import { AppearancePanel } from "./AppearancePanel";
import { DEFAULT_APPEARANCE } from "./default-methodology";
import {
  DEFAULT_METHODOLOGY_LIMITS,
  type AssessmentDimensionData,
  type MethodologyAppearance,
  type MethodologyFlowData,
  type MethodologyLimits,
  type MethodologyStepData,
} from "./types";
import { useMethodologyAppearance, useMethodologyFlow, type Removed } from "./useMethodologyFlow";
import "./methodology-editor.css";

export interface MethodologyFlowEditorProps {
  /** Initial content (used until the user edits it, and by "Reset to default"). */
  defaultData: MethodologyFlowData;
  /** Local Storage key for the content; the appearance uses `${storageKey}.appearance`. */
  storageKey: string;
  defaultAppearance?: MethodologyAppearance;
  limits?: MethodologyLimits;
}

type Ctx = {
  actions: ReturnType<typeof useMethodologyFlow>["actions"];
  data: MethodologyFlowData;
  limits: MethodologyLimits;
  register: (key: string, el: HTMLTextAreaElement | null) => void;
  focusField: (key: string) => void;
};
const EditorCtx = createContext<Ctx | null>(null);

const fieldKey = (f: FieldRef) =>
  "stepId" in f ? `${f.kind}:${f.stepId}${"index" in f ? `:${f.index}` : ""}` : "dimId" in f ? `${f.kind}:${f.dimId}` : f.kind;

const FIELD_LABEL: Record<FieldRef["kind"], string> = {
  title: "Infographic title",
  subtitle: "Subtitle",
  kicker: "Step label",
  stepTitle: "Step title",
  description: "Step description",
  bullet: "Step point",
  takeaway: "Step takeaway",
  centerValue: "Centre value (empty = number of dimensions)",
  centerLabel: "Centre label",
  resultTitle: "Result title",
  resultDescription: "Result description",
  dimLabel: "Dimension label",
  dimDescription: "Dimension description",
};
const REQUIRED = new Set<FieldRef["kind"]>(["title", "stepTitle", "dimLabel"]);

/** The editable Text slot: a stable component, so fields never remount while typing. */
function EditorText({ field, value, className, placeholder, multiline }: TextSlotProps) {
  const ctx = useContext(EditorCtx)!;
  const key = fieldKey(field);
  const max = ctx.limits.maxLength[field.kind];
  const step = "stepId" in field ? ctx.data.steps.find((s) => s.id === field.stepId) : undefined;
  const stepNo = step ? ctx.data.steps.indexOf(step) + 1 : 0;
  const label = stepNo ? `${FIELD_LABEL[field.kind]} (step ${stepNo})` : FIELD_LABEL[field.kind];

  const bulletProps =
    field.kind === "bullet"
      ? {
          onEnter: () => {
            const at = ctx.actions.addBullet(field.stepId, field.index + 1);
            if (at >= 0) ctx.focusField(`bullet:${field.stepId}:${at}`);
          },
          onBackspaceEmpty: () => {
            ctx.actions.removeBullet(field.stepId, field.index);
            if (field.index > 0) ctx.focusField(`bullet:${field.stepId}:${field.index - 1}`);
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
      maxLength={max}
      onChange={(v) => ctx.actions.setField(field, v)}
      {...bulletProps}
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

/**
 * The Methodology Flow with everything editable in place (no view/edit modes):
 * click any text to change it, use the small controls next to each step and
 * dimension to reorder, add or remove, and tune the look in the Appearance panel.
 */
export function MethodologyFlowEditor({
  defaultData,
  storageKey,
  defaultAppearance = DEFAULT_APPEARANCE,
  limits = DEFAULT_METHODOLOGY_LIMITS,
}: MethodologyFlowEditorProps) {
  const { data, saved, actions } = useMethodologyFlow(defaultData, storageKey, limits);
  const look = useMethodologyAppearance(defaultAppearance, `${storageKey}.appearance`);
  const { appearance } = look;
  const theme = useMemo(() => paletteToMethodologyTheme(look.palette, appearance.overrides), [look.palette, appearance.overrides]);

  const [selectedDim, setSelectedDim] = useState<string | null>(null);
  const [undo, setUndo] = useState<
    { kind: "step"; removed: Removed<MethodologyStepData> } | { kind: "dimension"; removed: Removed<AssessmentDimensionData> } | null
  >(null);
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
  }, [pendingFocus, data]);

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
    data,
    limits,
    register: (key, el) => {
      if (el) fields.current.set(key, el);
      else fields.current.delete(key);
    },
    focusField: (key) => setPendingFocus(key),
  };

  const { steps } = data;
  const dims = data.wheel.dimensions;
  const stepsAtMin = steps.length <= limits.minSteps;
  const stepsAtMax = steps.length >= limits.maxSteps;
  const dimsAtMin = dims.length <= limits.minDimensions;
  const dimsAtMax = dims.length >= limits.maxDimensions;
  const dimRamp = colorRamp(theme.dimFrom, theme.dimTo, dims.length);

  function addStep(after?: string | null) {
    const id = actions.addStep(after ?? null);
    if (!id) return;
    setAnnouncement(`Step added. ${steps.length + 1} steps.`);
    setPendingFocus(`stepTitle:${id}`);
  }
  function removeStep(s: MethodologyStepData) {
    const removed = actions.removeStep(s.id);
    if (!removed) return;
    setUndo({ kind: "step", removed });
    setAnnouncement(`Step “${s.title}” removed.`);
  }
  function addDimension(after?: string | null) {
    const id = actions.addDimension(after ?? null);
    if (!id) return;
    setSelectedDim(id);
    setAnnouncement(`Dimension added. ${dims.length + 1} dimensions.`);
    setPendingFocus(`dimLabel:${id}`);
  }
  function removeDimension(d: AssessmentDimensionData) {
    const removed = actions.removeDimension(d.id);
    if (!removed) return;
    if (selectedDim === d.id) setSelectedDim(null);
    setUndo({ kind: "dimension", removed });
    setAnnouncement(`Dimension “${d.label}” removed.`);
  }
  function undoRemove() {
    if (!undo) return;
    if (undo.kind === "step") actions.restoreStep(undo.removed);
    else actions.restoreDimension(undo.removed);
    setAnnouncement(`“${undo.kind === "step" ? undo.removed.item.title : undo.removed.item.label}” restored.`);
    setUndo(null);
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
    setSelectedDim(null);
    setAnnouncement("Reset to the default example and theme.");
  }

  // ---- Render model (plain data → renderer input with icon nodes) ----
  const model: FlowModel = {
    title: data.title,
    subtitle: data.subtitle,
    steps: steps.map((s) => ({ ...s, icon: icons[s.icon] })),
    wheel: { ...data.wheel, dimensions: dims.map((d) => ({ ...d, icon: icons[d.icon] })) },
  };

  const slots: FlowSlots = {
    Text: EditorText,
    stepIcon: (step: FlowStep, i: number) => (
      <IconPicker
        value={steps[i].icon}
        componentName={`step ${i + 1}`}
        buttonClassName="mfe-node-button"
        onChange={(icon) => actions.updateStep(step.id, { icon })}
      />
    ),
    stepToolbar: (step: FlowStep, i: number) => (
      <div className="mfe-tools mfe-step-tools" role="group" aria-label={`Step ${i + 1} actions`}>
        <button type="button" data-action="earlier" aria-label={`Move step ${i + 1} earlier`} title="Move earlier" disabled={i === 0}
          onClick={() => { actions.moveStep(step.id, -1); setPendingButton(`[data-step="${step.id}"] [data-action="earlier"]`); setAnnouncement(`Step moved to position ${i}.`); }}>
          <Svg d={PATH.left} />
        </button>
        <button type="button" data-action="later" aria-label={`Move step ${i + 1} later`} title="Move later" disabled={i === steps.length - 1}
          onClick={() => { actions.moveStep(step.id, 1); setPendingButton(`[data-step="${step.id}"] [data-action="later"]`); setAnnouncement(`Step moved to position ${i + 2}.`); }}>
          <Svg d={PATH.right} />
        </button>
        <button type="button" data-action="insert" aria-label={`Add a step after step ${i + 1}`} title="Add step after" disabled={stepsAtMax} onClick={() => addStep(step.id)}>
          <Svg d={PATH.plus} />
        </button>
        <button type="button" data-action="delete" className="is-danger" aria-label={`Delete step ${i + 1}`}
          title={stepsAtMin ? `At least ${limits.minSteps} steps are needed` : "Delete step"} disabled={stepsAtMin} onClick={() => removeStep(steps[i])}>
          <Svg d={PATH.trash} />
        </button>
      </div>
    ),
    stepFooter: (step: FlowStep, i: number) =>
      steps[i].bullets.length < limits.maxBullets ? (
        <button
          type="button"
          className="te-add-inline mfe-add-point"
          onClick={() => {
            const at = actions.addBullet(step.id);
            if (at >= 0) setPendingFocus(`bullet:${step.id}:${at}`);
          }}
        >
          <Svg d={PATH.plus} /> Add point
        </button>
      ) : null,
    dimensionBadge: (d: FlowDimension, i: number) => {
      const bg = dims[i].color || dimRamp[i];
      return (
        <span className="mfe-badge-wrap" style={{ background: bg, color: readableOn(bg, "#ffffff", "#10202f", 3).fg }}>
          <IconPicker
            value={dims[i].icon}
            componentName={`dimension ${i + 1}`}
            buttonClassName="mfe-badge-button"
            badge={false}
            onChange={(icon) => actions.updateDimension(d.id, { icon })}
          />
        </span>
      );
    },
    dimensionToolbar: (d: FlowDimension, i: number) => {
      const current = dims[i].color || dimRamp[i];
      return (
        <div className="mfe-tools mfe-dim-tools" role="group" aria-label={`Dimension ${i + 1} actions`}>
          <label className="mfe-color" title="Dimension colour">
            <span className="mfe-color-swatch" style={{ background: current }} />
            <input
              type="color"
              aria-label={`Colour of dimension ${i + 1}`}
              value={current}
              onChange={(e) => actions.updateDimension(d.id, { color: e.target.value })}
            />
          </label>
          {dims[i].color && (
            <button type="button" data-action="auto-color" aria-label={`Use automatic colour for dimension ${i + 1}`} title="Automatic colour"
              onClick={() => actions.updateDimension(d.id, { color: null })}>
              <Svg d={PATH.close} />
            </button>
          )}
          <button type="button" data-action="up" aria-label={`Move dimension ${i + 1} up`} title="Move up" disabled={i === 0}
            onClick={() => { actions.moveDimension(d.id, -1); setPendingButton(`[data-dim="${d.id}"] [data-action="up"]`); }}>
            <Svg d={PATH.up} />
          </button>
          <button type="button" data-action="down" aria-label={`Move dimension ${i + 1} down`} title="Move down" disabled={i === dims.length - 1}
            onClick={() => { actions.moveDimension(d.id, 1); setPendingButton(`[data-dim="${d.id}"] [data-action="down"]`); }}>
            <Svg d={PATH.down} />
          </button>
          <button type="button" data-action="delete" className="is-danger" aria-label={`Delete dimension ${i + 1}`}
            title={dimsAtMin ? `At least ${limits.minDimensions} dimensions are needed` : "Delete dimension"} disabled={dimsAtMin}
            onClick={() => removeDimension(dims[i])}>
            <Svg d={PATH.trash} />
          </button>
        </div>
      );
    },
    legendFooter: () => (
      <button type="button" className="mfe-add" onClick={() => addDimension(selectedDim)} disabled={dimsAtMax}>
        <Svg d={PATH.plus} /> Add dimension
      </button>
    ),
  };

  const edVars = {
    "--ed-border": theme.panelBorder,
    "--ed-accent": theme.accent,
    "--ed-surface": theme.panel,
    "--ed-surface-raised": theme.panel,
    "--ed-text": theme.text,
    "--ed-text-muted": theme.textMuted,
    "--ed-focus": theme.focus,
    "--ed-selected-bg": theme.stepFrom,
    "--ed-selected-fg": readableOn(theme.stepFrom, "#ffffff", "#10202f", 3).fg,
    "--mfe-bg": theme.background,
    "--mfe-panel": theme.panel,
    "--mfe-text": theme.text,
    "--mfe-muted": theme.textMuted,
    "--mfe-heading": theme.heading,
    "--mfe-accent": theme.accent,
    "--mfe-kicker": theme.kicker,
  } as CSSProperties;

  return (
    <EditorCtx.Provider value={ctx}>
      <div ref={rootRef} className="ed-scope mfe" style={edVars} data-component="methodology-flow">
        <div className="mfe-toolbar" role="toolbar" aria-label="Structure">
          <div className="mfe-toolbar-group">
            <span className="mfe-count">
              <strong>{steps.length}</strong> steps <span>({limits.minSteps}–{limits.maxSteps})</span>
            </span>
            <button type="button" className="mfe-btn" data-action="add-step" onClick={() => addStep(null)} disabled={stepsAtMax}>
              <Svg d={PATH.plus} /> Add step
            </button>
          </div>
          <div className="mfe-toolbar-group">
            <span className="mfe-count">
              <strong>{dims.length}</strong> dimensions <span>({limits.minDimensions}–{limits.maxDimensions})</span>
            </span>
            <button type="button" className="mfe-btn" data-action="add-dimension" onClick={() => addDimension(null)} disabled={dimsAtMax}>
              <Svg d={PATH.plus} /> Add dimension
            </button>
          </div>
          <div className="mfe-toolbar-group mfe-toolbar-end">
            <span className={`mfe-saved ${saved ? "" : "is-error"}`}>
              <Svg d={saved ? PATH.check : PATH.close} />
              {saved ? "Saved in this browser" : "Changes cannot be saved in this browser"}
            </span>
            <button type="button" className={`te-link ${resetArmed ? "is-armed" : ""}`} data-action="reset" onClick={reset}>
              {resetArmed ? "Click again to reset" : "Reset to default"}
            </button>
          </div>
        </div>
        {undo && (
          <div className="mfe-toast">
            <span>
              {undo.kind === "step" ? "Step" : "Dimension"} “{undo.kind === "step" ? undo.removed.item.title : undo.removed.item.label}” removed.
            </span>
            <button type="button" className="te-link" onClick={undoRemove}>
              Undo
            </button>
          </div>
        )}
        <p className="mfe-visually-hidden" role="status" aria-live="polite">
          {announcement}
        </p>

        <MethodologyFlow
          model={model}
          theme={theme}
          typography={appearance.typography}
          placement={appearance.placement}
          dimensionContent={appearance.dimensionContent}
          selectedDimensionId={selectedDim}
          onSelectDimension={setSelectedDim}
          slots={slots}
        />

        <AppearancePanel appearance={appearance} theme={theme} onChange={look.set} onReset={look.reset} />
      </div>
    </EditorCtx.Provider>
  );
}
