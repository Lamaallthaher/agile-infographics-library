import { useId } from "react";
import {
  checkThemeContrast,
  OVERRIDE_KEYS,
  OVERRIDE_LABELS,
  type MethodologyTheme,
  type OverrideKey,
} from "../renderer";
import { DEFAULT_PRIMARY, normalizeHex, rgbToHex, THEME_PRESETS } from "@agile-infographics/core";
import { ThemeColorControl } from "@agile-infographics/core";
import { TITLE_WEIGHTS, TYPE_SCALES, type MethodologyAppearance } from "./types";

/** Any CSS colour we generate (#hex or rgba()) → #rrggbb for <input type="color">. */
function toHex(value: string): string {
  const n = normalizeHex(value);
  if (n) return n;
  const m = value.match(/rgba?\(([^)]+)\)/);
  if (!m) return "#000000";
  const [r, g, b] = m[1].split(",").map((x) => parseFloat(x) / 255);
  return rgbToHex({ r, g, b });
}

function Segmented<T extends string | number>({
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
    <div className="mfe-field">
      <span className="mfe-field-label">{label}</span>
      <div className="mfe-segmented" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export interface AppearancePanelProps {
  appearance: MethodologyAppearance;
  /** The resolved theme (used to show current colours and contrast). */
  theme: MethodologyTheme;
  onChange: (patch: Partial<MethodologyAppearance>) => void;
  onReset: () => void;
}

/** Theme presets, custom base colour, per-colour overrides, typography and layout. */
export function AppearancePanel({ appearance, theme, onChange, onReset }: AppearancePanelProps) {
  const id = useId();
  const checks = checkThemeContrast(theme);
  const failing = checks.filter((c) => !c.passes);
  const overrides = appearance.overrides;
  const setOverride = (key: OverrideKey, value: string | null) => {
    const next = { ...overrides };
    if (value) next[key] = value;
    else delete next[key];
    onChange({ overrides: next });
  };

  return (
    <section className="mfe-appearance" aria-labelledby={`${id}-h`}>
      <div className="mfe-appearance-head">
        <h3 id={`${id}-h`}>Appearance</h3>
        <button type="button" className="te-link" onClick={onReset}>
          Reset appearance
        </button>
      </div>

      <div className="mfe-appearance-grid">
        <div className="mfe-field mfe-field-wide">
          <span className="mfe-field-label">Theme presets</span>
          <div className="mfe-presets" role="group" aria-label="Theme presets">
            {THEME_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className="mfe-preset"
                aria-pressed={appearance.preset === p.id}
                onClick={() => onChange({ base: p.base, preset: p.id })}
              >
                <span className="mfe-preset-dot" style={{ background: p.base }} />
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mfe-field">
          <ThemeColorControl
            value={appearance.base}
            isDefault={appearance.base === DEFAULT_PRIMARY}
            onChange={(hex) => onChange({ base: hex, preset: THEME_PRESETS.find((p) => p.base === hex)?.id ?? null })}
            onReset={() => onChange({ base: DEFAULT_PRIMARY, preset: "navy" })}
          />
          <p className="te-hint">Any colour: the whole palette is generated from it.</p>
        </div>

        <Segmented
          label="Text size"
          value={appearance.typography.scale}
          options={TYPE_SCALES}
          onChange={(scale) => onChange({ typography: { ...appearance.typography, scale } })}
        />
        <Segmented
          label="Heading weight"
          value={appearance.typography.titleWeight}
          options={TITLE_WEIGHTS}
          onChange={(titleWeight) => onChange({ typography: { ...appearance.typography, titleWeight } })}
        />
        <Segmented
          label="Step text alignment"
          value={appearance.typography.align}
          options={[
            { value: "left", label: "Left" },
            { value: "center", label: "Centre" },
          ]}
          onChange={(align) => onChange({ typography: { ...appearance.typography, align } })}
        />
        <Segmented
          label="Step text position"
          value={appearance.placement}
          options={[
            { value: "alternate", label: "Alternate" },
            { value: "above", label: "Above" },
            { value: "below", label: "Below" },
          ]}
          onChange={(placement) => onChange({ placement })}
        />
        <Segmented
          label="Dimension nodes"
          value={appearance.dimensionContent}
          options={[
            { value: "number", label: "Numbers" },
            { value: "icon", label: "Icons" },
          ]}
          onChange={(dimensionContent) => onChange({ dimensionContent })}
        />
      </div>

      <details className="mfe-advanced">
        <summary>
          Advanced colours
          {Object.keys(overrides).length > 0 && <span className="mfe-badge">{Object.keys(overrides).length} customised</span>}
        </summary>
        <p className="te-hint">
          Override individual colours. Text that you do not override is re-checked automatically for readability.
        </p>
        <div className="mfe-overrides">
          {OVERRIDE_KEYS.map((key) => {
            const custom = overrides[key];
            const current = toHex(custom ?? theme[key]);
            return (
              <div key={key} className={`mfe-override ${custom ? "is-custom" : ""}`} data-override={key}>
                <label className="mfe-color">
                  <span className="mfe-color-swatch" style={{ background: current }} />
                  <input type="color" aria-label={`${OVERRIDE_LABELS[key]} colour`} value={current} onChange={(e) => setOverride(key, e.target.value)} />
                </label>
                <span className="mfe-override-name">{OVERRIDE_LABELS[key]}</span>
                {custom ? (
                  <button type="button" className="te-link" onClick={() => setOverride(key, null)} aria-label={`Use automatic ${OVERRIDE_LABELS[key]} colour`}>
                    Auto
                  </button>
                ) : (
                  <span className="mfe-auto">auto</span>
                )}
              </div>
            );
          })}
        </div>
      </details>

      <div className={`mfe-contrast ${failing.length ? "has-warnings" : ""}`} role="status">
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
