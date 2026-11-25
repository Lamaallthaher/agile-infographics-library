import { isIconKey, loadJson, newId as coreNewId, removeKey, saveJson } from "@agile-infographics/core";
import { DEFAULT_LIMITS, type TomComponent, type TomFact, type TomLimits, type TomWheelData } from "./types";

/**
 * Local Storage persistence for the prototype. Stored data is validated on load;
 * anything missing, corrupt or out of range falls back to the default config.
 */

const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const strList = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

function parseFacts(v: unknown): TomFact[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((f): f is Record<string, unknown> => typeof f === "object" && f !== null)
    .map((f) => ({ label: str(f.label), value: str(f.value) }));
}

/** Returns a valid TomWheelData, or null if `raw` cannot be used. */
export function parseTomData(raw: unknown, limits: TomLimits = DEFAULT_LIMITS): TomWheelData | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (r.version !== 1 || !Array.isArray(r.components)) return null;
  const seen = new Set<string>();
  const components: TomComponent[] = [];
  for (const item of r.components) {
    if (typeof item !== "object" || item === null) return null;
    const c = item as Record<string, unknown>;
    let id = str(c.id).trim();
    if (!id || seen.has(id)) id = newId(seen);
    seen.add(id);
    components.push({
      id,
      name: str(c.name).slice(0, limits.maxNameLength) || "Untitled component",
      icon: isIconKey(c.icon) ? c.icon : "target",
      description: str(c.description),
      details: str(c.details),
      facts: parseFacts(c.facts),
      checklist: strList(c.checklist),
    });
  }
  if (components.length < limits.minComponents || components.length > limits.maxComponents) return null;
  return {
    version: 1,
    title: str(r.title).slice(0, limits.maxTitleLength),
    subtitle: str(r.subtitle).slice(0, limits.maxTitleLength),
    centerIcon: isIconKey(r.centerIcon) ? r.centerIcon : "tomMonitor",
    components,
  };
}

/** Creates an id that is not in `taken`. */
export function newId(taken: Iterable<string>): string {
  return coreNewId("c", taken);
}

export function loadTomData(key: string, fallback: TomWheelData, limits?: TomLimits): TomWheelData {
  return loadJson(key, (raw) => parseTomData(raw, limits), fallback);
}

/** Returns false when the browser refuses to store data (private mode, quota, disabled storage). */
export function saveTomData(key: string, data: TomWheelData): boolean {
  return saveJson(key, data);
}

export function clearTomData(key: string): void {
  removeKey(key);
}
