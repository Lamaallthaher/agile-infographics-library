import { useEffect, useId, useState } from "react";
import { normalizeHex } from "../library/theme-generator";

export interface ThemeColorControlProps {
  /** Current primary colour (#rrggbb). */
  value: string;
  onChange: (hex: string) => void;
  /** Restores the default colour; the button is hidden when already default. */
  onReset?: () => void;
  isDefault?: boolean;
}

/**
 * Primary theme colour: a native colour picker (any colour) plus a HEX field.
 * Valid input applies immediately; invalid HEX is flagged and never applied.
 */
export function ThemeColorControl({ value, onChange, onReset, isDefault }: ThemeColorControlProps) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const invalid = draft.trim() !== "" && !normalizeHex(draft);

  // Follow external changes (picker, reset) unless the user is typing.
  useEffect(() => {
    if (!focused) setDraft(value);
  }, [value, focused]);

  return (
    <div className="te-theme">
      <label className="te-theme-label" htmlFor={`${id}-hex`}>
        Theme colour
      </label>
      <div className="te-theme-row">
        <span className="te-swatch" style={{ background: value }}>
          <input
            type="color"
            className="te-swatch-input"
            aria-label="Pick theme colour"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </span>
        <input
          id={`${id}-hex`}
          className={`te-hex ${invalid ? "is-invalid" : ""}`}
          type="text"
          inputMode="text"
          spellCheck={false}
          autoComplete="off"
          maxLength={7}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-err` : undefined}
          value={draft}
          onFocus={() => setFocused(true)}
          onChange={(e) => {
            setDraft(e.target.value);
            // Apply live only once a full 6-digit HEX is typed (no flashing intermediate colours).
            const n = normalizeHex(e.target.value);
            if (n && /^#?[0-9a-f]{6}$/i.test(e.target.value.trim())) onChange(n);
          }}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          onBlur={() => {
            // Short forms such as #f80 are applied when leaving the field.
            const n = normalizeHex(draft);
            if (n && n !== value) onChange(n);
            setFocused(false);
            setDraft(n ?? value);
          }}
        />
        {onReset && !isDefault && (
          <button type="button" className="te-link" onClick={onReset}>
            Default colour
          </button>
        )}
      </div>
      {invalid && (
        <p id={`${id}-err`} className="te-hint te-hint-error">
          Enter a HEX colour such as #1f4670.
        </p>
      )}
    </div>
  );
}
