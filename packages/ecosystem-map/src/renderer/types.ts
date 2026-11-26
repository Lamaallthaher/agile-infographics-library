import type { ReactNode } from "react";
import type { IconKey } from "@agile-infographics/core";

/**
 * Data model of the Ecosystem & Interfaces Map.
 *
 * Plain, JSON-serialisable data: a central entity, any number of surrounding
 * groups (each with any number of items) and the connections between the
 * centre and the groups. Nothing here is tied to a business topic; all wording
 * comes from the data.
 *
 * Two shapes exist:
 * - `EcosystemMapInput`: what a client writes. Optional fields may be left out.
 * - `EcosystemMapData`: the complete form after `normalizeEcosystem()`. Every
 *   field is present. The editor stores and exports this form.
 */

/** Preferred side of the centre for a group in the wide (radial) layout. */
export type GroupSide = "auto" | "left" | "right" | "top" | "bottom";
/** Visual style of the central entity. */
export type CenterStyle = "rings" | "solid" | "outline";
export type ConnectionStyle = "solid" | "dashed" | "dotted";
/**
 * Arrowheads, relative to the connection's `source` → `target`:
 * "forward" points at the target, "backward" at the source.
 */
export type ConnectionDirection = "none" | "forward" | "backward" | "both";

export interface EcosystemItemInput {
  id: string;
  label: string;
  description?: string;
  icon?: IconKey | null;
  /** Optional link: http(s), mailto, an absolute path or a #fragment. Other values are dropped. */
  href?: string;
  /** Optional short metadata shown as a tag (for example an owner, a cadence or a status). */
  tag?: string;
}

export interface EcosystemGroupInput {
  id: string;
  title: string;
  description?: string;
  icon?: IconKey | null;
  /** Custom colour (#rrggbb). Omitted or null = the theme's group colour. */
  color?: string | null;
  /** Preferred side in the wide layout (default "auto": placed clockwise and balanced). */
  side?: GroupSide;
  /** Hidden groups are not shown in display mode (the editor still lists them). */
  hidden?: boolean;
  items?: EcosystemItemInput[];
}

export interface EcosystemCenterInput {
  /** Defaults to "center". Connections refer to the centre by this id. */
  id?: string;
  title: string;
  subtitle?: string;
  icon?: IconKey | null;
  style?: CenterStyle;
}

export interface EcosystemConnectionInput {
  /** Defaults to `c-<group id>`. */
  id?: string;
  /** The centre's id or a group id. One end must be the centre. */
  source: string;
  target: string;
  label?: string;
  /** Default true. */
  visible?: boolean;
  style?: ConnectionStyle;
  direction?: ConnectionDirection;
}

export interface EcosystemMapInput {
  version?: 1;
  title?: string;
  subtitle?: string;
  center: EcosystemCenterInput;
  groups: EcosystemGroupInput[];
  /**
   * Connections between the centre and groups. A group without an entry gets a
   * default connection (visible, solid, no arrowheads). Set `visible: false`
   * to hide one.
   */
  connections?: EcosystemConnectionInput[];
}

/** Complete forms (every field present), produced by `normalizeEcosystem()`. */
export type EcosystemItem = Required<EcosystemItemInput>;
export type EcosystemGroup = Required<Omit<EcosystemGroupInput, "items">> & { items: EcosystemItem[] };
export type EcosystemCenter = Required<EcosystemCenterInput>;
export type EcosystemConnection = Required<EcosystemConnectionInput>;

export interface EcosystemMapData {
  version: 1;
  title: string;
  subtitle: string;
  center: EcosystemCenter;
  groups: EcosystemGroup[];
  /** Exactly one connection per group, in group order. */
  connections: EcosystemConnection[];
}

/** Item counts and field lengths. */
export interface EcosystemLimits {
  minGroups: number;
  maxGroups: number;
  maxItems: number;
  maxLength: {
    title: number;
    subtitle: number;
    centerTitle: number;
    centerSubtitle: number;
    groupTitle: number;
    groupDescription: number;
    itemLabel: number;
    itemDescription: number;
    itemTag: number;
    itemHref: number;
    connectionLabel: number;
  };
}

/* ---------------------------------------------------------------------------
 * Appearance (look and layout), kept separate from the content.
 * ------------------------------------------------------------------------- */

