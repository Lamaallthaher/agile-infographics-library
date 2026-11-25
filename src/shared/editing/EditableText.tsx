import { useEffect, useLayoutEffect, useRef, type KeyboardEvent, type Ref } from "react";
import "./editing.css";

export interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  /** Accessible name (the field has no visible label; the text itself is the content). */
  label: string;
  placeholder?: string;
  /** Allow line breaks (Enter inserts a new line). Otherwise Enter finishes editing. */
  multiline?: boolean;
  /** When true, an empty value is reverted to the last non-empty value on blur. */
  required?: boolean;
  maxLength?: number;
  className?: string;
  /** Single-line only: called on Enter instead of just finishing editing. */
  onEnter?: () => void;
  /** Called when Backspace is pressed in an empty field. */
  onBackspaceEmpty?: () => void;
  inputRef?: Ref<HTMLTextAreaElement>;
}

/**
 * Text that is always editable in place: it looks like normal text, shows a
 * subtle outline on hover and becomes a field on focus. No separate edit mode.
 * Implemented as an auto-growing <textarea> so long text wraps naturally.
 */
export function EditableText({
  value,
  onChange,
  label,
  placeholder,
  multiline = false,
  required = false,
  maxLength,
  className = "",
  onEnter,
  onBackspaceEmpty,
  inputRef,
}: EditableTextProps) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const lastValid = useRef(value);
  if (value.trim()) lastValid.current = value;

  // Auto-grow to fit the content.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  });

  // Re-fit when the field's width changes without a re-render (responsive layouts).
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let lastWidth = el.clientWidth;
    let frame = 0;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === lastWidth) return;
      lastWidth = el.clientWidth;
      // Adjust on the next frame so the height change does not re-trigger this observer in the same frame.
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
      });
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !multiline) {
      event.preventDefault();
      if (onEnter) onEnter();
      else event.currentTarget.blur();
    } else if (event.key === "Escape") {
      event.currentTarget.blur();
    } else if (event.key === "Backspace" && value === "" && onBackspaceEmpty) {
      event.preventDefault();
      onBackspaceEmpty();
    }
  }

  return (
    <textarea
      ref={(el) => {
        ref.current = el;
        if (typeof inputRef === "function") inputRef(el);
        else if (inputRef) (inputRef as { current: HTMLTextAreaElement | null }).current = el;
      }}
      className={`te-field ${className}`.trim()}
      value={value}
      rows={1}
      aria-label={label}
      placeholder={placeholder}
      maxLength={maxLength}
      spellCheck
      onChange={(e) => onChange(multiline ? e.target.value : e.target.value.replace(/\s*\n\s*/g, " "))}
      onKeyDown={onKeyDown}
      onBlur={() => {
        const trimmed = multiline ? value.replace(/^\s+|\s+$/g, "") : value.trim();
        if (required && !trimmed) onChange(lastValid.current);
        else if (trimmed !== value) onChange(trimmed);
      }}
    />
  );
}
