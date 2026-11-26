import { useId } from "react";
import { DEFAULT_PRIMARY, normalizeHex, rgbToHex, THEME_PRESETS, ThemeColorControl } from "@agile-infographics/core";
import {
  checkEcosystemContrast,
  COLLAPSE_OPTIONS,
  ECOSYSTEM_OVERRIDE_KEYS,
  ECOSYSTEM_OVERRIDE_LABELS,
  TITLE_WEIGHTS,
  TYPE_SCALES,
  type CenterStyle,
  type EcosystemAppearance,
  type EcosystemOverrideKey,
  type EcosystemTheme,
} from "../renderer";

/** Any CSS colour we generate (#hex or rgba()) → #rrggbb for <input type="color">. */
function toHex(value: string): string {
  const n = normalizeHex(value);
  if (n) return n;
  const m = value.match(/rgba?\(([^)]+)\)/);
  if (!m) return "#000000";
  const [r, g, b] = m[1].split(",").map((x) => parseFloat(x) / 255);
  return rgbToHex({ r, g, b });
}

export function Segmented<T extends string | number>({
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
    <div className="eme-field">
      <span className="eme-field-label">{label}</span>
      <div className="eme-segmented" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export interface EcosystemAppearancePanelProps {
  appearance: EcosystemAppearance;
  /** The resolved theme (used to show current colours and contrast). */
  theme: EcosystemTheme;
  onChange: (patch: Partial<EcosystemAppearance>) => void;
  onReset: () => void;
  /** The centre's style is part of the content; shown here because it is visual. */
  centerStyle: CenterStyle;
  onCenterStyle: (style: CenterStyle) => void;
}

/** Theme, colours, card and connector style, layout, spacing and typography. */
export function EcosystemAppearancePanel({ appearance: a, theme, onChange, onReset, centerStyle, onCenterStyle }: EcosystemAppearancePanelProps) {
  const id = useId();
  const checks = checkEcosystemContrast(theme);
  const failing = checks.filter((c) => !c.passes);
  const overrides = a.overrides;
  const setOverride = (key: EcosystemOverrideKey, value: string | null) => {
    const next = { ...overrides };
    if (value) next[key] = value;
    else delete next[key];
    onChange({ overrides: next });
  };
  const secondaryValue = toHex(a.secondary ?? theme.connectorActive);

  return (
    <section className="eme-appearance" aria-labelledby={`${id}-h`}>
      <div className="eme-panel-head">
        <h3 id={`${id}-h`}>Appearance</h3>
        <button type="button" className="te-link" onClick={onReset}>
          Reset appearance
        </button>
      </div>

      <div className="eme-grid">
        <div className="eme-field eme-field-wide">
          <span className="eme-field-label">Theme presets</span>
          <div className="eme-presets" role="group" aria-label="Theme presets">
            {THEME_PRESETS.map((p) => (
              <button key={p.id} type="button" className="eme-preset" aria-pressed={a.preset === p.id} onClick={() => onChange({ base: p.base, preset: p.id })}>
                <span className="eme-preset-dot" style={{ background: p.base }} />
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div className="eme-field">
          <ThemeColorControl
            value={a.base}
            isDefault={a.base === DEFAULT_PRIMARY}
            onChange={(hex) => onChange({ base: hex, preset: THEME_PRESETS.find((p) => p.base === hex)?.id ?? null })}
            onReset={() => onChange({ base: DEFAULT_PRIMARY, preset: "navy" })}
          />
          <p className="te-hint">Primary colour: the whole palette is generated from it.</p>
        </div>

        <div className="eme-field">
          <span className="eme-field-label">Secondary colour</span>
          <div className="eme-inline">
            <label className="eme-color" title="Secondary colour">
              <span className="eme-color-swatch" style={{ background: secondaryValue }} />
              <input type="color" aria-label="Secondary colour" value={secondaryValue} onChange={(e) => onChange({ secondary: e.target.value })} />
            </label>
            {a.secondary ? (
              <button type="button" className="te-link" onClick={() => onChange({ secondary: null })}>
                Automatic
              </button>
            ) : (
              <span className="eme-auto">automatic</span>
            )}
          </div>
          <p className="te-hint">Accents, connectors and the last group colour.</p>
        </div>

        <Segmented
          label="Colour scheme"
          value={a.scheme}
          options={[
            { value: "dark", label: "Dark" },
            { value: "light", label: "Light" },
          ]}
          onChange={(scheme) => onChange({ scheme })}
        />
        <Segmented
          label="Layout"
          value={a.layout}
          options={[
            { value: "auto", label: "Automatic" },
            { value: "radial", label: "Around centre" },
            { value: "columns", label: "Two columns" },
            { value: "stack", label: "One column" },
          ]}
          onChange={(layout) => onChange({ layout })}
        />
        <Segmented
          label="Connectors"
          value={a.connector}
          options={[
            { value: "curved", label: "Curved" },
            { value: "elbow", label: "Elbow" },
            { value: "straight", label: "Straight" },
          ]}
          onChange={(connector) => onChange({ connector })}
        />
        <Segmented
          label="Centre style"
          value={centerStyle}
          options={[
            { value: "rings", label: "Segmented ring" },
            { value: "solid", label: "Solid" },
            { value: "outline", label: "Outline" },
          ]}
          onChange={onCenterStyle}
        />
        <Segmented
          label="Centre size"
          value={a.centerSize}
          options={[
            { value: "s", label: "S" },
            { value: "m", label: "M" },
            { value: "l", label: "L" },
          ]}
          onChange={(centerSize) => onChange({ centerSize })}
        />
        <Segmented
          label="Group cards"
          value={a.cardStyle}
          options={[
            { value: "accent", label: "Accent bar" },
            { value: "filled", label: "Filled" },
            { value: "outline", label: "Outline" },
          ]}
          onChange={(cardStyle) => onChange({ cardStyle })}
        />
        <Segmented
          label="Group colours"
          value={a.groupColoring}
          options={[
            { value: "uniform", label: "One colour" },
            { value: "ramp", label: "Progressive" },
          ]}
          onChange={(groupColoring) => onChange({ groupColoring })}
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
        <Segmented
          label="Text size"
          value={a.typography.scale}
          options={TYPE_SCALES}
          onChange={(scale) => onChange({ typography: { ...a.typography, scale } })}
        />
        <Segmented
          label="Heading weight"
          value={a.typography.titleWeight}
          options={TITLE_WEIGHTS}
          onChange={(titleWeight) => onChange({ typography: { ...a.typography, titleWeight } })}
        />
        <Segmented label="Collapse groups after" value={a.collapseAfter} options={COLLAPSE_OPTIONS} onChange={(collapseAfter) => onChange({ collapseAfter })} />
        <Segmented
          label="Item details"
          value={a.itemDetails}
          options={[
            { value: "always", label: "Always" },
            { value: "selected", label: "Selected group" },
          ]}
          onChange={(itemDetails) => onChange({ itemDetails })}
        />
        <Segmented
          label="Direction arrows"
          value={a.connectorArrows ? "on" : "off"}
          options={[
            { value: "off", label: "Off" },
            { value: "on", label: "On" },
          ]}
          onChange={(v) => onChange({ connectorArrows: v === "on" })}
        />
      </div>

      <details className="eme-advanced">
        <summary>
          Advanced colours
          {Object.keys(overrides).length > 0 && <span className="eme-badge">{Object.keys(overrides).length} customised</span>}
        </summary>
        <p className="te-hint">Override individual colours. Text that you do not override is re-checked automatically for readability.</p>
        <div className="eme-overrides">
          {ECOSYSTEM_OVERRIDE_KEYS.map((key) => {
            const custom = overrides[key];
            const current = toHex(custom ?? theme[key]);
            return (
              <div key={key} className={`eme-override ${custom ? "is-custom" : ""}`} data-override={key}>
                <label className="eme-color">
                  <span className="eme-color-swatch" style={{ background: current }} />
                  <input type="color" aria-label={`${ECOSYSTEM_OVERRIDE_LABELS[key]} colour`} value={current} onChange={(e) => setOverride(key, e.target.value)} />
                </label>
                <span className="eme-override-name">{ECOSYSTEM_OVERRIDE_LABELS[key]}</span>
                {custom ? (
                  <button type="button" className="te-link" onClick={() => setOverride(key, null)} aria-label={`Use automatic ${ECOSYSTEM_OVERRIDE_LABELS[key]} colour`}>
                    Auto
                  </button>
                ) : (
                  <span className="eme-auto">auto</span>
                )}
              </div>
            );
          })}
        </div>
      </details>

      <div className={`eme-contrast ${failing.length ? "has-warnings" : ""}`} role="status">
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
