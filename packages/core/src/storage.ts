/**
 * Safe Local Storage helpers shared by every editable infographic.
 * All of them tolerate unavailable storage (private mode, quota, disabled storage).
 */

/** Reads `key`, parses it as JSON and validates it with `parse`; returns `fallback` on any failure. */
export function loadJson<T>(key: string, parse: (raw: unknown) => T | null, fallback: T): T {
  try {
    const text = window.localStorage.getItem(key);
    if (!text) return fallback;
    return parse(JSON.parse(text)) ?? fallback;
  } catch {
    return fallback;
  }
}

/** Returns false when the browser refuses to store data. */
export function saveJson(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Creates an id of the form `<prefix>-xxxxxx` that is not in `taken`. */
export function newId(prefix: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  let id = "";
  do id = `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
  while (used.has(id));
  return id;
}
