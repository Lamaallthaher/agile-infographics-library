import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadJson, newId, removeKey, saveJson } from "@agile-infographics/core";
import {
  DEFAULT_PROCESS_LIMITS,
  findNode,
  parseAppearance,
  parseProcessArchitecture,
  resolveAppearance,
  type Activity,
  type FieldRef,
  type GroupCategory,
  type NodeData,
  type Process,
  type ProcessAppearance,
  type ProcessArchitectureData,
  type ProcessArchitectureInput,
  type ProcessArchitectureLimits,
  type ProcessGroup,
  type ProcessLevel,
  type ValueChain,
} from "../renderer";
import { DEFAULT_PROCESS_ARCHITECTURE } from "./default-process";

/** A deleted node, with what is needed to put it back exactly where it was. */
export interface RemovedNode {
  level: ProcessLevel;
  parentId: string | null;
  node: ValueChain | ProcessGroup | Process | Activity;
  index: number;
}

/** Editable fields shared by every level (structure is changed with the add/move/remove actions). */
export type NodePatch = Partial<Pick<NodeData, "title" | "description" | "owner" | "status" | "tags" | "code" | "href">> &
  Partial<Pick<ProcessGroup, "category" | "icon" | "color">>;

type AnyNode = ValueChain | ProcessGroup | Process | Activity;

const allIds = (d: ProcessArchitectureData) =>
  d.valueChains.flatMap((c) => [c.id, ...c.groups.flatMap((g) => [g.id, ...g.processes.flatMap((p) => [p.id, ...p.activities.map((a) => a.id)])])]);

const blank = (id: string, title: string): NodeData => ({ id, title, description: "", owner: "", status: "", tags: [], code: "", href: "" });

/** Applies `fn` to the child list of `parentId` at `level` (level 0: the value chains). */
function mapChildren(d: ProcessArchitectureData, level: ProcessLevel, parentId: string | null, fn: (list: AnyNode[]) => AnyNode[]): ProcessArchitectureData {
  if (level === 0) return { ...d, valueChains: fn(d.valueChains) as ValueChain[] };
  return {
    ...d,
    valueChains: d.valueChains.map((c) => {
      if (level === 1) return c.id === parentId ? { ...c, groups: fn(c.groups) as ProcessGroup[] } : c;
      return {
        ...c,
        groups: c.groups.map((g) => {
          if (level === 2) return g.id === parentId ? { ...g, processes: fn(g.processes) as Process[] } : g;
          return { ...g, processes: g.processes.map((p) => (p.id === parentId ? { ...p, activities: fn(p.activities) as Activity[] } : p)) };
        }),
      };
    }),
  };
}

function childrenOf(d: ProcessArchitectureData, level: ProcessLevel, parentId: string | null): AnyNode[] {
  if (level === 0) return d.valueChains;
  const parent = parentId ? findNode(d, parentId)?.node : null;
  if (!parent) return [];
  if (level === 1) return (parent as ValueChain).groups ?? [];
  if (level === 2) return (parent as ProcessGroup).processes ?? [];
  return (parent as Process).activities ?? [];
}

function parentIdOf(d: ProcessArchitectureData, id: string): { level: ProcessLevel; parentId: string | null } | null {
  const found = findNode(d, id);
  if (!found) return null;
  const p = found.path;
  const parentId = found.level === 0 ? null : found.level === 1 ? p.valueChainId : found.level === 2 ? p.groupId : p.processId;
  return { level: found.level, parentId };
}

/**
 * Content state, validated edit actions and persistence for a Process
 * Architecture Map. Content is saved under `storageKey`; anything read back
 * is validated with `parseProcessArchitecture`.
 */
