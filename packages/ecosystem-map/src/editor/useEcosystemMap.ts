import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadJson, newId, removeKey, saveJson } from "@agile-infographics/core";
import {
  DEFAULT_ECOSYSTEM_LIMITS,
  parseAppearance,
  parseEcosystem,
  resolveAppearance,
  type EcosystemAppearance,
  type EcosystemCenter,
  type EcosystemConnection,
  type EcosystemGroup,
  type EcosystemItem,
  type EcosystemLimits,
  type EcosystemMapData,
  type EcosystemMapInput,
  type FieldRef,
} from "../renderer";
import { DEFAULT_ECOSYSTEM } from "./default-ecosystem";

export interface RemovedGroup {
  group: EcosystemGroup;
  connection: EcosystemConnection;
  index: number;
}

export interface RemovedItem {
  groupId: string;
  item: EcosystemItem;
  index: number;
}

const allIds = (d: EcosystemMapData) => [d.center.id, ...d.groups.flatMap((g) => [g.id, ...g.items.map((i) => i.id)])];

const moveIn = <T extends { id: string }>(list: T[], id: string, delta: number) => {
  const from = list.findIndex((x) => x.id === id);
  const to = Math.max(0, Math.min(list.length - 1, from + delta));
  if (from < 0 || from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

/** Keeps `connections` in group order (one per group). */
const sortConnections = (d: EcosystemMapData): EcosystemMapData => ({
  ...d,
  connections: d.groups
    .map((g) => d.connections.find((c) => c.source === g.id || c.target === g.id))
    .filter((c): c is EcosystemConnection => Boolean(c)),
});

/**
 * Content state, validated edit actions and persistence for an Ecosystem Map.
 * Content is saved under `storageKey`; anything read back is validated.
 */
export function useEcosystemMap(
  defaults: EcosystemMapInput,
  storageKey: string,
  limits: EcosystemLimits = DEFAULT_ECOSYSTEM_LIMITS,
  onChange?: (data: EcosystemMapData) => void,
) {
  const fallback = useMemo(
    () => parseEcosystem(defaults, limits) ?? (parseEcosystem(DEFAULT_ECOSYSTEM, limits) as EcosystemMapData),
    [defaults, limits],
  );
  const [data, setData] = useState<EcosystemMapData>(() => loadJson(storageKey, (r) => parseEcosystem(r, limits), fallback));
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

  const update = useCallback((fn: (d: EcosystemMapData) => EcosystemMapData) => {
    const next = fn(ref.current);
    if (next === ref.current) return;
    ref.current = next;
    setData(next);
  }, []);

  const L = limits.maxLength;
  const mapGroup = (id: string, fn: (g: EcosystemGroup) => EcosystemGroup) =>
    update((d) => ({ ...d, groups: d.groups.map((g) => (g.id === id ? fn(g) : g)) }));
  const mapItem = (groupId: string, itemId: string, fn: (i: EcosystemItem) => EcosystemItem) =>
    mapGroup(groupId, (g) => ({ ...g, items: g.items.map((i) => (i.id === itemId ? fn(i) : i)) }));

  const actions = {
    /** Sets the value of any inline text field. */
    setField(field: FieldRef, value: string) {
      switch (field.kind) {
        case "title":
        case "subtitle":
          return update((d) => ({ ...d, [field.kind]: value.slice(0, L[field.kind]) }));
        case "centerTitle":
          return update((d) => ({ ...d, center: { ...d.center, title: value.slice(0, L.centerTitle) } }));
        case "centerSubtitle":
          return update((d) => ({ ...d, center: { ...d.center, subtitle: value.slice(0, L.centerSubtitle) } }));
        case "groupTitle":
          return mapGroup(field.groupId, (g) => ({ ...g, title: value.slice(0, L.groupTitle) }));
        case "groupDescription":
          return mapGroup(field.groupId, (g) => ({ ...g, description: value.slice(0, L.groupDescription) }));
        case "itemLabel":
          return mapItem(field.groupId, field.itemId, (i) => ({ ...i, label: value.slice(0, L.itemLabel) }));
        case "itemDescription":
          return mapItem(field.groupId, field.itemId, (i) => ({ ...i, description: value.slice(0, L.itemDescription) }));
      }
    },
    updateCenter(patch: Partial<Omit<EcosystemCenter, "id">>) {
      update((d) => ({ ...d, center: { ...d.center, ...patch } }));
    },
    updateGroup(id: string, patch: Partial<Omit<EcosystemGroup, "id" | "items">>) {
      mapGroup(id, (g) => ({ ...g, ...patch }));
    },
    /** Inserts a group after `afterId` (default: at the end). Returns its id, or null at the limit. */
    addGroup(afterId?: string | null): string | null {
      const d = ref.current;
      if (d.groups.length >= limits.maxGroups) return null;
      const taken = allIds(d);
      const id = newId("g", taken);
      const itemId = newId("i", [...taken, id]);
      const at = afterId ? d.groups.findIndex((g) => g.id === afterId) + 1 : d.groups.length;
      const index = at <= 0 ? d.groups.length : at;
      const group: EcosystemGroup = {
        id,
        title: "New group",
        description: "",
        icon: "network",
        color: null,
        side: "auto",
        hidden: false,
        items: [{ id: itemId, label: "New item", description: "", icon: null, href: "", tag: "" }],
      };
      const connection: EcosystemConnection = {
        id: newId("c", d.connections.map((c) => c.id)),
        source: d.center.id,
        target: id,
        label: "",
        visible: true,
        style: "solid",
        direction: "none",
      };
      update((cur) =>
        sortConnections({ ...cur, groups: [...cur.groups.slice(0, index), group, ...cur.groups.slice(index)], connections: [...cur.connections, connection] }),
      );
      return id;
    },
    removeGroup(id: string): RemovedGroup | null {
      const d = ref.current;
      const index = d.groups.findIndex((g) => g.id === id);
      const connection = d.connections.find((c) => c.source === id || c.target === id);
      if (index < 0 || !connection || d.groups.length <= limits.minGroups) return null;
      update((cur) => ({
        ...cur,
        groups: cur.groups.filter((g) => g.id !== id),
        connections: cur.connections.filter((c) => c !== connection),
      }));
      return { group: d.groups[index], connection, index };
    },
    restoreGroup({ group, connection, index }: RemovedGroup) {
      update((cur) =>
        cur.groups.length >= limits.maxGroups || cur.groups.some((g) => g.id === group.id)
          ? cur
          : sortConnections({ ...cur, groups: [...cur.groups.slice(0, index), group, ...cur.groups.slice(index)], connections: [...cur.connections, connection] }),
      );
    },
    moveGroup(id: string, delta: number) {
      update((cur) => {
        const groups = moveIn(cur.groups, id, delta);
        return groups === cur.groups ? cur : sortConnections({ ...cur, groups });
      });
    },
    /** Inserts an item at `at` (default: end). Returns its id, or null at the limit. */
    addItem(groupId: string, at?: number): string | null {
      const d = ref.current;
      const group = d.groups.find((g) => g.id === groupId);
      if (!group || group.items.length >= limits.maxItems) return null;
      const id = newId("i", allIds(d));
      const index = at ?? group.items.length;
      const item: EcosystemItem = { id, label: "", description: "", icon: null, href: "", tag: "" };
      mapGroup(groupId, (g) => ({ ...g, items: [...g.items.slice(0, index), item, ...g.items.slice(index)] }));
      return id;
    },
    removeItem(groupId: string, itemId: string): RemovedItem | null {
      const group = ref.current.groups.find((g) => g.id === groupId);
      const index = group ? group.items.findIndex((i) => i.id === itemId) : -1;
      if (!group || index < 0) return null;
      mapGroup(groupId, (g) => ({ ...g, items: g.items.filter((i) => i.id !== itemId) }));
      return { groupId, item: group.items[index], index };
    },
    restoreItem({ groupId, item, index }: RemovedItem) {
      mapGroup(groupId, (g) =>
        g.items.length >= limits.maxItems || g.items.some((i) => i.id === item.id)
          ? g
          : { ...g, items: [...g.items.slice(0, index), item, ...g.items.slice(index)] },
      );
    },
    moveItem(groupId: string, itemId: string, delta: number) {
      mapGroup(groupId, (g) => ({ ...g, items: moveIn(g.items, itemId, delta) }));
    },
    updateItem(groupId: string, itemId: string, patch: Partial<Omit<EcosystemItem, "id">>) {
      mapItem(groupId, itemId, (i) => ({ ...i, ...patch }));
    },
    /** Changes the connection between the centre and a group. */
    updateConnection(groupId: string, patch: Partial<Pick<EcosystemConnection, "label" | "visible" | "style" | "direction">>) {
      update((d) => ({
        ...d,
        connections: d.connections.map((c) =>
          c.source === groupId || c.target === groupId ? { ...c, ...patch, label: (patch.label ?? c.label).slice(0, L.connectionLabel) } : c,
        ),
      }));
    },
    /** Replaces all content (for example after a JSON import). The data must be normalised. */
    replace(next: EcosystemMapData) {
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
export function useEcosystemAppearance(
  defaults: Partial<EcosystemAppearance> | undefined,
  storageKey: string,
  onChange?: (appearance: EcosystemAppearance) => void,
) {
  const fallback = useMemo(() => resolveAppearance(defaults), [defaults]);
  const [appearance, setAppearance] = useState<EcosystemAppearance>(() => loadJson(storageKey, (r) => parseAppearance(r, fallback), fallback));
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const first = useRef(true);
  useEffect(() => {
    saveJson(storageKey, appearance);
    if (first.current) first.current = false;
    else changeRef.current?.(appearance);
  }, [storageKey, appearance]);

  const set = (patch: Partial<EcosystemAppearance>) => setAppearance((a) => ({ ...a, ...patch }));
  return {
    appearance,
    set,
    reset: () => {
      removeKey(storageKey);
      setAppearance(fallback);
    },
  };
}
