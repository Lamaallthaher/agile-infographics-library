import { useEffect, useId, useState } from "react";
import { DEFAULT_PRIMARY, IconPicker, normalizeHex, rgbToHex, THEME_PRESETS, ThemeColorControl } from "@agile-infographics/core";
import {
  CATEGORY_LABELS,
  checkProcessContrast,
  GROUP_CATEGORIES,
  isSafeHref,
  LEVEL_NAMES,
  normalizeProcessArchitecture,
  PROCESS_OVERRIDE_KEYS,
  PROCESS_OVERRIDE_LABELS,
  PROCESS_STATUSES,
  PROCESS_VIEWS,
  VIEW_LABELS,
  STATUS_LABELS,
  TITLE_WEIGHTS,
  TYPE_SCALES,
  type GroupCategory,
  type NodeData,
  type ProcessAppearance,
  type ProcessArchitectureData,
  type ProcessArchitectureLimits,
  type ProcessGroup,
  type ProcessIssue,
  type ProcessLevel,
  type ProcessOverrideKey,
  type ProcessStatus,
  type ProcessTheme,
} from "../renderer";
import type { NodePatch } from "./useProcessArchitecture";

/** Any CSS colour we generate (#hex or rgba()) → #rrggbb for <input type="color">. */
export function toHex(value: string): string {
  const n = normalizeHex(value);
  if (n) return n;
  const m = value.match(/rgba?\(([^)]+)\)/);
  if (!m) return "#000000";
  const [r, g, b] = m[1].split(",").map((x) => parseFloat(x) / 255);
  return rgbToHex({ r, g, b });
}

export function Segmented<T extends string | number | boolean>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="pae-field">
      <span className="pae-field-label">{label}</span>
      <div className="pae-segmented" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Appearance
 * ------------------------------------------------------------------------- */

export interface ProcessAppearancePanelProps {
  appearance: ProcessAppearance;
  theme: ProcessTheme;
  onChange: (patch: Partial<ProcessAppearance>) => void;
  onReset: () => void;
}