export function useProcessArchitecture(
  defaults: ProcessArchitectureInput,
  storageKey: string,
  limits: ProcessArchitectureLimits = DEFAULT_PROCESS_LIMITS,
  onChange?: (data: ProcessArchitectureData) => void,
) {
  const fallback = useMemo(
    () => parseProcessArchitecture(defaults, limits) ?? (parseProcessArchitecture(DEFAULT_PROCESS_ARCHITECTURE, limits) as ProcessArchitectureData),
    [defaults, limits],
  );
  const [data, setData] = useState<ProcessArchitectureData>(() => loadJson(storageKey, (r) => parseProcessArchitecture(r, limits), fallback));
  const [saved, setSaved] = useState(true);
  const ref = useRef(data);
  ref.current = data;
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const first = useRef(true);

  useEffect(() => {
    setSaved(saveJson(storageKey, data));
    if (first.current) first.current = false;
    else changeRef.current?.(data);
  }, [storageKey, data]);

  const update = useCallback((fn: (d: ProcessArchitectureData) => ProcessArchitectureData) => {
    const next = fn(ref.current);
    if (next === ref.current) return;
    ref.current = next;
    setData(next);
  }, []);

  const L = limits.maxLength;
  const maxFor = (level: ProcessLevel) => [limits.maxValueChains, limits.maxGroups, limits.maxProcesses, limits.maxActivities][level];

  const patchNode = (id: string, patch: NodePatch) =>
    update((d) => {
      const at = parentIdOf(d, id);
      if (!at) return d;
      return mapChildren(d, at.level, at.parentId, (list) => list.map((n) => (n.id === id ? ({ ...n, ...patch } as AnyNode) : n)));
    });

  const actions = {
    /** Sets the value of any inline text field. */
    setField(field: FieldRef, value: string) {
      if ("id" in field) return patchNode(field.id, field.kind === "nodeTitle" ? { title: value.slice(0, L.nodeTitle) } : { description: value.slice(0, L.description) });
      if ("levelIndex" in field) {
        const key = field.kind === "levelLabel" ? "label" : field.kind === "levelName" ? "name" : "description";
        const max = field.kind === "levelLabel" ? L.levelLabel : field.kind === "levelName" ? L.levelName : L.levelDescription;
        return update((d) => ({ ...d, levels: d.levels.map((lv, i) => (i === field.levelIndex ? { ...lv, [key]: value.slice(0, max) } : lv)) }));
      }
      if ("scopeIndex" in field) {
        const key = field.kind === "scopeTitle" ? "title" : "description";
        const max = field.kind === "scopeTitle" ? L.scopeTitle : L.scopeDescription;
        return update((d) => ({ ...d, scopes: d.scopes.map((sc, i) => (i === field.scopeIndex ? { ...sc, [key]: value.slice(0, max) } : sc)) }));
      }
      return update((d) => ({ ...d, [field.kind]: value.slice(0, L[field.kind]) }));
    },
    /** Updates structured fields (owner, status, tags, code, link; category, icon and colour for groups). */
    updateNode(id: string, patch: NodePatch) {
      const clean: NodePatch = { ...patch };
      if (clean.owner !== undefined) clean.owner = clean.owner.slice(0, L.owner);
      if (clean.code !== undefined) clean.code = clean.code.slice(0, L.code);
      if (clean.href !== undefined) clean.href = clean.href.slice(0, L.href);
      if (clean.tags !== undefined) clean.tags = clean.tags.map((t) => t.trim().slice(0, L.tag)).filter(Boolean).slice(0, limits.maxTags);
      patchNode(id, clean);
    },
    /**
     * Adds a node at `level` under `parentId` (null for value chains), after
     * `afterId` or at the end. Groups get `category`. Returns the new id, or
     * null at the limit.
     */
    addNode(level: ProcessLevel, parentId: string | null, afterId?: string | null, category: GroupCategory = "core"): string | null {
      const d = ref.current;
      const list = childrenOf(d, level, parentId);
      if ((level > 0 && !parentId) || list.length >= maxFor(level)) return null;
      const id = newId(["vc", "pg", "pr", "ac"][level], allIds(d));
      const title = ["New value chain", "New process group", "New process", "New activity"][level];
      const node: AnyNode =
        level === 0
          ? { ...blank(id, title), groups: [] }
          : level === 1
            ? { ...blank(id, title), category, icon: null, color: null, processes: [] }
            : level === 2
              ? { ...blank(id, title), activities: [] }
              : blank(id, title);
      update((cur) =>
        mapChildren(cur, level, parentId, (items) => {
          const at = afterId ? items.findIndex((x) => x.id === afterId) + 1 : items.length;
          const index = at <= 0 ? items.length : at;
          return [...items.slice(0, index), node, ...items.slice(index)];
        }),
      );
      return id;
    },
    removeNode(id: string): RemovedNode | null {
      const d = ref.current;
      const at = parentIdOf(d, id);
      if (!at) return null;
      const list = childrenOf(d, at.level, at.parentId);
      if (at.level === 0 && list.length <= limits.minValueChains) return null;
      const index = list.findIndex((x) => x.id === id);
      update((cur) => mapChildren(cur, at.level, at.parentId, (items) => items.filter((x) => x.id !== id)));
      return { level: at.level, parentId: at.parentId, node: list[index], index };
    },
    restoreNode({ level, parentId, node, index }: RemovedNode) {
      update((cur) => {
        if (level > 0 && !findNode(cur, parentId!)) return cur;
        if (childrenOf(cur, level, parentId).length >= maxFor(level) || findNode(cur, node.id)) return cur;
        return mapChildren(cur, level, parentId, (items) => [...items.slice(0, index), node, ...items.slice(index)]);
      });
    },
    /**
     * Moves a node among its siblings. Groups move among groups of the same
     * category, because each category is shown as its own row.
     */
    moveNode(id: string, delta: number) {
      update((cur) => {
        const at = parentIdOf(cur, id);
        if (!at) return cur;
        return mapChildren(cur, at.level, at.parentId, (items) => {
          const from = items.findIndex((x) => x.id === id);
          const moving = items[from];
          const peers = items
            .map((x, i) => ({ x, i }))
            .filter(({ x }) => at.level !== 1 || (x as ProcessGroup).category === (moving as ProcessGroup).category);
          const k = peers.findIndex((p) => p.i === from);
          const target = peers[k + delta];
          if (!target) return items;
          const next = [...items];
          next[from] = target.x;
          next[target.i] = moving;
          return next;
        });
      });
    },
    replace(next: ProcessArchitectureData) {
      update(() => next);
    },
    reset() {
      removeKey(storageKey);
      update(() => fallback);
    },
  };

  return { data, saved, limits, actions };
}

/** Appearance (theme, typography, layout), persisted under its own key. */
export function useProcessAppearance(
  defaults: Partial<ProcessAppearance> | undefined,
  storageKey: string,
  onChange?: (appearance: ProcessAppearance) => void,
) {
  const fallback = useMemo(() => resolveAppearance(defaults), [defaults]);
  const [appearance, setAppearance] = useState<ProcessAppearance>(() => loadJson(storageKey, (r) => parseAppearance(r, fallback), fallback));
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const first = useRef(true);
  useEffect(() => {
    saveJson(storageKey, appearance);
    if (first.current) first.current = false;
    else changeRef.current?.(appearance);
  }, [storageKey, appearance]);

  return {
    appearance,
    set: (patch: Partial<ProcessAppearance>) => setAppearance((a) => ({ ...a, ...patch })),
    reset: () => {
      removeKey(storageKey);
      setAppearance(fallback);
    },
  };
}
