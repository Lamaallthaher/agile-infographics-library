import { OVERRIDE_KEYS, type ThemeOverrides } from "../renderer";
import { isIconKey, newId, normalizeHex } from "@agile-infographics/core";
import {
  DEFAULT_METHODOLOGY_LIMITS,
  TITLE_WEIGHTS,
  TYPE_SCALES,
  type AssessmentDimensionData,
  type MethodologyAppearance,
  type MethodologyFlowData,
  type MethodologyLimits,
  type MethodologyStepData,
} from "./types";

/**
 * Local Storage persistence. Everything read back is validated; missing,
 * corrupt or out-of-range data falls back to the defaults.
 */

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const strList = (v: unknown, max: number, maxItems: number) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, maxItems).map((s) => s.slice(0, max)) : [];

export function parseMethodology(raw: unknown, limits: MethodologyLimits = DEFAULT_METHODOLOGY_LIMITS): MethodologyFlowData | null {
  if (!isObj(raw) || raw.version !== 1 || !Array.isArray(raw.steps) || !isObj(raw.wheel)) return null;
  const L = limits.maxLength;
  const wheel = raw.wheel;
  if (!Array.isArray(wheel.dimensions)) return null;

  const stepIds = new Set<string>();
  const steps: MethodologyStepData[] = [];
  for (const s of raw.steps) {
    if (!isObj(s)) return null;
    let id = str(s.id, 64).trim();
    if (!id || stepIds.has(id)) id = newId("s", stepIds);
    stepIds.add(id);
    steps.push({
      id,
      kicker: str(s.kicker, L.kicker),
      title: str(s.title, L.stepTitle),
      description: str(s.description, L.description),
      bullets: strList(s.bullets, L.bullet, limits.maxBullets),
      takeaway: str(s.takeaway, L.takeaway),
      icon: isIconKey(s.icon) ? s.icon : "target",
    });
  }

  const dimIds = new Set<string>();
  const dimensions: AssessmentDimensionData[] = [];
  for (const d of wheel.dimensions) {
    if (!isObj(d)) return null;
    let id = str(d.id, 64).trim();
    if (!id || dimIds.has(id)) id = newId("d", dimIds);
    dimIds.add(id);
    dimensions.push({
      id,
      label: str(d.label, L.dimLabel),
      description: str(d.description, L.dimDescription),
      icon: isIconKey(d.icon) ? d.icon : "target",
      color: typeof d.color === "string" ? normalizeHex(d.color) : null,
    });
  }

  if (steps.length < limits.minSteps || steps.length > limits.maxSteps) return null;
  if (dimensions.length < limits.minDimensions || dimensions.length > limits.maxDimensions) return null;

  return {
    version: 1,
    title: str(raw.title, L.title),
    subtitle: str(raw.subtitle, L.subtitle),
    steps,
    wheel: {
      centerValue: str(wheel.centerValue, L.centerValue),
      centerLabel: str(wheel.centerLabel, L.centerLabel),
      resultTitle: str(wheel.resultTitle, L.resultTitle),
      resultDescription: str(wheel.resultDescription, L.resultDescription),
      dimensions,
    },
  };
}

export function parseAppearance(raw: unknown, fallback: MethodologyAppearance): MethodologyAppearance | null {
  if (!isObj(raw) || raw.version !== 1) return null;
  const base = typeof raw.base === "string" ? normalizeHex(raw.base) : null;
  if (!base) return null;
  const overrides: ThemeOverrides = {};
  if (isObj(raw.overrides)) {
    for (const key of OVERRIDE_KEYS) {
      const v = raw.overrides[key];
      const n = typeof v === "string" ? normalizeHex(v) : null;
      if (n) overrides[key] = n;
    }
  }
  const t = isObj(raw.typography) ? raw.typography : {};
  const scale = TYPE_SCALES.some((s) => s.value === t.scale) ? (t.scale as number) : fallback.typography.scale;
  const titleWeight = TITLE_WEIGHTS.some((w) => w.value === t.titleWeight) ? (t.titleWeight as number) : fallback.typography.titleWeight;
  const align = t.align === "center" || t.align === "left" ? t.align : fallback.typography.align;
  const placement = raw.placement === "alternate" || raw.placement === "above" || raw.placement === "below" ? raw.placement : fallback.placement;
  const dimensionContent = raw.dimensionContent === "icon" || raw.dimensionContent === "number" ? raw.dimensionContent : fallback.dimensionContent;
  return {
    version: 1,
    base,
    preset: typeof raw.preset === "string" ? raw.preset : null,
    overrides,
    typography: { scale, titleWeight, align },
    placement,
    dimensionContent,
  };
}
