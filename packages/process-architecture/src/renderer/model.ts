import { DEFAULT_PRIMARY, isIconKey, newId, normalizeHex, type IconKey } from "@agile-infographics/core";
import type {
  Activity,
  GroupCategory,
  LevelDefinition,
  NodeData,
  Process,
  ProcessAppearance,
  ProcessArchitectureData,
  ProcessArchitectureLimits,
  ProcessGroup,
  ProcessLevel,
  ProcessOverrideKey,
  ProcessOverrides,
  ProcessPath,
  ProcessStatus,
  ProcessView,
  Scope,
  ValueChain,
} from "./types";

/**
 * Validation, normalisation and hierarchy helpers for the Process Architecture
 * Map. Pure functions with no DOM access: used by the renderer (client data),
 * the editor (storage, JSON import) and by clients checking their data.
 */

export const DEFAULT_PROCESS_LIMITS: ProcessArchitectureLimits = {
  minValueChains: 1,
  maxValueChains: 6,
  maxGroups: 16,
  maxProcesses: 24,
  maxActivities: 30,
  maxTags: 8,
  maxScopes: 3,
  maxLength: {
    kicker: 80,
    levelLabel: 24,
    levelName: 40,
    levelDescription: 240,
    scopeTitle: 80,
    scopeDescription: 240,
    title: 100,
    subtitle: 220,
    nodeTitle: 80,
    description: 400,
    owner: 80,
    tag: 24,
    code: 16,
    href: 500,
  },
};

/** Generic level definitions used when the data has none (index = level). */
export const DEFAULT_LEVELS: readonly LevelDefinition[] = [
  { label: "Level Zero", name: "Value chain", description: "Shows how the organisation **creates value** from end to end." },
  { label: "Level One", name: "Process group", description: "Clusters related processes into **coherent areas of work**." },
  { label: "Level Two", name: "Process", description: "Defines each **individual process** in a group, with its purpose and outputs." },
  { label: "Level Three", name: "Activity", description: "Breaks each process into the **steps, roles and decisions** that carry it out." },
];

/** Generic scope bands used when the data has none. */
export const DEFAULT_SCOPES: readonly Scope[] = [
  { title: "Architecture structure", description: "Value chains, process groups and processes: the stable frame of the model.", levels: [0, 1, 2] },
  { title: "Detailed process design", description: "Activities, roles and decision points, designed process by process.", levels: [3] },
];

export const VIEW_LABELS: Record<ProcessView, string> = { structure: "Structure & levels", groups: "Process groups by stage", full: "Full architecture" };
export const PROCESS_VIEWS: readonly ProcessView[] = ["structure", "groups", "full"];

/** Splits text with **bold** markers into plain and bold runs. Unmatched markers stay as text. */
export function boldRuns(text: string): { text: string; bold: boolean }[] {
  const parts = text.split("**");
  if (parts.length < 3) return [{ text, bold: false }];
  const runs: { text: string; bold: boolean }[] = [];
  parts.forEach((p, i) => {
    const bold = i % 2 === 1 && i < parts.length - 1;
    if (p) runs.push({ text: bold || i % 2 === 0 ? p : `**${p}`, bold });
  });
  return runs;
}

export const PROCESS_STATUSES: readonly ProcessStatus[] = ["", "active", "planned", "in-review", "retired"];
export const STATUS_LABELS: Record<ProcessStatus, string> = { "": "No status", active: "Active", planned: "Planned", "in-review": "In review", retired: "Retired" };
export const GROUP_CATEGORIES: readonly GroupCategory[] = ["management", "core", "support"];
export const CATEGORY_LABELS: Record<GroupCategory, string> = { management: "Management", core: "Core", support: "Support" };
export const LEVEL_NAMES = ["Value chain", "Process group", "Process", "Activity"] as const;

export interface ProcessIssue {
  level: "error" | "warning";
  path: string;
  message: string;
}