export type ColorScheme = "dark" | "light";
/** "auto" picks radial / columns / stack from the available width. */
export type LayoutPreference = "auto" | "radial" | "columns" | "stack";
export type ConnectorShape = "curved" | "elbow" | "straight";
export type CardStyle = "filled" | "outline" | "accent";
export type CornerRadius = "square" | "soft" | "round";
export type Density = "compact" | "comfortable" | "spacious";
export type CenterSize = "s" | "m" | "l";
/** "uniform": every group uses one colour; "ramp": progressive shades from the first to the last group colour. */
export type GroupColoring = "uniform" | "ramp";
/** When item descriptions are shown: always, or only for the selected group. */
export type ItemDetails = "always" | "selected";

/** Colours a user may override individually. */
export type EcosystemOverrideKey =
  | "background"
  | "panel"
  | "surface"
  | "heading"
  | "text"
  | "accent"
  | "connector"
  | "centerFill"
  | "groupFrom"
  | "groupTo";
export type EcosystemOverrides = Partial<Record<EcosystemOverrideKey, string>>;

export interface EcosystemAppearance {
  version: 1;
  /** Primary colour (#rrggbb); the palette is generated from it. */
  base: string;
  /** Preset id when `base` came from a preset; null for a custom colour. */
  preset: string | null;
  /** Secondary colour (#rrggbb) for accents and connectors; null = derived from the primary. */
  secondary: string | null;
  scheme: ColorScheme;
  overrides: EcosystemOverrides;
  typography: { scale: number; titleWeight: number };
  layout: LayoutPreference;
  connector: ConnectorShape;
  cardStyle: CardStyle;
  radius: CornerRadius;
  density: Density;
  centerSize: CenterSize;
  groupColoring: GroupColoring;
  /** Groups with more items show the first N and a "Show all" toggle. 0 = never collapse. */
  collapseAfter: number;
  itemDetails: ItemDetails;
}

/** All colours used by the component; every field becomes an --em-* CSS variable. */
export interface EcosystemTheme {
  /** Area behind the infographic, also behind the main heading. */
  background: string;
  headingOnBackground: string;
  subtitleOnBackground: string;
  /** Rounded panel holding the map. */
  panel: string;
  panelBorder: string;
  /** Group cards. */
  surface: string;
  surfaceBorder: string;
  heading: string;
  text: string;
  textMuted: string;
  /** Accent text (tags, links, counters). */
  accent: string;
  /** Subtle fill behind items. */
  itemFill: string;
  connector: string;
  /** Connector of the hovered or selected group. */
  connectorActive: string;
  centerFill: string;
  centerRing: string;
  /** Segments of the ring around the centre (the selected group's segment uses connectorActive). */
  ringSegment: string;
  centerText: string;
  centerSubtitle: string;
  /** Group colours run from groupFrom to groupTo (or all groupFrom when uniform). */
  groupFrom: string;
  groupTo: string;
  labelFill: string;
  labelText: string;
  focus: string;
  fontFamily: string;
}

/* ---------------------------------------------------------------------------
 * Render slots (editing). Without slots the map is read-only.
 * ------------------------------------------------------------------------- */

/** Identifies an editable text field. */
export type FieldRef =
  | { kind: "title" | "subtitle" | "centerTitle" | "centerSubtitle" }
  | { kind: "groupTitle" | "groupDescription"; groupId: string }
  | { kind: "itemLabel" | "itemDescription"; groupId: string; itemId: string };

export interface TextSlotProps {
  field: FieldRef;
  value: string;
  className: string;
  /** Element used by the default (read-only) renderer. */
  as: "h2" | "h3" | "p" | "span" | "div";
  placeholder: string;
  multiline?: boolean;
}

export interface EcosystemSlots {
  Text?: (props: TextSlotProps) => ReactNode;
  /** Replaces the centre icon (for example with an icon picker). */
  centerIcon?: (icon: ReactNode) => ReactNode;
  /** Replaces a group's icon badge. */
  groupBadge?: (group: EcosystemGroup, index: number, badge: ReactNode) => ReactNode;
  /** Extra controls on a group card (move, delete…). */
  groupToolbar?: (group: EcosystemGroup, index: number) => ReactNode;
  /** Content after a group's items (for example "Add item"). */
  groupFooter?: (group: EcosystemGroup, index: number) => ReactNode;
  /** Extra controls on an item. */
  itemToolbar?: (group: EcosystemGroup, item: EcosystemItem, index: number) => ReactNode;
}