export function ProcessAppearancePanel({ appearance: a, theme, onChange, onReset }: ProcessAppearancePanelProps) {
  const id = useId();
  const failing = checkProcessContrast(theme).filter((c) => !c.passes);
  const overrides = a.overrides;
  const setOverride = (key: ProcessOverrideKey, value: string | null) => {
    const next = { ...overrides };
    if (value) next[key] = value;
    else delete next[key];
    onChange({ overrides: next });
  };
  const secondaryValue = toHex(a.secondary ?? theme.selected);

  return (
    <section className="pae-panel" aria-labelledby={`${id}-h`} data-panel="appearance">
      <div className="pae-panel-head">
        <h3 id={`${id}-h`}>Appearance</h3>
        <button type="button" className="te-link" onClick={onReset}>
          Reset appearance
        </button>
      </div>
      <div className="pae-grid">
        <div className="pae-field pae-field-wide">
          <span className="pae-field-label">Theme presets</span>
          <div className="pae-segmented" role="group" aria-label="Theme presets">
            {THEME_PRESETS.map((p) => (
              <button key={p.id} type="button" className="pae-preset" aria-pressed={a.preset === p.id} onClick={() => onChange({ base: p.base, preset: p.id })}>
                <span className="pae-dot" style={{ background: p.base }} />
                {p.name}
              </button>
            ))}
          </div>
        </div>
        <div className="pae-field">
          <ThemeColorControl
            value={a.base}
            isDefault={a.base === DEFAULT_PRIMARY}
            onChange={(hex) => onChange({ base: hex, preset: THEME_PRESETS.find((p) => p.base === hex)?.id ?? null })}
            onReset={() => onChange({ base: DEFAULT_PRIMARY, preset: "navy" })}
          />
          <p className="te-hint">Primary colour: the whole palette is generated from it.</p>
        </div>
        <div className="pae-field">
          <span className="pae-field-label">Secondary colour</span>
          <div className="pae-inline">
            <label className="pae-color" title="Secondary colour">
              <span className="pae-swatch" style={{ background: secondaryValue }} />
              <input type="color" aria-label="Secondary colour" value={secondaryValue} onChange={(e) => onChange({ secondary: e.target.value })} />
            </label>
            {a.secondary ? (
              <button type="button" className="te-link" onClick={() => onChange({ secondary: null })}>
                Automatic
              </button>
            ) : (
              <span className="pae-muted">automatic</span>
            )}
          </div>
          <p className="te-hint">Accents, activity numbers and the last core group.</p>
        </div>
        <Segmented label="Colour scheme" value={a.scheme} options={[{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }]} onChange={(scheme) => onChange({ scheme })} />
        <Segmented
          label="Opening view"
          value={a.defaultView}
          options={PROCESS_VIEWS.map((v) => ({ value: v, label: VIEW_LABELS[v] }))}
          onChange={(defaultView) => onChange({ defaultView })}
        />
        <Segmented
          label="Navigation"
          value={a.navigation}
          options={[
            { value: "cascade", label: "All levels" },
            { value: "focus", label: "One level at a time" },
          ]}
          onChange={(navigation) => onChange({ navigation })}
        />
        <Segmented
          label="Process groups"
          value={a.groupShape}
          options={[
            { value: "chevron", label: "Chevrons" },
            { value: "block", label: "Blocks" },
          ]}
          onChange={(groupShape) => onChange({ groupShape })}
        />
        <Segmented
          label="Groups start"
          value={a.expandDefault}
          options={[
            { value: "collapsed", label: "Collapsed" },
            { value: "expanded", label: "Expanded" },
          ]}
          onChange={(expandDefault) => onChange({ expandDefault })}
        />
        <Segmented
          label="Activities"
          value={a.activityLayout}
          options={[
            { value: "flow", label: "Flow" },
            { value: "list", label: "Timeline" },
          ]}
          onChange={(activityLayout) => onChange({ activityLayout })}
        />
        <Segmented
          label="Cards"
          value={a.cardStyle}
          options={[
            { value: "accent", label: "Accent bar" },
            { value: "filled", label: "Filled" },
            { value: "outline", label: "Outline" },
          ]}
          onChange={(cardStyle) => onChange({ cardStyle })}
        />
        <Segmented
          label="Corners"
          value={a.radius}
          options={[
            { value: "square", label: "Square" },
            { value: "soft", label: "Soft" },
            { value: "round", label: "Round" },
          ]}
          onChange={(radius) => onChange({ radius })}
        />
        <Segmented
          label="Spacing"
          value={a.density}
          options={[
            { value: "compact", label: "Compact" },
            { value: "comfortable", label: "Comfortable" },
            { value: "spacious", label: "Spacious" },
          ]}
          onChange={(density) => onChange({ density })}
        />
        <Segmented label="Text size" value={a.typography.scale} options={TYPE_SCALES} onChange={(scale) => onChange({ typography: { ...a.typography, scale } })} />
        <Segmented
          label="Heading weight"
          value={a.typography.titleWeight}
          options={TITLE_WEIGHTS}
          onChange={(titleWeight) => onChange({ typography: { ...a.typography, titleWeight } })}
        />
        <Segmented
          label="Numbering"
          value={a.numbering}
          options={[
            { value: true, label: "1.2.3" },
            { value: false, label: "Off" },
          ]}
          onChange={(numbering) => onChange({ numbering })}
        />
      </div>
      <details className="pae-details">
        <summary>
          Advanced colours
          {Object.keys(overrides).length > 0 && <span className="pae-badge">{Object.keys(overrides).length} customised</span>}
        </summary>
        <p className="te-hint">Override individual colours. Text that you do not override is re-checked automatically for readability.</p>
        <div className="pae-overrides">
          {PROCESS_OVERRIDE_KEYS.map((key) => {
            const custom = overrides[key];
            const current = toHex(custom ?? theme[key]);
            return (
              <div key={key} className={`pae-override ${custom ? "is-custom" : ""}`} data-override={key}>
                <label className="pae-color">
                  <span className="pae-swatch" style={{ background: current }} />
                  <input type="color" aria-label={`${PROCESS_OVERRIDE_LABELS[key]} colour`} value={current} onChange={(e) => setOverride(key, e.target.value)} />
                </label>
                <span className="pae-override-name">{PROCESS_OVERRIDE_LABELS[key]}</span>
                {custom ? (
                  <button type="button" className="te-link" onClick={() => setOverride(key, null)} aria-label={`Use automatic ${PROCESS_OVERRIDE_LABELS[key]} colour`}>
                    Auto
                  </button>
                ) : (
                  <span className="pae-muted">auto</span>
                )}
              </div>
            );
          })}
        </div>
      </details>
      <div className={`pae-report ${failing.length ? "has-warnings" : ""}`} role="status">
        {failing.length === 0 ? (
          <span>✓ All text meets WCAG AA contrast (4.5:1).</span>
        ) : (
          <>
            <span>⚠ Some text may be hard to read:</span>
            <ul>
              {failing.map((c) => (
                <li key={c.name}>
                  {c.name}: {c.ratio.toFixed(1)}:1 (needs {c.min}:1)
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
 * Inspector for the selected node
 * ------------------------------------------------------------------------- */

/** A text input committed as you type; links are validated before they are saved. */
function TextInput({ label, value, max, placeholder, onCommit, validate }: { label: string; value: string; max: number; placeholder?: string; onCommit: (v: string) => void; validate?: (v: string) => string | null }) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  // Follow outside changes (another node selected, import, reset) but never rewrite what is being typed.
  useEffect(() => {
    if (!focused) setDraft(value);
  }, [value, focused]);
  const error = validate && draft.trim() ? validate(draft) : null;
  return (
    <div className="pae-field">
      <label className="pae-field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={`pae-input ${error ? "is-invalid" : ""}`}
        type="text"
        maxLength={max}
        placeholder={placeholder}
        value={draft}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          setDraft(e.target.value);
          const v = e.target.value;
          if (!validate || !v.trim() || !validate(v)) onCommit(v);
        }}
      />
      {error && (
        <p id={`${id}-err`} className="te-hint te-hint-error">
          {error}
        </p>
      )}
    </div>
  );
}

export interface NodeInspectorProps {
  level: ProcessLevel;
  node: NodeData;
  /** Display number or code of the node. */
  code: string;
  limits: ProcessArchitectureLimits;
  /** Current colour of a group (custom or from the theme). */
  groupColor?: string;
  onChange: (patch: NodePatch) => void;
}

/** Structured fields of the selected node: owner, status, tags, code and link; category, icon and colour for groups. */
export function NodeInspector({ level, node, code, limits, groupColor, onChange }: NodeInspectorProps) {
  const id = useId();
  const L = limits.maxLength;
  const group = level === 1 ? (node as ProcessGroup) : null;
  return (
    <section className="pae-panel" aria-labelledby={`${id}-h`} data-inspector={node.id} data-inspector-level={level}>
      <div className="pae-panel-head">
        <h3 id={`${id}-h`}>
          <span className="pae-muted">
            L{level} {LEVEL_NAMES[level]} {code}
          </span>{" "}
          <span className="pae-name">{node.title || "Untitled"}</span>
        </h3>
        <span className="pae-muted">Title and description are edited on the map.</span>
      </div>
      <div className="pae-grid" key={node.id}>
        <TextInput label="Owner or responsible role" value={node.owner} max={L.owner} placeholder="For example: Service owner" onCommit={(owner) => onChange({ owner })} />
        <Segmented<ProcessStatus> label="Status" value={node.status} options={PROCESS_STATUSES.map((s) => ({ value: s, label: s ? STATUS_LABELS[s] : "None" }))} onChange={(status) => onChange({ status })} />
        <TextInput
          label={`Tags (comma-separated, up to ${limits.maxTags})`}
          value={node.tags.join(", ")}
          max={limits.maxTags * (L.tag + 2)}
          placeholder="For example: ITIL, Customer-facing"
          onCommit={(v) => onChange({ tags: v.split(",").map((t) => t.trim()).filter(Boolean) })}
        />
        <TextInput label="Code (replaces the automatic number)" value={node.code} max={L.code} placeholder="For example: SM-02" onCommit={(c) => onChange({ code: c.trim() })} />
        <TextInput
          label="Link (optional)"
          value={node.href}
          max={L.href}
          placeholder="https://…"
          validate={(v) => (isSafeHref(v) ? null : "Use an https://, http:// or mailto: link, a /path or a #anchor.")}
          onCommit={(href) => onChange({ href: href.trim() })}
        />
        {group && (
          <>
            <Segmented<GroupCategory> label="Category" value={group.category} options={GROUP_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))} onChange={(category) => onChange({ category })} />
            <div className="pae-field">
              <span className="pae-field-label">Group colour</span>
              <div className="pae-inline">
                <label className="pae-color" title="Group colour">
                  <span className="pae-swatch" style={{ background: groupColor }} />
                  <input type="color" aria-label="Group colour" value={toHex(groupColor ?? "#000000")} onChange={(e) => onChange({ color: e.target.value })} />
                </label>
                {group.color ? (
                  <button type="button" className="te-link" onClick={() => onChange({ color: null })}>
                    Theme colour
                  </button>
                ) : (
                  <span className="pae-muted">theme colour</span>
                )}
              </div>
            </div>
            <div className="pae-field">
              <span className="pae-field-label">Group icon</span>
              <div className="pae-inline">
                <span className={`pae-icon-wrap ${group.icon ? "" : "is-empty"}`}>
                  <IconPicker value={group.icon ?? "target"} componentName={`group ${group.title}`} buttonClassName="pae-icon-button" badge={false} onChange={(icon) => onChange({ icon })} />
                </span>
                {group.icon ? (
                  <button type="button" className="te-link" onClick={() => onChange({ icon: null })}>
                    No icon
                  </button>
                ) : (
                  <span className="pae-muted">none</span>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
 * JSON import / export
 * ------------------------------------------------------------------------- */

export interface ProcessDataPanelProps {
  data: ProcessArchitectureData;
  limits: ProcessArchitectureLimits;
  onImport: (data: ProcessArchitectureData) => void;
}

export function ProcessDataPanel({ data, limits, onImport }: ProcessDataPanelProps) {
  const id = useId();
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string; issues: ProcessIssue[] } | null>(null);
  const json = JSON.stringify(data, null, 2);

  function apply() {
    let raw: unknown;
    try {
      raw = JSON.parse(draft);
    } catch (e) {
      setResult({ ok: false, message: `Not valid JSON: ${(e as Error).message}`, issues: [] });
      return;
    }
    const { data: next, issues } = normalizeProcessArchitecture(raw, limits);
    if (!next) {
      setResult({ ok: false, message: "The data was not imported:", issues: issues.filter((i) => i.level === "error") });
      return;
    }
    onImport(next);
    const warnings = issues.filter((i) => i.level === "warning");
    setResult({
      ok: true,
      message: `Imported ${next.valueChains.length} value chain${next.valueChains.length === 1 ? "" : "s"}${warnings.length ? ` with ${warnings.length} correction${warnings.length === 1 ? "" : "s"}:` : "."}`,
      issues: warnings,
    });
    setDraft("");
  }

  return (
    <details className="pae-panel pae-details" data-panel="data">
      <summary>Data (JSON import / export)</summary>
      <div className="pae-grid pae-grid-wide">
        <div className="pae-field">
          <label className="pae-field-label" htmlFor={`${id}-export`}>
            Current content
          </label>
          <textarea id={`${id}-export`} className="pae-code" readOnly rows={10} value={json} />
        </div>
        <div className="pae-field">
          <label className="pae-field-label" htmlFor={`${id}-import`}>
            Import (replaces the current content)
          </label>
          <textarea
            id={`${id}-import`}
            className="pae-code"
            rows={10}
            spellCheck={false}
            placeholder='{ "valueChains": [ { "id": "…", "title": "…", "groups": [ … ] } ] }'
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="pae-inline">
            <button type="button" className="pae-btn" data-action="import" onClick={apply} disabled={!draft.trim()}>
              Validate and import
            </button>
          </div>
        </div>
      </div>
      <div className={`pae-report ${result ? (result.ok ? "is-ok" : "has-warnings") : ""}`} role="status" aria-live="polite">
        {result && (
          <>
            <p>{result.message}</p>
            {result.issues.length > 0 && (
              <ul>
                {result.issues.slice(0, 12).map((i, n) => (
                  <li key={n}>
                    {i.path && <code>{i.path}</code>} {i.message}
                  </li>
                ))}
                {result.issues.length > 12 && <li>… and {result.issues.length - 12} more</li>}
              </ul>
            )}
          </>
        )}
      </div>
    </details>
  );
}