export interface NormalizeResult {
  data: ProcessArchitectureData | null;
  issues: ProcessIssue[];
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/** Links allowed: http(s), mailto, absolute paths and #fragments (never javascript: and the like). */
export function isSafeHref(value: string): boolean {
  const v = value.trim();
  if (!v || /[\s\u0000-\u001f]/.test(v)) return false;
  return /^(https?:\/\/[^/]|mailto:[^/]|\/(?!\/)|#)/i.test(v);
}

/**
 * Checks and completes client data: optional fields get defaults, ids are made
 * unique across the whole hierarchy, long text is shortened, unknown values and
 * unsafe links are dropped. Each correction is a warning; structural problems
 * (wrong types, counts outside the limits) are errors and return no data.
 */
export function normalizeProcessArchitecture(raw: unknown, limits: ProcessArchitectureLimits = DEFAULT_PROCESS_LIMITS): NormalizeResult {
  const issues: ProcessIssue[] = [];
  const L = limits.maxLength;
  const fail = (path: string, message: string): NormalizeResult => {
    issues.push({ level: "error", path, message });
    return { data: null, issues };
  };
  const warn = (path: string, message: string) => issues.push({ level: "warning", path, message });
  const ids = new Set<string>();

  const text = (v: unknown, max: number, path: string, required = false): string => {
    if (v === undefined || v === null) {
      if (required) warn(path, "missing; left empty");
      return "";
    }
    if (typeof v !== "string") {
      warn(path, "is not text; ignored");
      return "";
    }
    if (v.length > max) {
      warn(path, `longer than ${max} characters; shortened`);
      return v.slice(0, max);
    }
    return v;
  };
  const uniqueId = (v: unknown, prefix: string, path: string): string => {
    let id = typeof v === "string" ? v.trim().slice(0, 64) : "";
    if (!id) {
      id = newId(prefix, ids);
      warn(path, `missing id; "${id}" assigned`);
    } else if (ids.has(id)) {
      const next = newId(prefix, ids);
      warn(path, `duplicate id "${id}"; "${next}" assigned`);
      id = next;
    }
    ids.add(id);
    return id;
  };
  const list = (v: unknown, max: number, path: string, what: string): unknown[] | null => {
    if (v === undefined || v === null) return [];
    if (!Array.isArray(v)) return null;
    if (v.length > max) {
      issues.push({ level: "error", path, message: `${v.length} ${what}; at most ${max} are supported` });
      return null;
    }
    return v;
  };
  const node = (o: Obj, prefix: string, path: string): NodeData => {
    let href = text(o.href, L.href, `${path}.href`).trim();
    if (href && !isSafeHref(href)) {
      warn(`${path}.href`, "only http(s), mailto, /path and #fragment links are allowed; removed");
      href = "";
    }
    let status: ProcessStatus = "";
    if (o.status !== undefined && o.status !== null && o.status !== "") {
      if (PROCESS_STATUSES.includes(o.status as ProcessStatus)) status = o.status as ProcessStatus;
      else warn(`${path}.status`, `unknown status "${String(o.status)}"; removed`);
    }
    let tags: string[] = [];
    if (Array.isArray(o.tags)) {
      tags = o.tags.filter((t): t is string => typeof t === "string" && t.trim() !== "").map((t) => t.trim().slice(0, L.tag));
      if (tags.length > limits.maxTags) {
        warn(`${path}.tags`, `more than ${limits.maxTags} tags; the rest were removed`);
        tags = tags.slice(0, limits.maxTags);
      }
    } else if (o.tags !== undefined) warn(`${path}.tags`, "tags must be a list; ignored");
    return {
      id: uniqueId(o.id, prefix, `${path}.id`),
      title: text(o.title, L.nodeTitle, `${path}.title`, true),
      description: text(o.description, L.description, `${path}.description`),
      owner: text(o.owner, L.owner, `${path}.owner`),
      status,
      tags,
      code: text(o.code, L.code, `${path}.code`).trim(),
      href,
    };
  };

  if (!isObj(raw)) return fail("", "the data must be an object");
  if (raw.version !== undefined && raw.version !== 1) return fail("version", `unsupported version ${String(raw.version)} (expected 1)`);
  if (!Array.isArray(raw.valueChains)) return fail("valueChains", "value chains must be a list");
  if (raw.valueChains.length < limits.minValueChains || raw.valueChains.length > limits.maxValueChains) {
    return fail("valueChains", `${raw.valueChains.length} value chains; between ${limits.minValueChains} and ${limits.maxValueChains} are supported`);
  }

  const valueChains: ValueChain[] = [];
  for (let ci = 0; ci < raw.valueChains.length; ci++) {
    const c = raw.valueChains[ci];
    const cp = `valueChains[${ci}]`;
    if (!isObj(c)) return fail(cp, "each value chain must be an object");
    const rawGroups = list(c.groups, limits.maxGroups, `${cp}.groups`, "process groups");
    if (!rawGroups) return issues.some((i) => i.level === "error") ? { data: null, issues } : fail(`${cp}.groups`, "groups must be a list");
    const chain = node(c, "vc", cp);
    const groups: ProcessGroup[] = [];
    for (let gi = 0; gi < rawGroups.length; gi++) {
      const g = rawGroups[gi];
      const gp = `${cp}.groups[${gi}]`;
      if (!isObj(g)) return fail(gp, "each process group must be an object");
      const rawProcesses = list(g.processes, limits.maxProcesses, `${gp}.processes`, "processes");
      if (!rawProcesses) return issues.some((i) => i.level === "error") ? { data: null, issues } : fail(`${gp}.processes`, "processes must be a list");
      const base = node(g, "pg", gp);
      let category: GroupCategory = "core";
      if (g.category !== undefined && g.category !== null) {
        if (GROUP_CATEGORIES.includes(g.category as GroupCategory)) category = g.category as GroupCategory;
        else warn(`${gp}.category`, `must be management, core or support; "${String(g.category)}" replaced by "core"`);
      }
      let icon: IconKey | null = null;
      if (g.icon !== undefined && g.icon !== null && g.icon !== "") {
        if (isIconKey(g.icon)) icon = g.icon;
        else warn(`${gp}.icon`, `unknown icon "${String(g.icon)}"; removed`);
      }
      let color: string | null = null;
      if (g.color !== undefined && g.color !== null && g.color !== "") {
        color = typeof g.color === "string" ? normalizeHex(g.color) : null;
        if (!color) warn(`${gp}.color`, `"${String(g.color)}" is not a HEX colour; the theme colour is used`);
      }
      const processes: Process[] = [];
      for (let pi = 0; pi < rawProcesses.length; pi++) {
        const p = rawProcesses[pi];
        const pp = `${gp}.processes[${pi}]`;
        if (!isObj(p)) return fail(pp, "each process must be an object");
        const rawActivities = list(p.activities, limits.maxActivities, `${pp}.activities`, "activities");
        if (!rawActivities) return issues.some((i) => i.level === "error") ? { data: null, issues } : fail(`${pp}.activities`, "activities must be a list");
        const proc = node(p, "pr", pp);
        const activities: Activity[] = [];
        for (let ai = 0; ai < rawActivities.length; ai++) {
          const a = rawActivities[ai];
          const ap = `${pp}.activities[${ai}]`;
          if (!isObj(a)) return fail(ap, "each activity must be an object");
          activities.push(node(a, "ac", ap));
        }
        processes.push({ ...proc, activities });
      }
      groups.push({ ...base, category, icon, color, processes });
    }
    valueChains.push({ ...chain, groups });
  }

  // Level definitions: four entries, each field falling back to the generic default.
  let rawLevels: unknown[] = [];
  if (Array.isArray(raw.levels)) rawLevels = raw.levels;
  else if (raw.levels !== undefined) warn("levels", "levels must be a list; defaults used");
  const levels: LevelDefinition[] = DEFAULT_LEVELS.map((def, i) => {
    const l = rawLevels[i];
    if (l === undefined || l === null) return { ...def };
    if (!isObj(l)) {
      warn(`levels[${i}]`, "not an object; default used");
      return { ...def };
    }
    const pick = (v: unknown, max: number, key: string, fb: string) => (v === undefined || v === null ? fb : text(v, max, `levels[${i}].${key}`));
    return { label: pick(l.label, L.levelLabel, "label", def.label), name: pick(l.name, L.levelName, "name", def.name), description: pick(l.description, L.levelDescription, "description", def.description) };
  });
  if (rawLevels.length > 4) warn("levels", "only four levels (L0–L3) exist; the rest were ignored");

  // Scopes: each level in at most one band.
  let scopes: Scope[] = DEFAULT_SCOPES.map((sc) => ({ ...sc, levels: [...sc.levels] }));
  if (raw.scopes !== undefined) {
    if (!Array.isArray(raw.scopes)) return fail("scopes", "scopes must be a list");
    if (raw.scopes.length > limits.maxScopes) return fail("scopes", `${raw.scopes.length} scopes; at most ${limits.maxScopes} are supported`);
    const used = new Set<number>();
    scopes = [];
    raw.scopes.forEach((sc, si) => {
      const sp = `scopes[${si}]`;
      if (!isObj(sc)) return void warn(sp, "not an object; ignored");
      const lv = Array.isArray(sc.levels) ? sc.levels : [];
      const own: number[] = [];
      for (const n of lv) {
        if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > 3) warn(`${sp}.levels`, `"${String(n)}" is not a level (0–3); ignored`);
        else if (used.has(n)) warn(`${sp}.levels`, `level ${n} already belongs to another scope; ignored`);
        else {
          used.add(n);
          own.push(n);
        }
      }
      if (!own.length) return void warn(sp, "has no levels; ignored");
      scopes.push({ title: text(sc.title, L.scopeTitle, `${sp}.title`, true), description: text(sc.description, L.scopeDescription, `${sp}.description`), levels: own.sort((a, b) => a - b) });
    });
  }

  return {
    data: {
      version: 1,
      kicker: text(raw.kicker, L.kicker, "kicker"),
      title: text(raw.title, L.title, "title"),
      subtitle: text(raw.subtitle, L.subtitle, "subtitle"),
      levels,
      scopes,
      valueChains,
    },
    issues,
  };
}

export function validateProcessArchitecture(raw: unknown, limits: ProcessArchitectureLimits = DEFAULT_PROCESS_LIMITS): ProcessIssue[] {
  return normalizeProcessArchitecture(raw, limits).issues;
}

/** Normalised data, or null when the data has errors (used for Local Storage). */
export function parseProcessArchitecture(raw: unknown, limits: ProcessArchitectureLimits = DEFAULT_PROCESS_LIMITS): ProcessArchitectureData | null {
  return normalizeProcessArchitecture(raw, limits).data;
}

/* ---------------------------------------------------------------------------
 * Hierarchy helpers
 * ------------------------------------------------------------------------- */

export const EMPTY_PATH: ProcessPath = { valueChainId: null, groupId: null, processId: null, activityId: null };

export interface FoundNode {
  level: ProcessLevel;
  node: ValueChain | ProcessGroup | Process | Activity;
  /** Full path down to this node (deeper levels null). */
  path: ProcessPath;
  /** Position among its siblings and the sibling count. */
  index: number;
  count: number;
}

/** Finds any node by id, with its level and path. */
export function findNode(data: ProcessArchitectureData, id: string): FoundNode | null {
  for (const [ci, c] of data.valueChains.entries()) {
    if (c.id === id) return { level: 0, node: c, path: { ...EMPTY_PATH, valueChainId: c.id }, index: ci, count: data.valueChains.length };
    for (const [gi, g] of c.groups.entries()) {
      if (g.id === id) return { level: 1, node: g, path: { ...EMPTY_PATH, valueChainId: c.id, groupId: g.id }, index: gi, count: c.groups.length };
      for (const [pi, p] of g.processes.entries()) {
        if (p.id === id) return { level: 2, node: p, path: { valueChainId: c.id, groupId: g.id, processId: p.id, activityId: null }, index: pi, count: g.processes.length };
        for (const [ai, a] of p.activities.entries()) {
          if (a.id === id) return { level: 3, node: a, path: { valueChainId: c.id, groupId: g.id, processId: p.id, activityId: a.id }, index: ai, count: p.activities.length };
        }
      }
    }
  }
  return null;
}

/**
 * Makes a path consistent with the data: unknown ids are dropped (with their
 * descendants), the value chain defaults to the first one, and children must
 * belong to their parents.
 */
export function resolvePath(data: ProcessArchitectureData, path: Partial<ProcessPath>): ProcessPath {
  const chain = data.valueChains.find((c) => c.id === path.valueChainId) ?? data.valueChains[0];
  const group = chain?.groups.find((g) => g.id === path.groupId);
  const process = group?.processes.find((p) => p.id === path.processId);
  const activity = process?.activities.find((a) => a.id === path.activityId);
  return { valueChainId: chain?.id ?? null, groupId: group?.id ?? null, processId: process?.id ?? null, activityId: activity?.id ?? null };
}

/**
 * The bands of the "Structure & levels" view, top to bottom: each scope's
 * levels with its callout, and any levels in no scope as a band of their own.
 * Bands are ordered by their first level.
 */
export function structureBands(data: ProcessArchitectureData): { levels: ProcessLevel[]; scope: Scope | null; scopeIndex: number }[] {
  const bands: { levels: ProcessLevel[]; scope: Scope | null; scopeIndex: number }[] = data.scopes.map((sc, i) => ({ levels: sc.levels as ProcessLevel[], scope: sc, scopeIndex: i }));
  const covered = new Set(data.scopes.flatMap((sc) => sc.levels));
  const rest = ([0, 1, 2, 3] as ProcessLevel[]).filter((l) => !covered.has(l));
  if (rest.length) bands.push({ levels: rest, scope: null, scopeIndex: -1 });
  return bands.sort((a, b) => a.levels[0] - b.levels[0]);
}

/** Hierarchical numbers: group "2", process "2.3", activity "2.3.1". Core groups are numbered in their own sequence order. */
export function numberingFor(chain: ValueChain): Map<string, string> {
  const map = new Map<string, string>();
  chain.groups.forEach((g, gi) => {
    const gn = String(gi + 1);
    map.set(g.id, gn);
    g.processes.forEach((p, pi) => {
      const pn = `${gn}.${pi + 1}`;
      map.set(p.id, pn);
      p.activities.forEach((a, ai) => map.set(a.id, `${pn}.${ai + 1}`));
    });
  });
  return map;
}

export function countNodes(chain: ValueChain) {
  const processes = chain.groups.reduce((n, g) => n + g.processes.length, 0);
  const activities = chain.groups.reduce((n, g) => n + g.processes.reduce((m, p) => m + p.activities.length, 0), 0);
  return { groups: chain.groups.length, processes, activities };
}

/* ---------------------------------------------------------------------------
 * Appearance
 * ------------------------------------------------------------------------- */

export const PROCESS_OVERRIDE_KEYS: readonly ProcessOverrideKey[] = [
  "background",
  "panel",
  "surface",
  "heading",
  "text",
  "accent",
  "valueChain",
  "coreFrom",
  "coreTo",
  "management",
  "support",
  "scope",
];

export const PROCESS_OVERRIDE_LABELS: Record<ProcessOverrideKey, string> = {
  background: "Background",
  panel: "Map panel",
  surface: "Cards",
  heading: "Headings",
  text: "Body text",
  accent: "Accent text",
  valueChain: "Value chain (L0)",
  coreFrom: "First core group",
  coreTo: "Last core group",
  management: "Management groups",
  support: "Support groups",
  scope: "Scope highlight",
};

export const TYPE_SCALES = [
  { value: 0.9, label: "S" },
  { value: 1, label: "M" },
  { value: 1.1, label: "L" },
  { value: 1.2, label: "XL" },
] as const;

export const TITLE_WEIGHTS = [
  { value: 600, label: "Semibold" },
  { value: 700, label: "Bold" },
  { value: 800, label: "Heavy" },
] as const;

export const DEFAULT_PROCESS_APPEARANCE: ProcessAppearance = {
  version: 1,
  base: DEFAULT_PRIMARY,
  preset: "navy",
  secondary: null,
  scheme: "dark",
  overrides: {},
  typography: { scale: 1, titleWeight: 700 },
  navigation: "cascade",
  groupShape: "chevron",
  cardStyle: "accent",
  radius: "soft",
  density: "comfortable",
  expandDefault: "collapsed",
  activityLayout: "flow",
  numbering: true,
  defaultView: "structure",
};

/** Completes a partial appearance (client props) with defaults; invalid values fall back. */
export function resolveAppearance(input: Partial<ProcessAppearance> | undefined, fallback: ProcessAppearance = DEFAULT_PROCESS_APPEARANCE): ProcessAppearance {
  return parseAppearance({ ...fallback, ...input, version: 1, typography: { ...fallback.typography, ...input?.typography } }, fallback) ?? fallback;
}

export function parseAppearance(raw: unknown, fallback: ProcessAppearance = DEFAULT_PROCESS_APPEARANCE): ProcessAppearance | null {
  if (!isObj(raw) || raw.version !== 1) return null;
  const base = typeof raw.base === "string" ? normalizeHex(raw.base) : null;
  if (!base) return null;
  const pick = <T extends string | number | boolean>(v: unknown, options: readonly T[], fb: T): T => (options.includes(v as T) ? (v as T) : fb);
  const overrides: ProcessOverrides = {};
  if (isObj(raw.overrides)) {
    for (const key of PROCESS_OVERRIDE_KEYS) {
      const v = raw.overrides[key];
      const n = typeof v === "string" ? normalizeHex(v) : null;
      if (n) overrides[key] = n;
    }
  }
  const t = isObj(raw.typography) ? raw.typography : {};
  return {
    version: 1,
    base,
    preset: typeof raw.preset === "string" ? raw.preset : null,
    secondary: typeof raw.secondary === "string" ? normalizeHex(raw.secondary) : null,
    scheme: pick(raw.scheme, ["dark", "light"] as const, fallback.scheme),
    overrides,
    typography: {
      scale: pick(t.scale, TYPE_SCALES.map((s) => s.value), fallback.typography.scale),
      titleWeight: pick(t.titleWeight, TITLE_WEIGHTS.map((w) => w.value), fallback.typography.titleWeight),
    },
    navigation: pick(raw.navigation, ["cascade", "focus"] as const, fallback.navigation),
    groupShape: pick(raw.groupShape, ["chevron", "block"] as const, fallback.groupShape),
    cardStyle: pick(raw.cardStyle, ["accent", "filled", "outline"] as const, fallback.cardStyle),
    radius: pick(raw.radius, ["square", "soft", "round"] as const, fallback.radius),
    density: pick(raw.density, ["compact", "comfortable", "spacious"] as const, fallback.density),
    expandDefault: pick(raw.expandDefault, ["collapsed", "expanded"] as const, fallback.expandDefault),
    activityLayout: pick(raw.activityLayout, ["flow", "list"] as const, fallback.activityLayout),
    numbering: pick(raw.numbering, [true, false] as const, fallback.numbering),
    defaultView: pick(raw.defaultView, ["structure", "groups", "full"] as const, fallback.defaultView),
  };
}
