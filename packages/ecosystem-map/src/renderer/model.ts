import { DEFAULT_PRIMARY, isIconKey, newId, normalizeHex, type IconKey } from "@agile-infographics/core";
import type {
  CenterStyle,
  ConnectionDirection,
  ConnectionStyle,
  EcosystemAppearance,
  EcosystemConnection,
  EcosystemGroup,
  EcosystemItem,
  EcosystemLimits,
  EcosystemMapData,
  EcosystemOverrideKey,
  EcosystemOverrides,
  GroupSide,
} from "./types";

/**
 * Validation and normalisation of Ecosystem Map data. Pure functions, no DOM:
 * used by the renderer (client data), by the editor (Local Storage, JSON
 * import) and by clients who want to check their data before rendering.
 */

export const DEFAULT_ECOSYSTEM_LIMITS: EcosystemLimits = {
  minGroups: 1,
  maxGroups: 12,
  maxItems: 20,
  maxLength: {
    title: 100,
    subtitle: 220,
    centerTitle: 60,
    centerSubtitle: 80,
    groupTitle: 60,
    groupDescription: 240,
    itemLabel: 100,
    itemDescription: 240,
    itemTag: 24,
    itemHref: 500,
    connectionLabel: 40,
  },
};

export const GROUP_SIDES: readonly GroupSide[] = ["auto", "left", "right", "top", "bottom"];
export const CENTER_STYLES: readonly CenterStyle[] = ["rings", "solid", "outline"];
export const CONNECTION_STYLES: readonly ConnectionStyle[] = ["solid", "dashed", "dotted"];
export const CONNECTION_DIRECTIONS: readonly ConnectionDirection[] = ["none", "forward", "backward", "both"];

export interface EcosystemIssue {
  /** "error": the data cannot be used. "warning": a value was corrected or dropped. */
  level: "error" | "warning";
  /** Where the problem is, for example `groups[2].items[0].href`. */
  path: string;
  message: string;
}

