import { useEffect, useId, useRef, useState } from "react";
import { ICON_KEYS, ICON_NAMES, icons, type IconKey } from "../icons";
import "./editing.css";

function Glyph({ icon }: { icon: IconKey }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {icons[icon]}
    </svg>
  );
}

export interface IconPickerProps {
  value: IconKey;
  onChange: (icon: IconKey) => void;
  /** Name of the item the icon belongs to (used in the button's accessible name). */
  componentName: string;
  /** Icons offered in the grid (default: the whole registry). */
  options?: readonly IconKey[];
  /** Extra class for the trigger button (e.g. to style it as a node). */
  buttonClassName?: string;
  /** Show the small pencil badge on the trigger (default true). */
  badge?: boolean;
}

/** An icon tile that doubles as a button opening a small icon grid. */
export function IconPicker({
  value,
  onChange,
  componentName,
  options = ICON_KEYS,
  buttonClassName = "sw-details-icon",
  badge = true,
}: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    // Focus the current icon when the grid opens.
    rootRef.current?.querySelector<HTMLButtonElement>(".te-icon-option.is-current")?.focus();
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function close(refocus = true) {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  }

  return (
    <div className="te-icon-picker" ref={rootRef} onKeyDown={(e) => e.key === "Escape" && open && (e.stopPropagation(), close())}>
      <button
        ref={buttonRef}
        type="button"
        className={`${buttonClassName} te-icon-button`}
        aria-label={`Change icon for ${componentName} (current: ${ICON_NAMES[value]})`}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        title="Change icon"
        onClick={() => setOpen((o) => !o)}
      >
        <Glyph icon={value} />
        {badge && (
          <span className="te-icon-badge" aria-hidden="true">
            <svg viewBox="0 0 16 16">
              <path d="M10.5 2.5 13.5 5.5 6 13H3v-3Z" />
            </svg>
          </span>
        )}
      </button>
      {open && (
        <div className="te-icon-menu" id={menuId} role="group" aria-label="Choose an icon">
          {options.map((key) => (
            <button
              key={key}
              type="button"
              className={`te-icon-option ${key === value ? "is-current" : ""}`}
              aria-label={ICON_NAMES[key]}
              aria-pressed={key === value}
              title={ICON_NAMES[key]}
              onClick={() => {
                onChange(key);
                close();
              }}
            >
              <Glyph icon={key} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
