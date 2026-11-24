import { useEffect, useMemo, useState } from "react";
import { DEFAULT_PRIMARY, generatePalette, normalizeHex } from "../library/theme-generator";

/**
 * The user's primary theme colour, persisted in Local Storage under its own key
 * (separate from the wheel content), plus the palette generated from it.
 */
export function useThemeColor(storageKey: string, defaultColor: string = DEFAULT_PRIMARY) {
  const fallback = normalizeHex(defaultColor) ?? DEFAULT_PRIMARY;
  const [color, setColorState] = useState<string>(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? (JSON.parse(raw) as { version?: number; primary?: unknown }) : null;
      return (parsed?.version === 1 && typeof parsed.primary === "string" && normalizeHex(parsed.primary)) || fallback;
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    try {
      if (color === fallback) window.localStorage.removeItem(storageKey);
      else window.localStorage.setItem(storageKey, JSON.stringify({ version: 1, primary: color }));
    } catch {
      /* storage unavailable: the theme still applies for this session */
    }
  }, [storageKey, color, fallback]);

  const palette = useMemo(() => generatePalette(color), [color]);

  return {
    color,
    palette,
    isDefault: color === fallback,
    /** Accepts any HEX form; invalid values are ignored. */
    setColor: (value: string) => {
      const n = normalizeHex(value);
      if (n) setColorState(n);
    },
    reset: () => setColorState(fallback),
  };
}
