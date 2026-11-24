import { useCallback, useEffect, useRef, useState } from "react";
import { clearTomData, loadTomData, newId, saveTomData } from "./storage";
import { DEFAULT_LIMITS, type TomComponent, type TomLimits, type TomWheelData } from "./types";

export interface TomWheelActions {
  setTitle(title: string): void;
  setSubtitle(subtitle: string): void;
  updateComponent(id: string, patch: Partial<Omit<TomComponent, "id">>): void;
  /** Adds a component after `afterId` (or at the end). Returns its id, or null at the maximum. */
  addComponent(afterId?: string | null): string | null;
  /** Removes a component. Returns what was removed (for undo), or null at the minimum. */
  removeComponent(id: string): { component: TomComponent; index: number } | null;
  /** Puts a removed component back at its old position (undo). */
  restoreComponent(component: TomComponent, index: number): void;
  /** Moves a component by `delta` positions (clamped). */
  moveComponent(id: string, delta: number): void;
  /** Restores the default configuration and clears saved data. */
  reset(): void;
}

/**
 * State + persistence for an editable TOM wheel. All edits are validated here
 * (component count limits, unique ids), so the UI cannot create an invalid wheel.
 */
export function useTomWheel(defaults: TomWheelData, storageKey: string, limits: TomLimits = DEFAULT_LIMITS) {
  const [data, setData] = useState<TomWheelData>(() => loadTomData(storageKey, defaults, limits));
  const [saved, setSaved] = useState(true);
  // Read the latest data synchronously inside actions that return values.
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    setSaved(saveTomData(storageKey, data));
  }, [storageKey, data]);

  const update = useCallback((fn: (d: TomWheelData) => TomWheelData) => {
    const next = fn(dataRef.current);
    dataRef.current = next;
    setData(next);
  }, []);

  const actions: TomWheelActions = {
    setTitle: (title) => update((d) => ({ ...d, title: title.slice(0, limits.maxTitleLength) })),
    setSubtitle: (subtitle) => update((d) => ({ ...d, subtitle: subtitle.slice(0, limits.maxTitleLength) })),
    updateComponent: (id, patch) =>
      update((d) => ({
        ...d,
        components: d.components.map((c) =>
          c.id === id
            ? { ...c, ...patch, name: (patch.name ?? c.name).slice(0, limits.maxNameLength) }
            : c,
        ),
      })),
    addComponent: (afterId) => {
      const d = dataRef.current;
      if (d.components.length >= limits.maxComponents) return null;
      const id = newId(d.components.map((c) => c.id));
      const component: TomComponent = {
        id,
        name: "New component",
        icon: "target",
        description: "",
        details: "",
        facts: [],
        checklist: [],
      };
      const at = afterId ? d.components.findIndex((c) => c.id === afterId) + 1 : d.components.length;
      const index = at <= 0 ? d.components.length : at;
      update((cur) => ({
        ...cur,
        components: [...cur.components.slice(0, index), component, ...cur.components.slice(index)],
      }));
      return id;
    },
    removeComponent: (id) => {
      const d = dataRef.current;
      const index = d.components.findIndex((c) => c.id === id);
      if (index < 0 || d.components.length <= limits.minComponents) return null;
      const component = d.components[index];
      update((cur) => ({ ...cur, components: cur.components.filter((c) => c.id !== id) }));
      return { component, index };
    },
    restoreComponent: (component, index) =>
      update((cur) => {
        if (cur.components.length >= limits.maxComponents || cur.components.some((c) => c.id === component.id)) {
          return cur;
        }
        const at = Math.max(0, Math.min(index, cur.components.length));
        return { ...cur, components: [...cur.components.slice(0, at), component, ...cur.components.slice(at)] };
      }),
    moveComponent: (id, delta) =>
      update((cur) => {
        const from = cur.components.findIndex((c) => c.id === id);
        const to = Math.max(0, Math.min(cur.components.length - 1, from + delta));
        if (from < 0 || from === to) return cur;
        const list = [...cur.components];
        const [item] = list.splice(from, 1);
        list.splice(to, 0, item);
        return { ...cur, components: list };
      }),
    reset: () => {
      clearTomData(storageKey);
      update(() => defaults);
    },
  };

  return { data, saved, limits, actions };
}