export interface NormalizeResult {
  /** The complete data, or null when there is an error. */
  data: EcosystemMapData | null;
  issues: EcosystemIssue[];
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/** Links allowed on items: http(s), mailto, absolute paths and #fragments (never javascript: etc.). */
export function isSafeHref(value: string): boolean {
  const v = value.trim();
  if (!v || /[\s\u0000-\u001f]/.test(v)) return false;
  return /^(https?:\/\/[^/]|mailto:[^/]|\/(?!\/)|#)/i.test(v);
}

/**
 * Checks and completes client data. Optional fields get defaults, ids are made
 * unique, long text is shortened, unknown icons, colours and unsafe links are
 * dropped, and every group gets exactly one connection to the centre.
 * Each correction is reported as a warning; structural problems are errors.
 */
export function normalizeEcosystem(raw: unknown, limits: EcosystemLimits = DEFAULT_ECOSYSTEM_LIMITS): NormalizeResult {
  const issues: EcosystemIssue[] = [];
  const error = (path: string, message: string): NormalizeResult => {
    issues.push({ level: "error", path, message });
    return { data: null, issues };
  };
  const warn = (path: string, message: string) => issues.push({ level: "warning", path, message });
  const L = limits.maxLength;

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
  const icon = (v: unknown, path: string): IconKey | null => {
    if (v === undefined || v === null || v === "") return null;
    if (isIconKey(v)) return v;
    warn(path, `unknown icon "${String(v)}"; removed`);
    return null;
  };
  const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T, path: string): T => {
    if (v === undefined || v === null) return fallback;
    if (options.includes(v as T)) return v as T;
    warn(path, `must be one of ${options.join(", ")}; "${String(v)}" replaced by "${fallback}"`);
    return fallback;
  };
  const uniqueId = (v: unknown, taken: Set<string>, prefix: string, path: string): string => {
    let id = typeof v === "string" ? v.trim().slice(0, 64) : "";
    if (!id) {
      id = newId(prefix, taken);
      warn(path, `missing id; "${id}" assigned`);
    } else if (taken.has(id)) {
      const next = newId(prefix, taken);
      warn(path, `duplicate id "${id}"; "${next}" assigned`);
      id = next;
    }
    taken.add(id);
    return id;
  };

  if (!isObj(raw)) return error("", "the data must be an object");
  if (raw.version !== undefined && raw.version !== 1) return error("version", `unsupported version ${String(raw.version)} (expected 1)`);
  if (!isObj(raw.center)) return error("center", "the central entity is missing");
  if (!Array.isArray(raw.groups)) return error("groups", "groups must be a list");
  if (raw.groups.length < limits.minGroups || raw.groups.length > limits.maxGroups) {
    return error("groups", `${raw.groups.length} groups; between ${limits.minGroups} and ${limits.maxGroups} are supported`);
  }

  const ids = new Set<string>();
  const c = raw.center;
  const centerId = uniqueId(c.id ?? "center", ids, "center", "center.id");
  const center = {
    id: centerId,
    title: text(c.title, L.centerTitle, "center.title", true),
    subtitle: text(c.subtitle, L.centerSubtitle, "center.subtitle"),
    icon: icon(c.icon, "center.icon"),
    style: oneOf(c.style, CENTER_STYLES, "rings", "center.style"),
  };

  const groups: EcosystemGroup[] = [];
  for (let gi = 0; gi < raw.groups.length; gi++) {
    const g = raw.groups[gi];
    const gp = `groups[${gi}]`;
    if (!isObj(g)) return error(gp, "each group must be an object");
    const rawItems = g.items === undefined ? [] : g.items;
    if (!Array.isArray(rawItems)) return error(`${gp}.items`, "items must be a list");
    if (rawItems.length > limits.maxItems) return error(`${gp}.items`, `${rawItems.length} items; at most ${limits.maxItems} per group`);
    const id = uniqueId(g.id, ids, "g", `${gp}.id`);
    const items: EcosystemItem[] = [];
    for (let ii = 0; ii < rawItems.length; ii++) {
      const it = rawItems[ii];
      const ip = `${gp}.items[${ii}]`;
      if (!isObj(it)) return error(ip, "each item must be an object");
      let href = text(it.href, L.itemHref, `${ip}.href`);
      if (href && !isSafeHref(href)) {
        warn(`${ip}.href`, "only http(s), mailto, /path and #fragment links are allowed; removed");
        href = "";
      }
      items.push({
        id: uniqueId(it.id, ids, "i", `${ip}.id`),
        label: text(it.label, L.itemLabel, `${ip}.label`, true),
        description: text(it.description, L.itemDescription, `${ip}.description`),
        icon: icon(it.icon, `${ip}.icon`),
        href: href.trim(),
        tag: text(it.tag, L.itemTag, `${ip}.tag`),
      });
    }
    let color: string | null = null;
    if (g.color !== undefined && g.color !== null && g.color !== "") {
      color = typeof g.color === "string" ? normalizeHex(g.color) : null;
      if (!color) warn(`${gp}.color`, `"${String(g.color)}" is not a HEX colour; the theme colour is used`);
    }
    groups.push({
      id,
      title: text(g.title, L.groupTitle, `${gp}.title`, true),
      description: text(g.description, L.groupDescription, `${gp}.description`),
      icon: icon(g.icon, `${gp}.icon`),
      color,
      side: oneOf(g.side, GROUP_SIDES, "auto", `${gp}.side`),
      hidden: g.hidden === true,
      items,
    });
  }

  // Connections: keep the first valid one per group, add defaults for the rest.
  const byGroup = new Map<string, EcosystemConnection>();
  const groupIds = new Set(groups.map((g) => g.id));
  const rawConnections = raw.connections === undefined ? [] : raw.connections;
  if (!Array.isArray(rawConnections)) return error("connections", "connections must be a list");
  const connectionIds = new Set<string>();
  rawConnections.forEach((x, ci) => {
    const cp = `connections[${ci}]`;
    if (!isObj(x)) return void warn(cp, "not an object; ignored");
    const source = typeof x.source === "string" ? x.source : "";
    const target = typeof x.target === "string" ? x.target : "";
    const known = (id: string) => id === centerId || groupIds.has(id);
    if (!known(source) || !known(target)) return void warn(cp, `refers to an unknown id ("${source}" → "${target}"); ignored`);
    if ((source === centerId) === (target === centerId)) return void warn(cp, "one end must be the central entity; ignored");
    const groupId = source === centerId ? target : source;
    if (byGroup.has(groupId)) return void warn(cp, `group "${groupId}" already has a connection; ignored`);
    const wanted = typeof x.id === "string" && x.id.trim() ? x.id.trim().slice(0, 64) : `c-${groupId}`;
    byGroup.set(groupId, {
      id: uniqueId(wanted, connectionIds, "c", `${cp}.id`),
      source,
      target,
      label: text(x.label, L.connectionLabel, `${cp}.label`),
      visible: x.visible !== false,
      style: oneOf(x.style, CONNECTION_STYLES, "solid", `${cp}.style`),
      direction: oneOf(x.direction, CONNECTION_DIRECTIONS, "none", `${cp}.direction`),
    });
  });
  const connections = groups.map(
    (g) =>
      byGroup.get(g.id) ?? {
        id: uniqueId(`c-${g.id}`, connectionIds, "c", "connections"),
        source: centerId,
        target: g.id,
        label: "",
        visible: true,
        style: "solid" as const,
        direction: "none" as const,
      },
  );

  return {
    data: {
      version: 1,
      title: text(raw.title, L.title, "title"),
      subtitle: text(raw.subtitle, L.subtitle, "subtitle"),
      center,
      groups,
      connections,
    },
    issues,
  };
}

/** Problems in client data (errors and corrections), without returning the data. */
export function validateEcosystem(raw: unknown, limits: EcosystemLimits = DEFAULT_ECOSYSTEM_LIMITS): EcosystemIssue[] {
  return normalizeEcosystem(raw, limits).issues;
}

/** Normalised data, or null when the data has errors (used for Local Storage). */
export function parseEcosystem(raw: unknown, limits: EcosystemLimits = DEFAULT_ECOSYSTEM_LIMITS): EcosystemMapData | null {
  return normalizeEcosystem(raw, limits).data;
}

/** The connection of a group in normalised data. */
export function connectionOf(data: EcosystemMapData, groupId: string): EcosystemConnection | undefined {
  return data.connections.find((c) => c.source === groupId || c.target === groupId);
}

/* ---------------------------------------------------------------------------
 * Appearance
 * ------------------------------------------------------------------------- */

export const ECOSYSTEM_OVERRIDE_KEYS: readonly EcosystemOverrideKey[] = [
  "background",
  "panel",
  "surface",
  "heading",
  "text",
  "accent",
  "connector",
  "centerFill",
  "groupFrom",
  "groupTo",
];

export const ECOSYSTEM_OVERRIDE_LABELS: Record<EcosystemOverrideKey, string> = {
  background: "Background",
  panel: "Map panel",
  surface: "Group cards",
  heading: "Headings",
  text: "Body text",
  accent: "Accent text",
  connector: "Connectors",
  centerFill: "Centre",
  groupFrom: "First group",
  groupTo: "Last group",
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

export const COLLAPSE_OPTIONS = [
  { value: 0, label: "Never" },
  { value: 4, label: "4" },
  { value: 6, label: "6" },
  { value: 8, label: "8" },
] as const;

export const DEFAULT_ECOSYSTEM_APPEARANCE: EcosystemAppearance = {
  version: 1,
  base: DEFAULT_PRIMARY,
  preset: "navy",
  secondary: null,
  scheme: "dark",
  overrides: {},
  typography: { scale: 1, titleWeight: 700 },
  layout: "auto",
  connector: "curved",
  cardStyle: "accent",
  radius: "soft",
  density: "comfortable",
  centerSize: "m",
  groupColoring: "uniform",
  collapseAfter: 6,
  itemDetails: "always",
  connectorArrows: false,
};

/** Completes a partial appearance (client props) with defaults; invalid values fall back. */
export function resolveAppearance(
  input: Partial<EcosystemAppearance> | undefined,
  fallback: EcosystemAppearance = DEFAULT_ECOSYSTEM_APPEARANCE,
): EcosystemAppearance {
  return parseAppearance({ ...fallback, ...input, version: 1, typography: { ...fallback.typography, ...input?.typography } }, fallback) ?? fallback;
}

/** Validates stored appearance; unknown or out-of-range values fall back to `fallback`. */
export function parseAppearance(raw: unknown, fallback: EcosystemAppearance = DEFAULT_ECOSYSTEM_APPEARANCE): EcosystemAppearance | null {
  if (!isObj(raw) || raw.version !== 1) return null;
  const base = typeof raw.base === "string" ? normalizeHex(raw.base) : null;
  if (!base) return null;
  const pick = <T extends string | number>(v: unknown, options: readonly T[], fb: T): T => (options.includes(v as T) ? (v as T) : fb);
  const overrides: EcosystemOverrides = {};
  if (isObj(raw.overrides)) {
    for (const key of ECOSYSTEM_OVERRIDE_KEYS) {
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
    layout: pick(raw.layout, ["auto", "radial", "columns", "stack"] as const, fallback.layout),
    connector: pick(raw.connector, ["curved", "elbow", "straight"] as const, fallback.connector),
    cardStyle: pick(raw.cardStyle, ["filled", "outline", "accent"] as const, fallback.cardStyle),
    radius: pick(raw.radius, ["square", "soft", "round"] as const, fallback.radius),
    density: pick(raw.density, ["compact", "comfortable", "spacious"] as const, fallback.density),
    centerSize: pick(raw.centerSize, ["s", "m", "l"] as const, fallback.centerSize),
    groupColoring: pick(raw.groupColoring, ["uniform", "ramp"] as const, fallback.groupColoring),
    collapseAfter: pick(raw.collapseAfter, COLLAPSE_OPTIONS.map((o) => o.value), fallback.collapseAfter),
    itemDetails: pick(raw.itemDetails, ["always", "selected"] as const, fallback.itemDetails),
    connectorArrows: raw.connectorArrows === true || raw.connectorArrows === false ? raw.connectorArrows : fallback.connectorArrows,
  };
}
