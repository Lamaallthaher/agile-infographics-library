import { useCallback, useEffect, useRef, useState } from "react";
import type { FieldRef } from "../renderer";
import { generatePalette, loadJson, newId, removeKey, saveJson } from "@agile-infographics/core";
import { parseAppearance, parseMethodology } from "./storage";
import {
  DEFAULT_METHODOLOGY_LIMITS,
  type AssessmentDimensionData,
  type MethodologyAppearance,
  type MethodologyFlowData,
  type MethodologyLimits,
  type MethodologyStepData,
} from "./types";

export type Removed<T> = { item: T; index: number };

/** Content state + validated edit actions + persistence for a Methodology Flow. */
export function useMethodologyFlow(defaults: MethodologyFlowData, storageKey: string, limits: MethodologyLimits = DEFAULT_METHODOLOGY_LIMITS) {
  const [data, setData] = useState<MethodologyFlowData>(() => loadJson(storageKey, (r) => parseMethodology(r, limits), defaults));
  const [saved, setSaved] = useState(true);
  const ref = useRef(data);
  ref.current = data;

  useEffect(() => {
    setSaved(saveJson(storageKey, data));
  }, [storageKey, data]);

  const update = useCallback((fn: (d: MethodologyFlowData) => MethodologyFlowData) => {
    const next = fn(ref.current);
    ref.current = next;
    setData(next);
  }, []);

  const L = limits.maxLength;
  const mapStep = (id: string, fn: (s: MethodologyStepData) => MethodologyStepData) =>
    update((d) => ({ ...d, steps: d.steps.map((s) => (s.id === id ? fn(s) : s)) }));
  const mapDim = (id: string, fn: (s: AssessmentDimensionData) => AssessmentDimensionData) =>
    update((d) => ({ ...d, wheel: { ...d.wheel, dimensions: d.wheel.dimensions.map((x) => (x.id === id ? fn(x) : x)) } }));
  const moveIn = <T extends { id: string }>(list: T[], id: string, delta: number) => {
    const from = list.findIndex((x) => x.id === id);
    const to = Math.max(0, Math.min(list.length - 1, from + delta));
    if (from < 0 || from === to) return list;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  };

  const actions = {
    /** Sets the value of any text field. */
    setField(field: FieldRef, value: string) {
      switch (field.kind) {
        case "title":
        case "subtitle":
          return update((d) => ({ ...d, [field.kind]: value.slice(0, L[field.kind]) }));
        case "centerValue":
        case "centerLabel":
        case "resultTitle":
        case "resultDescription":
          return update((d) => ({ ...d, wheel: { ...d.wheel, [field.kind]: value.slice(0, L[field.kind]) } }));
        case "kicker":
          return mapStep(field.stepId, (s) => ({ ...s, kicker: value.slice(0, L.kicker) }));
        case "stepTitle":
          return mapStep(field.stepId, (s) => ({ ...s, title: value.slice(0, L.stepTitle) }));
        case "description":
          return mapStep(field.stepId, (s) => ({ ...s, description: value.slice(0, L.description) }));
        case "takeaway":
          return mapStep(field.stepId, (s) => ({ ...s, takeaway: value.slice(0, L.takeaway) }));
        case "bullet":
          return mapStep(field.stepId, (s) => ({
            ...s,
            bullets: s.bullets.map((b, i) => (i === field.index ? value.slice(0, L.bullet) : b)),
          }));
        case "dimLabel":
          return mapDim(field.dimId, (x) => ({ ...x, label: value.slice(0, L.dimLabel) }));
        case "dimDescription":
          return mapDim(field.dimId, (x) => ({ ...x, description: value.slice(0, L.dimDescription) }));
      }
    },
    updateStep(id: string, patch: Partial<Omit<MethodologyStepData, "id">>) {
      mapStep(id, (s) => ({ ...s, ...patch }));
    },
    /** Inserts an empty bullet at `at` (default: end). Returns its index, or -1 at the limit. */
    addBullet(stepId: string, at?: number) {
      const step = ref.current.steps.find((s) => s.id === stepId);
      if (!step || step.bullets.length >= limits.maxBullets) return -1;
      const index = at ?? step.bullets.length;
      mapStep(stepId, (s) => ({ ...s, bullets: [...s.bullets.slice(0, index), "", ...s.bullets.slice(index)] }));
      return index;
    },
    removeBullet(stepId: string, index: number) {
      mapStep(stepId, (s) => ({ ...s, bullets: s.bullets.filter((_, i) => i !== index) }));
    },
    addStep(afterId?: string | null): string | null {
      const d = ref.current;
      if (d.steps.length >= limits.maxSteps) return null;
      const id = newId("s", d.steps.map((s) => s.id));
      const at = afterId ? d.steps.findIndex((s) => s.id === afterId) + 1 : d.steps.length;
      const index = at <= 0 ? d.steps.length : at;
      const step: MethodologyStepData = { id, kicker: "New step", title: "New step", description: "", bullets: [], takeaway: "", icon: "target" };
      update((cur) => ({ ...cur, steps: [...cur.steps.slice(0, index), step, ...cur.steps.slice(index)] }));
      return id;
    },
    removeStep(id: string): Removed<MethodologyStepData> | null {
      const d = ref.current;
      const index = d.steps.findIndex((s) => s.id === id);
      if (index < 0 || d.steps.length <= limits.minSteps) return null;
      update((cur) => ({ ...cur, steps: cur.steps.filter((s) => s.id !== id) }));
      return { item: d.steps[index], index };
    },
    restoreStep({ item, index }: Removed<MethodologyStepData>) {
      update((cur) =>
        cur.steps.length >= limits.maxSteps || cur.steps.some((s) => s.id === item.id)
          ? cur
          : { ...cur, steps: [...cur.steps.slice(0, index), item, ...cur.steps.slice(index)] },
      );
    },
    moveStep(id: string, delta: number) {
      update((cur) => ({ ...cur, steps: moveIn(cur.steps, id, delta) }));
    },
    updateDimension(id: string, patch: Partial<Omit<AssessmentDimensionData, "id">>) {
      mapDim(id, (x) => ({ ...x, ...patch }));
    },
    addDimension(afterId?: string | null): string | null {
      const d = ref.current;
      const dims = d.wheel.dimensions;
      if (dims.length >= limits.maxDimensions) return null;
      const id = newId("d", dims.map((x) => x.id));
      const at = afterId ? dims.findIndex((x) => x.id === afterId) + 1 : dims.length;
      const index = at <= 0 ? dims.length : at;
      const dim: AssessmentDimensionData = { id, label: "New dimension", description: "", icon: "target", color: null };
      update((cur) => {
        const list = cur.wheel.dimensions;
        return { ...cur, wheel: { ...cur.wheel, dimensions: [...list.slice(0, index), dim, ...list.slice(index)] } };
      });
      return id;
    },
    removeDimension(id: string): Removed<AssessmentDimensionData> | null {
      const dims = ref.current.wheel.dimensions;
      const index = dims.findIndex((x) => x.id === id);
      if (index < 0 || dims.length <= limits.minDimensions) return null;
      update((cur) => ({ ...cur, wheel: { ...cur.wheel, dimensions: cur.wheel.dimensions.filter((x) => x.id !== id) } }));
      return { item: dims[index], index };
    },
    restoreDimension({ item, index }: Removed<AssessmentDimensionData>) {
      update((cur) => {
        const list = cur.wheel.dimensions;
        if (list.length >= limits.maxDimensions || list.some((x) => x.id === item.id)) return cur;
        return { ...cur, wheel: { ...cur.wheel, dimensions: [...list.slice(0, index), item, ...list.slice(index)] } };
      });
    },
    moveDimension(id: string, delta: number) {
      update((cur) => ({ ...cur, wheel: { ...cur.wheel, dimensions: moveIn(cur.wheel.dimensions, id, delta) } }));
    },
    reset() {
      removeKey(storageKey);
      update(() => defaults);
    },
  };

  return { data, saved, limits, actions };
}

/** Appearance (theme + typography + layout), persisted under its own key. */
export function useMethodologyAppearance(defaults: MethodologyAppearance, storageKey: string) {
  const [appearance, setAppearance] = useState<MethodologyAppearance>(() =>
    loadJson(storageKey, (r) => parseAppearance(r, defaults), defaults),
  );
  useEffect(() => {
    saveJson(storageKey, appearance);
  }, [storageKey, appearance]);

  const palette = generatePalette(appearance.base);
  const set = (patch: Partial<MethodologyAppearance>) => setAppearance((a) => ({ ...a, ...patch }));
  return {
    appearance,
    palette,
    set,
    reset: () => {
      removeKey(storageKey);
      setAppearance(defaults);
    },
  };
}
